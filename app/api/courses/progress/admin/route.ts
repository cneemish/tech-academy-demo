import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import CourseProgress from '@/models/CourseProgress';
import User from '@/models/User';
import { roleMiddleware, AuthenticatedRequest } from '@/lib/middleware';

// Get all trainees' course progress for admin view
async function handleGet(req: AuthenticatedRequest) {
  try {
    await connectDB();

    const user = req.user;
    if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all course progress records
    const allProgress = await CourseProgress.find({})
      .sort({ lastAccessedAt: -1 })
      .lean();

    // Get all unique user IDs
    const userIds: string[] = Array.from(
      new Set(allProgress.map((p: any) => p.userId).filter((id: any): id is string => typeof id === 'string'))
    );
    
    // Get user details - filter by userId and role
    const users = await User.find({ 
      userId: { $in: userIds },
      role: 'trainee'
    })
      .select('userId firstName lastName email role')
      .lean();

    // Group progress by trainee
    const traineeProgress = users
      .filter((u: any) => u.role === 'trainee')
      .map((trainee: any) => {
        const traineeProgressRecords = allProgress.filter(
          (p: any) => p.userId === trainee.userId
        );

        let totalModules = 0;
        let completedModules = 0;
        let totalProgress = 0;

        traineeProgressRecords.forEach((progress: any) => {
          totalModules += progress.completedModules?.length || 0;
          completedModules += progress.completedModules?.length || 0;
          totalProgress += progress.progress || 0;
        });

        const averageProgress = traineeProgressRecords.length > 0
          ? Math.round(totalProgress / traineeProgressRecords.length)
          : 0;

        return {
          traineeId: trainee.userId,
          traineeName: `${trainee.firstName} ${trainee.lastName}`,
          traineeEmail: trainee.email,
          totalCourses: traineeProgressRecords.length,
          totalModules,
          completedModules,
          averageProgress,
          courses: traineeProgressRecords.map((p: any) => ({
            courseUid: p.courseUid,
            progress: p.progress,
            completedModules: p.completedModules?.length || 0,
            lastAccessedAt: p.lastAccessedAt,
            startedAt: p.startedAt,
            completedAt: p.completedAt,
          })),
        };
      });

    return NextResponse.json(
      {
        success: true,
        progress: traineeProgress,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Get admin course progress error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const GET = roleMiddleware(['superadmin', 'admin'], handleGet);

