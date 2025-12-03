import connectDB from '../lib/mongodb';
import User from '../models/User';
import Role from '../models/Role';
import bcrypt from 'bcryptjs';

async function initializeDatabase() {
  try {
    await connectDB();
    console.log('Connected to MongoDB');

    // Initialize Roles
    const roles = [
      {
        roleId: 'superadmin',
        roleName: 'superadmin',
        description: 'Super Admin - Full system access',
      },
      {
        roleId: 'admin',
        roleName: 'admin',
        description: 'Admin - Can invite users and create training plans',
      },
      {
        roleId: 'trainee',
        roleName: 'trainee',
        description: 'Trainee - Can participate in training',
      },
    ];

    for (const roleData of roles) {
      const existingRole = await Role.findOne({ roleId: roleData.roleId });
      if (!existingRole) {
        await Role.create(roleData);
        console.log(`Created role: ${roleData.roleName}`);
      } else {
        console.log(`Role already exists: ${roleData.roleName}`);
      }
    }

    // Initialize Super Admin User
    // NOTE: Update these credentials after first login
    const superAdminEmail = 'superadmin@techacademy.com';
    const superAdminPassword = 'SuperAdmin123!';

    const existingSuperAdmin = await User.findOne({ email: superAdminEmail });
    if (!existingSuperAdmin) {
      const hashedPassword = await bcrypt.hash(superAdminPassword, 10);
      const superAdmin = await User.create({
        userId: `superadmin-${Date.now()}`,
        firstName: 'Super',
        lastName: 'Admin',
        email: superAdminEmail,
        password: hashedPassword,
        role: 'superadmin',
        status: 'accepted',
      });
      console.log('Super Admin created:');
      console.log(`Email: ${superAdminEmail}`);
      console.log(`Password: ${superAdminPassword}`);
      console.log('⚠️  Please change the password after first login!');
    } else {
      console.log('Super Admin already exists');
    }

    console.log('Database initialization complete!');
    process.exit(0);
  } catch (error) {
    console.error('Error initializing database:', error);
    process.exit(1);
  }
}

initializeDatabase();

