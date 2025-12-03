import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import { roleMiddleware, AuthenticatedRequest } from '@/lib/middleware';

// Get all trainees
async function handleGet(req: AuthenticatedRequest) {
  try {
    await connectDB();

    const trainees = await User.find({ role: 'trainee' })
      .select('userId firstName lastName email status')
      .sort({ firstName: 1, lastName: 1 });

    return NextResponse.json(
      {
        success: true,
        trainees,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Get trainees error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const GET = roleMiddleware(['superadmin', 'admin'], handleGet);

