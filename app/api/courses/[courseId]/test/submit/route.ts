import { NextRequest, NextResponse } from 'next/server';
import Stack from '@/lib/contentstack';
import { roleMiddleware, AuthenticatedRequest } from '@/lib/middleware';

interface AnswerSubmission {
  questionIndex: number;
  sectionIndex: number;
  answer: string; // The selected option key (e.g., "option_1", "option_2")
  questionType: 'normal' | 'coding';
}

// Validate and submit test answers
async function handlePost(req: AuthenticatedRequest, courseId: string) {
  try {
    const { answers } = await req.json();
    
    if (!answers || !Array.isArray(answers)) {
      return NextResponse.json(
        { error: 'Answers array is required' },
        { status: 400 }
      );
    }
    
    // Fetch the course test to get correct answers
    const Query = Stack.ContentType('course').Entry(courseId);
    Query.includeReference(['reference_test']);
    
    const result = await Query.toJSON().fetch();
    
    // Get the test reference - handle both single object and array cases
    let testReference = result.reference_test;
    
    // If it's an array, get the first item
    if (Array.isArray(testReference)) {
      testReference = testReference.length > 0 ? testReference[0] : null;
    }
    
    // If still no reference or no uid, return error
    if (!testReference || !testReference.uid) {
      return NextResponse.json(
        { error: 'No knowledge check found for this course' },
        { status: 404 }
      );
    }
    
    // Fetch the test entry
    const TestQuery = Stack.ContentType('course_test').Entry(testReference.uid);
    TestQuery.includeReference(['instruction']);
    
    const testResult = await TestQuery.toJSON().fetch();
    const sections = testResult.section || [];
    
    // Validate answers
    let totalQuestions = 0;
    let correctAnswers = 0;
    const results: Array<{
      sectionIndex: number;
      questionIndex: number;
      isCorrect: boolean;
      userAnswer: string;
      userAnswerText: string; // The actual option text
      correctAnswer: string;
      correctAnswerText: string; // The actual correct option text
      question: string;
    }> = [];
    
    // Process each answer
    answers.forEach((answer: AnswerSubmission) => {
      const { sectionIndex, questionIndex, answer: userAnswer, questionType } = answer;
      
      if (questionType === 'normal') {
        const section = sections[sectionIndex];
        if (!section || !section.question || !section.question[questionIndex]) {
          return;
        }
        
        const question = section.question[questionIndex];
        const correctAnswer = question.please_select_the_answer;
        
        // Get option text values
        const optionValue = question.option_value || {};
        const userAnswerText = optionValue[userAnswer as keyof typeof optionValue] || userAnswer;
        const correctAnswerText = optionValue[correctAnswer as keyof typeof optionValue] || correctAnswer || '';
        
        totalQuestions++;
        
        const isCorrect = userAnswer === correctAnswer;
        if (isCorrect) {
          correctAnswers++;
        }
        
        results.push({
          sectionIndex,
          questionIndex,
          isCorrect,
          userAnswer,
          userAnswerText: userAnswerText || userAnswer,
          correctAnswer: correctAnswer || '',
          correctAnswerText: correctAnswerText || correctAnswer || '',
          question: question.question_to_be_asked || '',
        });
      } else if (questionType === 'coding') {
        // For coding questions, we'll mark as correct for now
        // In future, we can add code evaluation logic
        const section = sections[sectionIndex];
        if (!section || !section.question_coding || !section.question_coding[questionIndex]) {
          return;
        }
        
        const codingQuestion = section.question_coding[questionIndex];
        
        totalQuestions++;
        // For now, coding questions are not auto-graded
        // You can implement code evaluation logic here
        
        results.push({
          sectionIndex,
          questionIndex,
          isCorrect: false, // Will need manual review or code evaluation
          userAnswer: userAnswer || '',
          userAnswerText: userAnswer || '', // For coding questions, show the code answer
          correctAnswer: 'N/A - Coding question requires manual review',
          correctAnswerText: 'N/A - Coding question requires manual review',
          question: codingQuestion.coding_question_to_be_asked || '',
        });
      }
    });
    
    // Calculate score percentage
    const scorePercentage = totalQuestions > 0 
      ? Math.round((correctAnswers / totalQuestions) * 100) 
      : 0;
    
    // Determine if passed (80% threshold)
    const passed = scorePercentage >= 80;
    
    return NextResponse.json(
      {
        success: true,
        score: {
          correct: correctAnswers,
          total: totalQuestions,
          percentage: scorePercentage,
          passed,
        },
        results,
        message: passed 
          ? `Congratulations! You scored ${scorePercentage}% and passed the knowledge check.`
          : `You scored ${scorePercentage}%. You need at least 80% to pass. Please review and try again.`,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Submit test error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to submit test',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { courseId: string } }
) {
  return roleMiddleware(['superadmin', 'admin', 'trainee'], async (req: AuthenticatedRequest) => {
    return handlePost(req, params.courseId);
  })(req);
}

