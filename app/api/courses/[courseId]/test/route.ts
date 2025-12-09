import { NextRequest, NextResponse } from 'next/server';
import Stack from '@/lib/contentstack';
import { roleMiddleware, AuthenticatedRequest } from '@/lib/middleware';

// Get course test with instruction references
async function handleGet(req: AuthenticatedRequest, courseId: string) {
  try {
    const Query = Stack.ContentType('course').Entry(courseId);
    
    // Include referenced test and instruction
    Query.includeReference(['reference_test']);
    
    const result = await Query.toJSON().fetch();
    
    // Debug: Log the structure to understand what we're getting
    console.log('Course result reference_test:', JSON.stringify(result.reference_test, null, 2));
    
    // Get the test reference - handle both single object and array cases
    let testReference = result.reference_test;
    
    // If it's an array, get the first item
    if (Array.isArray(testReference)) {
      testReference = testReference.length > 0 ? testReference[0] : null;
    }
    
    // If still no reference or no uid, return null
    if (!testReference || !testReference.uid) {
      console.log('No valid test reference found. testReference:', testReference);
      return NextResponse.json(
        {
          success: true,
          test: null,
          message: 'No knowledge check available for this course',
        },
        { status: 200 }
      );
    }
    
    console.log('Fetching test with UID:', testReference.uid);
    
    // Fetch the test entry with instruction reference
    const TestQuery = Stack.ContentType('course_test').Entry(testReference.uid);
    TestQuery.includeReference(['instruction']);
    
    const testResult = await TestQuery.toJSON().fetch();
    
    // Debug: Log instruction structure
    console.log('Test result instruction:', JSON.stringify(testResult.instruction, null, 2));
    
    // Handle instruction reference - can be single object or array
    let instructionData = testResult.instruction;
    
    // If it's an array, get the first item
    if (Array.isArray(instructionData)) {
      instructionData = instructionData.length > 0 ? instructionData[0] : null;
    }
    
    // Validate instruction has data
    let instruction = null;
    if (instructionData && instructionData.uid) {
      // Check if instruction_knowledge_check field exists and has content
      const instructionContent = instructionData.instruction_knowledge_check;
      const hasContent = instructionContent && (
        (typeof instructionContent === 'string' && instructionContent.trim().length > 0) ||
        (typeof instructionContent === 'object' && Object.keys(instructionContent).length > 0)
      );
      
      if (hasContent) {
        instruction = {
          uid: instructionData.uid,
          title: instructionData.title || 'Instructions',
          instruction_knowledge_check: instructionContent,
        };
        console.log('Valid instruction found with content');
      } else {
        console.log('Instruction reference exists but has no content');
      }
    } else {
      console.log('No instruction reference found');
    }
    
    // Map test data structure
    const mappedTest = {
      uid: testResult.uid,
      title: testResult.title || 'Knowledge Check',
      instruction: instruction,
      sections: (testResult.section || []).map((section: any) => ({
        section_title: section.section_title || 'Untitled Section',
        questions: (section.question || []).map((question: any) => ({
          question_to_be_asked: question.question_to_be_asked || '',
          option_value: question.option_value || {
            option_1: '',
            option_2: '',
            option_3: '',
            option_4: '',
          },
          correct_answer: question.please_select_the_answer || null, // This is the answer key (option_1, option_2, etc.)
        })),
        coding_questions: (section.question_coding || []).map((codingQuestion: any) => ({
          coding_question_to_be_asked: codingQuestion.coding_question_to_be_asked || '',
        })),
      })),
    };
    
    return NextResponse.json(
      {
        success: true,
        test: mappedTest,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Get course test error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch course test',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: { courseId: string } }
) {
  return roleMiddleware(['superadmin', 'admin', 'trainee'], async (req: AuthenticatedRequest) => {
    return handleGet(req, params.courseId);
  })(req);
}

