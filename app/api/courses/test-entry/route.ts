import { NextRequest, NextResponse } from 'next/server';
import Stack from '@/lib/contentstack';
import { roleMiddleware, AuthenticatedRequest } from '@/lib/middleware';

// Test endpoint to fetch the specific entry and see its structure
async function handleGet(req: AuthenticatedRequest) {
  try {
    const entryId = 'blt28b4cc9290b00e5c';
    
    // Fetch the entry with all references
    const Query = Stack.ContentType('course').Entry(entryId);
    Query.includeReference(['course_modules']);
    
    const result = await Query.toJSON().fetch();
    
    // Return the raw structure so we can see what fields are available
    return NextResponse.json(
      {
        success: true,
        entry: result,
        // Show available fields
        fields: Object.keys(result || {}),
        // Check for taxonomy field
        taxonomyFields: Object.keys(result || {}).filter((key: string) => 
          key.toLowerCase().includes('taxonomy') || 
          key.toLowerCase().includes('categor') ||
          key.toLowerCase().includes('term')
        ),
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Test entry error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch entry',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

export const GET = roleMiddleware(['superadmin', 'admin', 'trainee'], handleGet);

