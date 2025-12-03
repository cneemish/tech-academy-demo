import { NextRequest, NextResponse } from 'next/server';
import Stack from '@/lib/contentstack';
import { roleMiddleware, AuthenticatedRequest } from '@/lib/middleware';

// Get all courses
async function handleGet(req: AuthenticatedRequest) {
  try {
    const Query = Stack.ContentType('course').Query();

    // Get query parameters for search and filters
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search');
    const taxonomy = searchParams.get('taxonomy');

    // Add search query if provided
    if (search) {
      Query.search(search);
    }

    // Add taxonomy filter if provided
    if (taxonomy) {
      Query.where('taxonomy', taxonomy);
    }

    // Include referenced modules
    Query.includeReference(['course_modules']);

    const result = await Query.toJSON().find();

    return NextResponse.json(
      {
        success: true,
        courses: result[0] || [],
        count: result[1]?.entries?.length || 0,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Get courses error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch courses',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

export const GET = roleMiddleware(['superadmin', 'admin', 'trainee'], handleGet);

