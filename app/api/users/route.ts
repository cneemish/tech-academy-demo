import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import bcrypt from 'bcryptjs';
import { roleMiddleware, AuthenticatedRequest } from '@/lib/middleware';
import { generateUserId, generateRandomPassword, validateEmail } from '@/lib/utils';
import { sendInviteEmail } from '@/lib/email';
import {
  createStack,
  getAllRoles,
  findAdminRole,
  shareStack,
} from '@/lib/contentstack-management';

// Get all users
async function handleGet(req: AuthenticatedRequest) {
  try {
    await connectDB();

    // Find users with lastLoginAt but status is still 'pending' and update them
    const usersToUpdate = await User.find({
      lastLoginAt: { $exists: true, $ne: null },
      status: 'pending',
    });

    // Update status to 'accepted' for users who have logged in
    if (usersToUpdate.length > 0) {
      await User.updateMany(
        {
          lastLoginAt: { $exists: true, $ne: null },
          status: 'pending',
        },
        {
          $set: { status: 'accepted' },
        }
      );
      console.log(`Updated ${usersToUpdate.length} user(s) status from pending to accepted`);
    }

    const users = await User.find({})
      .select('-password')
      .sort({ createdAt: -1 });

    return NextResponse.json(
      {
        success: true,
        users,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Get users error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Create a new user
async function handlePost(req: AuthenticatedRequest) {
  try {
    await connectDB();

    const { firstName, lastName, email, role } = await req.json();

    // Validation
    if (!firstName || !lastName || !email || !role) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    if (!validateEmail(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    if (!['superadmin', 'admin', 'trainee'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      );
    }

    // Generate unique user ID and password
    const userId = generateUserId();
    const password = generateRandomPassword();
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = new User({
      userId,
      firstName,
      lastName,
      email: email.toLowerCase(),
      password: hashedPassword,
      role,
      status: 'pending',
      invitedBy: req.user?.userId,
      invitedAt: new Date(),
    });

    await user.save();

    // For trainees, create Contentstack stack and share it
    let stackCreated = false;
    let stackShared = false;
    let stackError = null;
    let stackUid = null;
    let stackApiKey = null;

    if (role === 'trainee') {
      try {
        const orgUid = process.env.CONTENTSTACK_ORG_UID;
        const authToken = process.env.CONTENTSTACK_AUTH_TOKEN;

        if (!orgUid || !authToken) {
          console.warn('Contentstack org UID or auth token not configured. Skipping stack creation.');
          stackError = 'Contentstack credentials not configured';
        } else {
          // Create stack with name "firstname + playground"
          const stackName = `${firstName} playground`;
          console.log(`Creating Contentstack stack: ${stackName} for trainee ${email}`);
          
          // Wait for stack creation response
          const createStackResponse = await createStack(stackName, orgUid, authToken);
          
          // Extract stack UID from response
          stackUid = createStackResponse.stack.uid;
          stackApiKey = createStackResponse.stack.api_key;
          stackCreated = true;
          console.log(`Stack created successfully. Stack UID: ${stackUid}, API Key: ${stackApiKey}`);
          
          // Wait a moment for stack to be fully initialized
          await new Promise(resolve => setTimeout(resolve, 1000));

          // Try to get roles and share stack
          console.log(`Attempting to share stack ${stackUid} with ${email}...`);
          try {
            // First, try to get roles from organization
            const roles = await getAllRoles(stackUid, stackApiKey, authToken, orgUid);
            
            if (roles.length > 0) {
              const adminRole = findAdminRole(roles);
              
              if (adminRole) {
                console.log(`Found Admin role: ${adminRole.name} (${adminRole.uid})`);
                // Share stack with trainee email and assign Admin role
                await shareStack(stackUid, stackApiKey, [email], [adminRole.uid], authToken);
                stackShared = true;
                console.log(`Stack shared successfully with ${email} and Admin role`);
              } else {
                // Try sharing with first available role
                console.log(`Admin role not found. Trying with first available role: ${roles[0].name}`);
                await shareStack(stackUid, stackApiKey, [email], [roles[0].uid], authToken);
                stackShared = true;
                console.log(`Stack shared successfully with ${email} and ${roles[0].name} role`);
              }
            } else {
              // If no roles found, try sharing without roles (may fail, but worth trying)
              console.warn('No roles found. Attempting to share stack without role assignment...');
              try {
                await shareStack(stackUid, stackApiKey, [email], [], authToken);
                stackShared = true;
                console.log(`Stack shared successfully with ${email} (without role)`);
              } catch (noRoleError: any) {
                console.warn(`Sharing without roles failed: ${noRoleError.message}`);
                stackError = `Stack created but sharing failed: ${noRoleError.message}`;
              }
            }
          } catch (shareError: any) {
            console.error(`Failed to share stack: ${shareError.message}`);
            stackError = shareError.message;
          }
        }
      } catch (error: any) {
        console.error('Failed to create/share Contentstack stack:', error);
        stackError = error.message;
        // Continue even if stack creation fails - user is still created
      }
    }

    // Send invitation email
    let emailSent = false;
    let emailError = null;
    try {
      await sendInviteEmail(email, firstName, password);
      emailSent = true;
    } catch (error: any) {
      console.error('Failed to send email:', error);
      emailError = error.message;
      // Continue even if email fails - user is still created
    }

    // Return user without password, but include the generated password in response
    // so admin can share it manually if email fails
    const userResponse = user.toObject();
    delete userResponse.password;

    // Build success message
    let message = 'User created successfully';
    if (role === 'trainee') {
      if (stackCreated && stackShared) {
        message = 'User created, Contentstack stack created and shared successfully';
      } else if (stackCreated && !stackShared) {
        message = 'User created and stack created, but sharing failed. Please share manually.';
      } else if (!stackCreated) {
        message = 'User created, but Contentstack stack creation failed. Please create manually.';
      }
    }
    
    if (emailSent) {
      message += ' and invitation email sent';
    } else {
      message += '. Please share the password manually as email could not be sent.';
    }

    return NextResponse.json(
      {
        success: true,
        user: userResponse,
        generatedPassword: password, // Include password so admin can share it
        emailSent,
        emailError: emailError || null,
        stackCreated: role === 'trainee' ? stackCreated : null,
        stackShared: role === 'trainee' ? stackShared : null,
        stackUid: role === 'trainee' ? stackUid : null,
        stackApiKey: role === 'trainee' ? stackApiKey : null,
        stackError: role === 'trainee' ? stackError : null,
        message,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Create user error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Delete a user (only superadmin)
async function handleDelete(req: AuthenticatedRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const email = searchParams.get('email'); // Alternative: delete by email

    // Validate input - require either userId or email
    if (!userId && !email) {
      return NextResponse.json(
        { 
          success: false,
          error: 'User ID or email is required',
          errorCode: 'MISSING_PARAMETER'
        },
        { status: 400 }
      );
    }

    // Prevent deleting yourself
    if (req.user?.userId === userId) {
      return NextResponse.json(
        { 
          success: false,
          error: 'You cannot delete your own account',
          errorCode: 'SELF_DELETE_NOT_ALLOWED'
        },
        { status: 400 }
      );
    }

    // Build query - try userId first, then email
    const query: any = {};
    if (userId) {
      query.userId = userId;
    } else if (email) {
      query.email = email.toLowerCase();
    }

    // Check if user exists before attempting delete
    const existingUser = await User.findOne(query);
    if (!existingUser) {
      const errorMessage = userId 
        ? `User not found with ID: ${userId}`
        : email 
        ? `User not found with email: ${email}`
        : 'User not found';
      
      return NextResponse.json(
        { 
          success: false,
          error: errorMessage,
          errorCode: 'USER_NOT_FOUND'
        },
        { status: 404 }
      );
    }

    // Prevent deleting yourself (double-check with email)
    if (req.user?.email && existingUser.email.toLowerCase() === req.user.email.toLowerCase()) {
      return NextResponse.json(
        { 
          success: false,
          error: 'You cannot delete your own account',
          errorCode: 'SELF_DELETE_NOT_ALLOWED'
        },
        { status: 400 }
      );
    }

    // Attempt to delete user
    const deletedUser = await User.findOneAndDelete(query);

    if (!deletedUser) {
      // This shouldn't happen if we found the user above, but handle it anyway
      return NextResponse.json(
        { 
          success: false,
          error: 'Failed to delete user. User may have been deleted by another process.',
          errorCode: 'DELETE_FAILED'
        },
        { status: 409 } // Conflict status
      );
    }

    // Success response
    return NextResponse.json(
      {
        success: true,
        message: 'User deleted successfully',
        deletedUser: {
          userId: deletedUser.userId,
          email: deletedUser.email,
          firstName: deletedUser.firstName,
          lastName: deletedUser.lastName,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Delete user error:', error);
    
    // Handle specific MongoDB errors
    if (error.name === 'MongoError' || error.name === 'MongoServerError') {
      if (error.code === 11000) {
        return NextResponse.json(
          { 
            success: false,
            error: 'Duplicate key error. User may already exist with this identifier.',
            errorCode: 'DUPLICATE_KEY',
            details: error.message
          },
          { status: 409 }
        );
      }
    }

    // Handle validation errors
    if (error.name === 'ValidationError') {
      return NextResponse.json(
        { 
          success: false,
          error: 'Validation error',
          errorCode: 'VALIDATION_ERROR',
          details: error.message
        },
        { status: 400 }
      );
    }

    // Generic error response
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error while deleting user',
        errorCode: 'INTERNAL_ERROR',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

export const GET = roleMiddleware(['superadmin', 'admin'], handleGet);
export const POST = roleMiddleware(['superadmin', 'admin'], handlePost);
export const DELETE = roleMiddleware(['superadmin'], handleDelete);

