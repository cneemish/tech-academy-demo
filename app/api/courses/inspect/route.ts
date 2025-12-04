import { NextRequest, NextResponse } from 'next/server';
import Stack from '@/lib/contentstack';
import { roleMiddleware, AuthenticatedRequest } from '@/lib/middleware';

// Inspect endpoint to see the structure of a course entry
// This helps identify the taxonomy field name
async function handleGet(req: AuthenticatedRequest) {
  try {
    // Fetch a few courses to inspect their structure
    const Query = Stack.ContentType('course').Query();
    Query.limit(1);
    Query.includeReference(['course_modules']);
    
    const result = await Query.toJSON().find();
    const courses = result[0] || [];
    
    if (courses.length > 0) {
      const course = courses[0];
      return NextResponse.json(
        {
          success: true,
          sampleCourse: course,
          allFields: Object.keys(course),
          taxonomyFields: Object.keys(course).filter((key: string) => {
            const lowerKey = key.toLowerCase();
            return lowerKey.includes('taxonomy') || 
                   lowerKey.includes('categor') || 
                   lowerKey.includes('term') ||
                   lowerKey.includes('tag');
          }),
          // Show the actual taxonomy field value if it exists
          taxonomyFieldValues: Object.keys(course)
            .filter((key: string) => {
              const lowerKey = key.toLowerCase();
              return lowerKey.includes('taxonomy') || 
                     lowerKey.includes('categor') || 
                     lowerKey.includes('term');
            })
            .reduce((acc: any, key: string) => {
              acc[key] = course[key];
              return acc;
            }, {}),
        },
        { status: 200 }
      );
    }
    
    return NextResponse.json(
      {
        success: true,
        message: 'No courses found to inspect',
        allFields: [],
        taxonomyFields: [],
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Inspect courses error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to inspect courses',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

export const GET = roleMiddleware(['superadmin', 'admin', 'trainee'], handleGet);

