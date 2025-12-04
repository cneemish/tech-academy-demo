import { NextRequest, NextResponse } from 'next/server';
import Stack from '@/lib/contentstack';
import { roleMiddleware, AuthenticatedRequest } from '@/lib/middleware';

// Get all course modules
async function handleGet(req: AuthenticatedRequest) {
  try {
    const Query = Stack.ContentType('course_module').Query();
    
    // Get all modules
    const result = await Query.toJSON().find();

    // Map modules to ensure consistent field names
    const mappedModules = (result[0] || []).map((module: any) => ({
      ...module,
      uid: module.uid,
      title: module.title || module.module_title || 'Untitled Module',
      description: module.description || module.module_description || '',
      content: module.content || module.module_content || '',
      trainer: module.trainer || {},
      module_number: module.module_number || module.moduleNumber || 0,
    }));

    // Sort modules by module_number in ascending order
    const sortedModules = mappedModules.sort((a: any, b: any) => {
      const numA = Number(a.module_number) || 0;
      const numB = Number(b.module_number) || 0;
      return numA - numB;
    });

    return NextResponse.json(
      {
        success: true,
        modules: sortedModules,
        count: sortedModules.length,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Get course modules error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch course modules',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

export const GET = roleMiddleware(['superadmin', 'admin', 'trainee'], handleGet);

