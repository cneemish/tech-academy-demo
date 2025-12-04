import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import CourseProgress from '@/models/CourseProgress';
import TrainingPlan from '@/models/TrainingPlan';
import { roleMiddleware, AuthenticatedRequest } from '@/lib/middleware';

// Get course progress for the current user
async function handleGet(req: AuthenticatedRequest, courseId: string) {
  try {
    await connectDB();

    const user = req.user;
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get course progress for this user and course
    const progress = await CourseProgress.findOne({
      userId: user.userId,
      courseUid: courseId,
    }).lean();

    if (!progress) {
      // No progress yet, return default
      return NextResponse.json(
        {
          success: true,
          progress: {
            userId: user.userId,
            courseUid: courseId,
            completedModules: [],
            currentModule: null,
            progress: 0,
            startedAt: null,
            lastAccessedAt: null,
          },
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        progress,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Get course progress error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Mark module as complete and update progress
async function handlePost(req: AuthenticatedRequest, courseId: string) {
  try {
    await connectDB();

    const user = req.user;
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { moduleUid, totalModules } = await req.json();

    if (!moduleUid) {
      return NextResponse.json(
        { error: 'Module UID is required' },
        { status: 400 }
      );
    }

    // Find or create course progress
    let courseProgress = await CourseProgress.findOne({
      userId: user.userId,
      courseUid: courseId,
    });

    if (!courseProgress) {
      // Create new progress record
      courseProgress = new CourseProgress({
        userId: user.userId,
        courseId: courseId,
        courseUid: courseId,
        completedModules: [moduleUid],
        currentModule: moduleUid,
        progress: totalModules > 0 ? Math.round((1 / totalModules) * 100) : 0,
        startedAt: new Date(),
        lastAccessedAt: new Date(),
      });
    } else {
      // Update existing progress
      if (!courseProgress.completedModules.includes(moduleUid)) {
        courseProgress.completedModules.push(moduleUid);
      }
      courseProgress.currentModule = moduleUid;
      courseProgress.lastAccessedAt = new Date();

      // Calculate progress percentage
      const totalModulesCount = totalModules || courseProgress.completedModules.length;
      courseProgress.progress = totalModulesCount > 0
        ? Math.round((courseProgress.completedModules.length / totalModulesCount) * 100)
        : 0;

      // Check if course is completed
      if (courseProgress.completedModules.length >= totalModulesCount && totalModulesCount > 0) {
        courseProgress.completedAt = new Date();
        courseProgress.progress = 100;
      }
    }

    await courseProgress.save();

    // Also update training plan modules if they exist
    // Find training plans for this user that contain this module
    const trainingPlans = await TrainingPlan.find({
      traineeId: user.userId,
      'modules.moduleUid': moduleUid,
    });

    for (const plan of trainingPlans) {
      const moduleIndex = plan.modules.findIndex((m: any) => m.moduleUid === moduleUid);
      if (moduleIndex !== -1) {
        plan.modules[moduleIndex].status = 'completed';
        
        // Check if all modules are completed
        const allCompleted = plan.modules.every((m: any) => m.status === 'completed');
        if (allCompleted) {
          plan.status = 'completed';
        } else {
          // Check if any module is in progress
          const hasInProgress = plan.modules.some((m: any) => m.status === 'in-progress');
          if (!hasInProgress) {
            // Mark first pending module as in-progress
            const firstPendingIndex = plan.modules.findIndex((m: any) => m.status === 'pending');
            if (firstPendingIndex !== -1) {
              plan.modules[firstPendingIndex].status = 'in-progress';
            }
          }
          
          // Update plan status
          if (plan.status === 'draft' || plan.status === 'scheduled') {
            plan.status = 'in-progress';
          }
        }
        
        await plan.save();
      }
    }

    return NextResponse.json(
      {
        success: true,
        progress: courseProgress,
        message: 'Module marked as complete',
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Update course progress error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: { courseId: string } }
) {
  return roleMiddleware(['superadmin', 'admin', 'trainee'], async (req: AuthenticatedRequest) => {
    return handleGet(req, params.courseId);
  })(req);
}

export async function POST(
  req: NextRequest,
  { params }: { params: { courseId: string } }
) {
  return roleMiddleware(['superadmin', 'admin', 'trainee'], async (req: AuthenticatedRequest) => {
    return handlePost(req, params.courseId);
  })(req);
}

