import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import bcrypt from 'bcryptjs';
import { roleMiddleware, AuthenticatedRequest } from '@/lib/middleware';
import { generateUserId, generateRandomPassword, validateEmail } from '@/lib/utils';
import { sendInviteEmail } from '@/lib/email';

// Get all users
async function handleGet(req: AuthenticatedRequest) {
  try {
    await connectDB();

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

    return NextResponse.json(
      {
        success: true,
        user: userResponse,
        generatedPassword: password, // Include password so admin can share it
        emailSent,
        emailError: emailError || null,
        message: emailSent 
          ? 'User created and invitation email sent successfully' 
          : 'User created successfully. Please share the password manually as email could not be sent.',
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

export const GET = roleMiddleware(['superadmin', 'admin'], handleGet);
export const POST = roleMiddleware(['superadmin', 'admin'], handlePost);

