import { NextRequest, NextResponse } from 'next/server';
import Stack from '@/lib/contentstack';
import { roleMiddleware, AuthenticatedRequest } from '@/lib/middleware';

// Get taxonomy terms for search/filtering
async function handleGet(req: AuthenticatedRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const taxonomyUid = searchParams.get('uid') || 'course_module'; // Default to course_module taxonomy
    
    // Fetch taxonomy terms
    // Note: Contentstack Delivery API doesn't support direct taxonomy fetching
    // We'll use the taxonomy data from the JSON file or fetch from entries
    let terms: any[] = [];
    
    try {
      // Try to fetch from Contentstack Delivery API first (if supported)
      const apiKey = process.env.CONTENTSTACK_API_KEY;
      const deliveryToken = process.env.CONTENTSTACK_DELIVERY_TOKEN;
      const baseUrl = 'https://cdn.contentstack.io/v3';
      
      // Only attempt API fetch if credentials are available
      if (!apiKey || !deliveryToken) {
        throw new Error('Contentstack credentials not configured');
      }
      
      // Attempt to fetch taxonomy terms via API
      const taxonomyUrl = `${baseUrl}/taxonomies/${taxonomyUid}/terms`;
      const response = await fetch(taxonomyUrl, {
        method: 'GET',
        headers: {
          'api_key': apiKey,
          'access_token': deliveryToken,
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      });
      
      if (response.ok) {
        const data = await response.json();
        terms = data.terms || data.items || [];
        console.log(`Fetched ${terms.length} taxonomy terms from API for ${taxonomyUid}`);
      } else {
        // API doesn't support taxonomy endpoint, use JSON file as fallback
        throw new Error('Taxonomy API not available');
      }
    } catch (apiError: any) {
      // Fallback: Use the taxonomy JSON file from contenttype folder
      // Try course_module (2).json first, then course_module_taxanomy.json
      try {
        const fs = require('fs');
        const path = require('path');
        
        // Try course_module (2).json first
        let taxonomyFilePath = path.join(process.cwd(), 'contenttype', 'course_module (2).json');
        if (!fs.existsSync(taxonomyFilePath)) {
          // Fallback to course_module_taxanomy.json
          taxonomyFilePath = path.join(process.cwd(), 'contenttype', 'course_module_taxanomy.json');
        }
        
        if (fs.existsSync(taxonomyFilePath)) {
          const taxonomyData = JSON.parse(fs.readFileSync(taxonomyFilePath, 'utf8'));
          
          // Handle both formats: {taxonomy: {...}, terms: [...]} and direct structure
          if (taxonomyData.taxonomy && taxonomyData.taxonomy.uid === taxonomyUid) {
            terms = taxonomyData.terms || [];
            console.log(`Loaded ${terms.length} taxonomy terms from JSON file for ${taxonomyUid}`);
          } else if (taxonomyData.terms && Array.isArray(taxonomyData.terms)) {
            // Direct terms array
            terms = taxonomyData.terms;
            console.log(`Loaded ${terms.length} taxonomy terms from JSON file for ${taxonomyUid}`);
          }
        }
      } catch (fileError: any) {
        console.error('Error loading taxonomy from JSON file:', fileError.message);
        // If JSON file doesn't exist, return empty array
        terms = [];
      }
    }

    // Build hierarchical structure of terms (preserve parent-child relationships)
    // This function builds a tree structure while also creating a flat list
    // Also creates a full path string like "UI > Content Type > Entry"
    const buildTermTree = (termList: any[]): { tree: any[], flat: any[] } => {
      const flat: any[] = [];
      const termMap = new Map<string, any>();
      
      // First pass: create all term objects
      termList.forEach((term: any) => {
        const termData = {
          uid: term.uid || term.id || term.term_uid,
          name: term.name || term.title || term.label || 'Unnamed Term',
          description: term.description || '',
          parent_uid: term.parent_uid || term.parentUid || term.parent?.uid || null,
          children: [],
          level: 0,
          path: '', // Will be set in second pass
        };
        
        if (termData.uid) {
          termMap.set(termData.uid, termData);
          flat.push(termData);
        }
      });
      
      // Helper function to build full path (e.g., "UI > Content Type > Entry")
      const buildPath = (term: any, pathMap: Map<string, string>): string => {
        if (pathMap.has(term.uid)) {
          return pathMap.get(term.uid)!;
        }
        
        if (!term.parent_uid || !termMap.has(term.parent_uid)) {
          // Root term
          const path = term.name;
          pathMap.set(term.uid, path);
          return path;
        }
        
        const parent = termMap.get(term.parent_uid);
        const parentPath = buildPath(parent, pathMap);
        const fullPath = `${parentPath} > ${term.name}`;
        pathMap.set(term.uid, fullPath);
        return fullPath;
      };
      
      // Second pass: build tree structure and paths
      const rootTerms: any[] = [];
      const pathMap = new Map<string, string>();
      
      flat.forEach((term: any) => {
        if (term.parent_uid && termMap.has(term.parent_uid)) {
          const parent = termMap.get(term.parent_uid);
          parent.children.push(term);
          term.level = (parent.level || 0) + 1;
        } else {
          rootTerms.push(term);
        }
        
        // Build full path for this term
        term.path = buildPath(term, pathMap);
      });
      
      // Sort children at each level
      const sortChildren = (terms: any[]) => {
        terms.forEach(term => {
          if (term.children.length > 0) {
            term.children.sort((a: any, b: any) => a.name.localeCompare(b.name));
            sortChildren(term.children);
          }
        });
      };
      sortChildren(rootTerms);
      
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

