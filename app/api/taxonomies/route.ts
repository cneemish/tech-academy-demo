import { NextRequest, NextResponse } from 'next/server';
import Stack from '@/lib/contentstack';
import { roleMiddleware, AuthenticatedRequest } from '@/lib/middleware';

// Get all taxonomies in the stack
async function handleGet(req: AuthenticatedRequest) {
  try {
    // Note: Contentstack Delivery API doesn't directly support listing all taxonomies
    // We'll need to use a known taxonomy UID or fetch from Management API
    // For now, we'll try common taxonomy UIDs or return the default one
    
    const { searchParams } = new URL(req.url);
    const taxonomyUid = searchParams.get('uid') || 'training_category'; // Try default or provided UID
    
    try {
      // Note: Contentstack JavaScript SDK may not support Taxonomy() method directly
      // For now, return empty terms - taxonomy will be fetched via the /api/taxonomy endpoint
      // which uses a different approach
      return NextResponse.json(
        {
          success: true,
          taxonomyUid,
          terms: [],
          count: 0,
          message: 'Use /api/taxonomy endpoint for taxonomy terms',
        },
        { status: 200 }
      );
    } catch (taxonomyError: any) {
      // If specific taxonomy fails, return empty
      console.error('Taxonomy fetch error:', taxonomyError);
      return NextResponse.json(
        {
          success: true,
          taxonomyUid,
          terms: [],
          count: 0,
          message: 'Taxonomy not found or empty',
        },
        { status: 200 }
      );
    }
  } catch (error: any) {
    console.error('Get taxonomies error:', error);
    return NextResponse.json(
      {
        success: true,
        terms: [],
        count: 0,
      },
      { status: 200 }
    );
  }
}

export const GET = roleMiddleware(['superadmin', 'admin', 'trainee'], handleGet);

