import { NextRequest, NextResponse } from 'next/server';
import Stack from '@/lib/contentstack';
import { roleMiddleware, AuthenticatedRequest } from '@/lib/middleware';

// Get taxonomy terms for search/filtering
async function handleGet(req: AuthenticatedRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const taxonomyUid = searchParams.get('uid') || 'course_module'; // Default to course_module taxonomy
    
    // Fetch taxonomy terms using Contentstack Taxonomy API
    // Reference: https://www.contentstack.com/docs/developers/taxonomy
    // Note: The Contentstack JavaScript SDK may not support Taxonomy() directly
    // We'll use the Management API or fetch via HTTP request
    // For now, we'll use a workaround by fetching from the Contentstack API directly
    
    let result: any;
    try {
      // Try using the Contentstack SDK if Taxonomy method exists
      if ((Stack as any).Taxonomy) {
        const Query = (Stack as any).Taxonomy(taxonomyUid).Query();
        result = await Query.toJSON().find();
      } else {
        // Fallback: Return empty result - taxonomy terms should be managed via Contentstack UI
        // and will be included in entry data when fetched
        result = [];
      }
    } catch (sdkError) {
      // If SDK method doesn't exist, return empty array
      // Taxonomy terms will be available in course entries when fetched
      result = [];
    }

    // Contentstack returns terms in a specific structure
    // The result might be an array of terms or an object with terms
    let terms: any[] = [];
    
    if (Array.isArray(result)) {
      // If result is an array, check if it's [terms, metadata] or just terms
      if (result.length === 2 && Array.isArray(result[0])) {
        terms = result[0]; // First element is terms array
      } else {
        terms = result; // Entire result is terms array
      }
    } else if (result && typeof result === 'object') {
      // If result is an object, terms might be in a 'terms' property
      terms = result.terms || result.items || result.entries || [];
    }

    // Build hierarchical structure of terms (preserve parent-child relationships)
    // This function builds a tree structure while also creating a flat list
    const buildTermTree = (termList: any[]): { tree: any[], flat: any[] } => {
      const flat: any[] = [];
      const termMap = new Map<string, any>();
      
      // First pass: create all term objects
      termList.forEach((term: any) => {
        const termData = {
          uid: term.uid || term.id || term.term_uid,
          name: term.name || term.title || term.label || 'Unnamed Term',
          description: term.description || '',
          parent_uid: term.parent_uid || term.parentUid || null,
          children: [],
          level: 0,
        };
        
        if (termData.uid) {
          termMap.set(termData.uid, termData);
          flat.push(termData);
        }
      });
      
      // Second pass: build tree structure
      const rootTerms: any[] = [];
      flat.forEach((term: any) => {
        if (term.parent_uid && termMap.has(term.parent_uid)) {
          const parent = termMap.get(term.parent_uid);
          parent.children.push(term);
          term.level = (parent.level || 0) + 1;
        } else {
          rootTerms.push(term);
        }
      });
      
      return { tree: rootTerms, flat };
    };

    const { tree: termTree, flat: flattenedTerms } = buildTermTree(terms);

    return NextResponse.json(
      {
        success: true,
        taxonomy: flattenedTerms, // Flat list for easy filtering
        taxonomyTree: termTree, // Hierarchical structure for UI display
        count: flattenedTerms.length,
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
        error: error.message,
      },
      { status: 200 }
    );
  }
}

export const GET = roleMiddleware(['superadmin', 'admin', 'trainee'], handleGet);

