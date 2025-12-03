import { NextRequest, NextResponse } from 'next/server';
import Stack from '@/lib/contentstack';
import { roleMiddleware, AuthenticatedRequest } from '@/lib/middleware';

// Get single course with all details
async function handleGet(req: AuthenticatedRequest, courseId: string) {
  try {
    const Query = Stack.ContentType('course').Entry(courseId);
    
    // Include all referenced modules
    Query.includeReference(['course_modules']);

    const result = await Query.toJSON().fetch();

    return NextResponse.json(
      {
        success: true,
        course: result,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Get course error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch course',
        details: error.message 
      },
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

