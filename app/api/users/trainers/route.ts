import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import { roleMiddleware, AuthenticatedRequest } from '@/lib/middleware';

// Get all trainers (users with role admin or superadmin)
async function handleGet(req: AuthenticatedRequest) {
  try {
    await connectDB();

    const trainers = await User.find({ 
      role: { $in: ['admin', 'superadmin'] } 
    })
      .select('userId firstName lastName email')
      .sort({ firstName: 1, lastName: 1 });

    return NextResponse.json(
      {
        success: true,
        trainers,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Get trainers error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const GET = roleMiddleware(['superadmin', 'admin'], handleGet);

