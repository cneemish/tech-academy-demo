import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import TrainingPlan from '@/models/TrainingPlan';
import User from '@/models/User';
import { roleMiddleware, AuthenticatedRequest } from '@/lib/middleware';
import { generateUserId } from '@/lib/utils';

// Get all training plans
async function handleGet(req: AuthenticatedRequest) {
  try {
    await connectDB();

    const trainingPlans = await TrainingPlan.find({})
      .sort({ createdAt: -1 })
      .populate('traineeId', 'firstName lastName email')
      .lean();

    return NextResponse.json(
      {
        success: true,
        trainingPlans,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Get training plans error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Create a new training plan
async function handlePost(req: AuthenticatedRequest) {
  try {
    await connectDB();

    const { planName, description, traineeId, modules } = await req.json();

    // Validation
    if (!planName || !traineeId || !modules || !Array.isArray(modules) || modules.length === 0) {
      return NextResponse.json(
        { error: 'Plan name, trainee, and at least one module are required' },
        { status: 400 }
      );
    }

    // Verify trainee exists
    const trainee = await User.findOne({ userId: traineeId, role: 'trainee' });
    if (!trainee) {
      return NextResponse.json(
        { error: 'Trainee not found' },
        { status: 404 }
      );
    }

    // Validate modules
    for (const moduleItem of modules) {
      if (!moduleItem.moduleName || !moduleItem.startDate || !moduleItem.endDate) {
        return NextResponse.json(
          { error: 'Each module must have a name, start date, and end date' },
          { status: 400 }
        );
      }

      if (new Date(moduleItem.startDate) >= new Date(moduleItem.endDate)) {
        return NextResponse.json(
          { error: 'End date must be after start date for each module' },
          { status: 400 }
        );
      }
    }

    // Generate unique plan ID
    const planId = `plan-${generateUserId()}`;

    // Create training plan
    const trainingPlan = new TrainingPlan({
      planId,
      planName,
      description,
      traineeId,
      traineeEmail: trainee.email,
      modules: modules.map((m: any, index: number) => ({
        moduleUid: m.moduleUid || '',
        moduleName: m.moduleName || `Module ${index + 1}`,
        trainerName: m.trainerName || '',
        startDate: new Date(m.startDate),
        endDate: new Date(m.endDate),
        status: 'pending',
      })),
      status: 'draft',
      createdBy: req.user?.userId || '',
    });

    await trainingPlan.save();

    return NextResponse.json(
      {
        success: true,
        trainingPlan,
        message: 'Training plan created successfully',
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Create training plan error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const GET = roleMiddleware(['superadmin', 'admin'], handleGet);
export const POST = roleMiddleware(['superadmin', 'admin'], handlePost);

