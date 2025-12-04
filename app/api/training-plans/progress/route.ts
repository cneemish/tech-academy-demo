import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import TrainingPlan from '@/models/TrainingPlan';
import User from '@/models/User';
import { roleMiddleware, AuthenticatedRequest } from '@/lib/middleware';

// Get trainee progress
async function handleGet(req: AuthenticatedRequest) {
  try {
    await connectDB();

    const user = req.user;
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // If user is trainee, get their own progress
    if (user.role === 'trainee') {
      const trainingPlans = await TrainingPlan.find({ traineeId: user.userId })
        .sort({ createdAt: -1 })
        .lean();

      // Calculate progress for each plan
      const progressData = trainingPlans.map((plan: any) => {
        const totalModules = plan.modules?.length || 0;
        const completedModules = plan.modules?.filter((m: any) => m.status === 'completed').length || 0;
        const inProgressModules = plan.modules?.filter((m: any) => m.status === 'in-progress').length || 0;
        const pendingModules = plan.modules?.filter((m: any) => m.status === 'pending').length || 0;
        const progressPercentage = totalModules > 0 ? Math.round((completedModules / totalModules) * 100) : 0;

        return {
          planId: plan.planId,
          planName: plan.planName,
          description: plan.description,
          status: plan.status,
          totalModules,
          completedModules,
          inProgressModules,
          pendingModules,
          progressPercentage,
          startDate: plan.modules?.[0]?.startDate || plan.createdAt,
          endDate: plan.modules?.[plan.modules.length - 1]?.endDate || null,
          modules: plan.modules || [],
        };
      });

      return NextResponse.json(
        {
          success: true,
          progress: progressData,
          userRole: 'trainee',
        },
        { status: 200 }
      );
    }

    // If user is admin/superadmin, get all trainees' progress summary
    if (user.role === 'admin' || user.role === 'superadmin') {
      const allPlans = await TrainingPlan.find({})
        .sort({ createdAt: -1 })
        .lean();

      // Get all unique trainees
      const traineeIds = Array.from(new Set(allPlans.map((plan: any) => plan.traineeId)));
      
      // Get trainee details
      const trainees = await User.find({ userId: { $in: traineeIds }, role: 'trainee' })
        .select('userId firstName lastName email')
        .lean();

      // Calculate progress for each trainee
      const traineeProgress = trainees.map((trainee: any) => {
        const traineePlans = allPlans.filter((plan: any) => plan.traineeId === trainee.userId);
        
        let totalModules = 0;
        let completedModules = 0;
        let inProgressModules = 0;
        let pendingModules = 0;

        traineePlans.forEach((plan: any) => {
          totalModules += plan.modules?.length || 0;
          completedModules += plan.modules?.filter((m: any) => m.status === 'completed').length || 0;
          inProgressModules += plan.modules?.filter((m: any) => m.status === 'in-progress').length || 0;
          pendingModules += plan.modules?.filter((m: any) => m.status === 'pending').length || 0;
        });

        const progressPercentage = totalModules > 0 ? Math.round((completedModules / totalModules) * 100) : 0;

        return {
          traineeId: trainee.userId,
          traineeName: `${trainee.firstName} ${trainee.lastName}`,
          traineeEmail: trainee.email,
          totalPlans: traineePlans.length,
          totalModules,
          completedModules,
          inProgressModules,
          pendingModules,
          progressPercentage,
          plans: traineePlans.map((plan: any) => ({
            planId: plan.planId,
            planName: plan.planName,
            status: plan.status,
          })),
        };
      });

      return NextResponse.json(
        {
          success: true,
          progress: traineeProgress,
          userRole: 'admin',
          summary: {
            totalTrainees: traineeProgress.length,
            totalPlans: allPlans.length,
            averageProgress: traineeProgress.length > 0
              ? Math.round(traineeProgress.reduce((sum, t) => sum + t.progressPercentage, 0) / traineeProgress.length)
              : 0,
          },
        },
        { status: 200 }
      );
    }

    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  } catch (error: any) {
    console.error('Get progress error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const GET = roleMiddleware(['superadmin', 'admin', 'trainee'], handleGet);

