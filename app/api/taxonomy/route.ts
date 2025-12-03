import { NextRequest, NextResponse } from 'next/server';
import Stack from '@/lib/contentstack';
import { roleMiddleware, AuthenticatedRequest } from '@/lib/middleware';

// Get taxonomy terms for search/filtering
async function handleGet(req: AuthenticatedRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const taxonomyUid = searchParams.get('uid') || 'training_category'; // Default taxonomy UID
    
    // Fetch taxonomy terms
    const Query = Stack.Taxonomy(taxonomyUid).Query();
    
    const result = await Query.toJSON().find();

    return NextResponse.json(
      {
        success: true,
        taxonomy: result[0] || [],
        count: result[1]?.terms?.length || 0,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Get taxonomy error:', error);
    // Return empty array if taxonomy doesn't exist
    return NextResponse.json(
      {
        success: true,
        taxonomy: [],
        count: 0,
      },
      { status: 200 }
    );
  }
}

export const GET = roleMiddleware(['superadmin', 'admin', 'trainee'], handleGet);

