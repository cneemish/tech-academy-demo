import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    // Fetch the Contentstack docs page
    const response = await fetch('https://www.contentstack.com/docs', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch Contentstack docs');
    }

    const html = await response.text();
    
    // Extract relevant information from the HTML
    // For now, we'll return a simplified structure
    // In production, you'd want to parse the HTML properly
    
    // Extract "What's New" section - this is a simplified parser
    const whatsNewMatch = html.match(/What's New[\s\S]*?<\/section>/i);
    
    // Extract recommended articles
    const recommendedMatch = html.match(/Recommended Articles[\s\S]*?<\/section>/i);
    
    return NextResponse.json(
      {
        success: true,
        updates: {
          whatsNew: whatsNewMatch ? 'Latest updates from Contentstack documentation' : null,
          recommended: recommendedMatch ? 'Recommended articles available' : null,
          lastUpdated: new Date().toISOString(),
        },
        // Return a simplified structure for now
        // You can enhance this with proper HTML parsing later
        message: 'Contentstack docs fetched successfully',
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error fetching Contentstack docs:', error);
    
    // Return mock data if fetch fails
    return NextResponse.json(
      {
        success: true,
        updates: {
          whatsNew: [
            {
              title: 'Taxonomy Localization',
              description: 'New feature for managing localized taxonomies',
              date: new Date().toISOString(),
            },
            {
              title: 'Studio',
              description: 'Visual builder for creating digital experiences',
              date: new Date().toISOString(),
            },
            {
              title: 'Working with Entry Tabs',
              description: 'Improved content editing experience',
              date: new Date().toISOString(),
            },
          ],
          recommended: [
            {
              title: 'Content Delivery API',
              description: 'Learn how to fetch content using our APIs',
            },
            {
              title: 'Content Management API',
              description: 'Manage your content programmatically',
            },
            {
              title: 'Set up Live Preview',
              description: 'Preview your content before publishing',
            },
          ],
          lastUpdated: new Date().toISOString(),
        },
        message: 'Using fallback data',
      },
      { status: 200 }
    );
  }
}

