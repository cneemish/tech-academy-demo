import { NextRequest, NextResponse } from 'next/server';
import Stack from '@/lib/contentstack';
import { roleMiddleware, AuthenticatedRequest } from '@/lib/middleware';

// Get single course entry by entry ID with all references
async function handleGet(req: AuthenticatedRequest, entryId: string) {
  try {
    const Query = Stack.ContentType('course').Entry(entryId);
    
    // Include referenced modules using the correct field name from content type
    // Based on course content type JSON: uid="reference", reference_to=["course_module"]
    Query.includeReference(['reference']);

    const result = await Query.toJSON().fetch();

    // Map course to ensure consistent field names
    // Check multiple possible field names for title
    let courseTitle = result.title;
    if (!courseTitle) {
      courseTitle = result.course_title || result.name || result.course_name;
    }
    if (!courseTitle && result.course_details) {
      courseTitle = result.course_details.title || result.course_details.course_title;
    }
    
    const mappedCourse = {
      ...result,
      title: courseTitle || 'Untitled Course',
      description: result.description || result.course_description || result.details || '',
      // Include course thumbnail if available
      course_thumbnail: result.course_thumbnail || null,
      // Include taxonomy information if present
      taxonomy: result.categories || result.taxonomy || result.category || [],
      // Get modules from the reference field (uid="reference" in course content type)
      course_modules: (result.reference || []).map((module: any) => ({
        ...module,
        title: module.title || module.module_title || module.name || 'Untitled Module',
        description: module.description || module.module_description || '',
        content: module.content || module.module_content || '',
        trainer: module.trainer || {},
        module_number: module.module_number || module.moduleNumber || 0,
        // Include course_module_group with JSON RTE content
        course_module_group: module.course_module_group || null,
        // Include course_video (can be image or mp3)
        course_video: module.course_video || null,
      })),
    };

    return NextResponse.json(
      {
        success: true,
        course: mappedCourse,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Get course entry error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch course entry',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: { entryId: string } }
) {
  return roleMiddleware(['superadmin', 'admin', 'trainee'], async (req: AuthenticatedRequest) => {
    return handleGet(req, params.entryId);
  })(req);
}

