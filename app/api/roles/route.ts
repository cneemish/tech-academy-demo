import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Role from '@/models/Role';

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const roles = await Role.find({}).select('roleId roleName description');

    return NextResponse.json(
      {
        success: true,
        roles: roles.length > 0 ? roles : [
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
        ],
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Get roles error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

