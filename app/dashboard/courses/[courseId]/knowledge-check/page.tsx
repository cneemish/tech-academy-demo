'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Layout from '@/components/Layout';
import JSONRTEContent from '@/components/JSONRTEContent';

export const dynamic = 'force-dynamic';

interface Question {
  question_to_be_asked: string;
  option_value: {
    option_1: string;
    option_2: string;
    option_3: string;
    option_4: string;
  };
  correct_answer: string;
}

interface CodingQuestion {
  coding_question_to_be_asked: string;
}

interface Section {
  section_title: string;
  questions: Question[];
  coding_questions: CodingQuestion[];
}

interface Test {
  uid: string;
  title: string;
  instruction: any;
  sections: Section[];
}

export default function KnowledgeCheckPage() {
  const router = useRouter();
  const params = useParams();
  const courseId = params?.courseId as string;
  
  const [user, setUser] = useState<any>(null);
  const [test, setTest] = useState<Test | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [showResults, setShowResults] = useState(false);
  const [courseProgress, setCourseProgress] = useState<any>(null);
  const [courseModules, setCourseModules] = useState<any[]>([]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    if (!token || !userData) {
      router.push('/');
      return;
    }

    const parsedUser = JSON.parse(userData);
    setUser(parsedUser);
    fetchCourseData();
    fetchTest();
  }, [courseId, router]);

  const fetchCourseData = async () => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const response = await fetch(`/api/courses/${courseId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.course) {
          setCourseModules(data.course.course_modules || []);
          
          // Fetch progress
          const progressResponse = await fetch(`/api/courses/${courseId}/progress`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
          
          if (progressResponse.ok) {
            const progressData = await progressResponse.json();
            if (progressData.success) {
              setCourseProgress(progressData.progress);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error fetching course data:', error);
    }
  };

  const fetchTest = async () => {
    try {
      setIsLoading(true);
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const response = await fetch(`/api/courses/${courseId}/test`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.success && data.test) {
        setTest(data.test);
      } else {
        // No test available
        router.push(`/dashboard/courses/${courseId}`);
      }
    } catch (error) {
      console.error('Error fetching test:', error);
      router.push(`/dashboard/courses/${courseId}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnswerChange = (sectionIndex: number, questionIndex: number, answer: string) => {
    const key = `section_${sectionIndex}_question_${questionIndex}`;
    setAnswers((prev) => ({
      ...prev,
      [key]: answer,
    }));
  };

  const handleCodingAnswerChange = (sectionIndex: number, codingIndex: number, answer: string) => {
    const key = `section_${sectionIndex}_coding_${codingIndex}`;
    setAnswers((prev) => ({
      ...prev,
      [key]: answer,
    }));
  };

  const handleSubmit = async () => {
    if (!test) return;

    try {
      setIsSubmitting(true);
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      
      // Build answers array
      const answersArray: any[] = [];
      
      test.sections.forEach((section, sectionIndex) => {
        // Normal questions
        section.questions.forEach((question, questionIndex) => {
          const key = `section_${sectionIndex}_question_${questionIndex}`;
          if (answers[key]) {
            answersArray.push({
              sectionIndex,
              questionIndex,
              answer: answers[key],
              questionType: 'normal',
            });
          }
        });
        
        // Coding questions
        section.coding_questions.forEach((codingQuestion, codingIndex) => {
          const key = `section_${sectionIndex}_coding_${codingIndex}`;
          if (answers[key]) {
            answersArray.push({
              sectionIndex,
              questionIndex: codingIndex,
              answer: answers[key],
              questionType: 'coding',
            });
          }
        });
      });

      const response = await fetch(`/api/courses/${courseId}/test/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ answers: answersArray }),
      });

      const data = await response.json();
      
      if (data.success) {
        setResults(data);
        setShowResults(true);
      } else {
        alert(data.error || 'Failed to submit test');
      }
    } catch (error) {
      console.error('Error submitting test:', error);
      alert('An error occurred while submitting the test');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <Layout user={user}>
        <div style={{ padding: '40px', textAlign: 'center' }}>
          <div style={{ fontSize: '18px', color: '#6b7280' }}>Loading knowledge check...</div>
        </div>
      </Layout>
    );
  }

  if (!test) {
    return (
      <Layout user={user}>
        <div style={{ padding: '40px', textAlign: 'center' }}>
          <div style={{ fontSize: '18px', color: '#6b7280' }}>No knowledge check available</div>
        </div>
      </Layout>
    );
  }

  // Check if all modules are completed
  const totalModules = courseModules.length;
  const completedModules = courseProgress?.completedModules || [];
  const completedCount = completedModules.length;
  const allModulesCompleted = totalModules > 0 && completedCount >= totalModules;
  const canTakeTest = totalModules === 0 || allModulesCompleted;

  // If modules exist and not all are completed, show message and redirect
  if (totalModules > 0 && !allModulesCompleted) {
    return (
      <Layout user={user}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px' }}>
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1f2937', marginBottom: '16px' }}>
              Complete All Modules First
            </div>
            <div style={{ fontSize: '16px', color: '#6b7280', marginBottom: '24px' }}>
              Please complete all {totalModules} modules before taking the knowledge check.
              <br />
              You have completed {completedCount} of {totalModules} modules.
            </div>
            <button
              onClick={() => router.push(`/dashboard/courses/${courseId}`)}
              style={{
                background: '#6366f1',
                color: 'white',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
              }}
            >
              Back to Course
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  const totalQuestions = test.sections.reduce(
    (acc, section) => acc + section.questions.length + section.coding_questions.length,
    0
  );
  const answeredQuestions = Object.keys(answers).length;

  return (
    <Layout user={user}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px' }}>
        {/* Header */}
        <div style={{ marginBottom: '24px' }}>
          <button
            onClick={() => router.push(`/dashboard/courses/${courseId}`)}
            style={{
              background: 'none',
              border: 'none',
              color: '#6366f1',
              cursor: 'pointer',
              fontSize: '14px',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            ← Back
          </button>
          <h1
            style={{
              fontSize: '28px',
              fontWeight: 'bold',
              color: '#1f2937',
              marginBottom: '8px',
            }}
          >
            {test.title}
          </h1>
          <div style={{ fontSize: '14px', color: '#6b7280' }}>
            Practice Assignment • 15 min
          </div>
        </div>

        {/* Instructions Button - Only show if instruction exists and has content */}
        {test.instruction && test.instruction.instruction_knowledge_check && (
          <div style={{ marginBottom: '24px' }}>
            <button
              onClick={() => setShowInstructions(!showInstructions)}
              style={{
                background: '#6366f1',
                color: 'white',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
              }}
            >
              Instructions
            </button>
          </div>
        )}

        {/* Instructions Modal - Only show if instruction exists and has content */}
        {showInstructions && test.instruction && test.instruction.instruction_knowledge_check && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
            }}
            onClick={() => setShowInstructions(false)}
          >
            <div
              style={{
                background: 'white',
                borderRadius: '12px',
                padding: '32px',
                maxWidth: '600px',
                maxHeight: '80vh',
                overflow: 'auto',
                position: 'relative',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setShowInstructions(false)}
                style={{
                  position: 'absolute',
                  top: '16px',
                  right: '16px',
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#6b7280',
                }}
              >
                ×
              </button>
              <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '16px' }}>
                Instructions
              </h2>
              <div>
                <JSONRTEContent jsonRteData={test.instruction.instruction_knowledge_check} />
              </div>
            </div>
          </div>
        )}

        {/* Results Modal */}
        {showResults && results && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
            }}
            onClick={() => setShowResults(false)}
          >
            <div
              style={{
                background: 'white',
                borderRadius: '12px',
                padding: '32px',
                maxWidth: '600px',
                maxHeight: '80vh',
                overflow: 'auto',
                position: 'relative',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setShowResults(false)}
                style={{
                  position: 'absolute',
                  top: '16px',
                  right: '16px',
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#6b7280',
                }}
              >
                ×
              </button>
              <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '16px' }}>
                Your Grade
              </h2>
              <div
                style={{
                  background: results.score.passed ? '#d1fae5' : '#fee2e2',
                  padding: '24px',
                  borderRadius: '8px',
                  marginBottom: '24px',
                }}
              >
                <div style={{ fontSize: '48px', fontWeight: 'bold', color: results.score.passed ? '#10b981' : '#ef4444', marginBottom: '8px' }}>
                  {results.score.percentage}%
                </div>
                <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '16px' }}>
                  To pass you need at least 80%. We keep your highest score.
                </div>
                <div style={{ fontSize: '14px', color: '#374151' }}>
                  {results.message}
                </div>
              </div>
              <div style={{ marginTop: '24px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
                  Results
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {results.results.map((result: any, index: number) => (
                    <div
                      key={index}
                      style={{
                        padding: '12px',
                        background: result.isCorrect ? '#d1fae5' : '#fee2e2',
                        borderRadius: '6px',
                      }}
                    >
                      <div style={{ fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>
                        {result.question}
                      </div>
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>
                        Your answer: {result.userAnswerText || result.userAnswer} {result.isCorrect ? '✓' : '✗'}
                      </div>
                      {!result.isCorrect && result.correctAnswerText && (
                        <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                          Correct answer: {result.correctAnswerText}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ marginTop: '24px', display: 'flex', gap: '12px' }}>
                <button
                  onClick={() => {
                    setShowResults(false);
                    setAnswers({});
                    setResults(null);
                  }}
                  style={{
                    background: '#6366f1',
                    color: 'white',
                    border: 'none',
                    padding: '10px 20px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500',
                  }}
                >
                  Retry
                </button>
                <button
                  onClick={() => router.push(`/dashboard/courses/${courseId}`)}
                  style={{
                    background: '#e5e7eb',
                    color: '#374151',
                    border: 'none',
                    padding: '10px 20px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500',
                  }}
                >
                  Back to Course
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Test Content */}
        <div
          style={{
            background: 'white',
            borderRadius: '12px',
            padding: '32px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          }}
        >
          {test.sections.map((section, sectionIndex) => (
            <div key={sectionIndex} style={{ marginBottom: '40px' }}>
              {section.section_title && (
                <h2
                  style={{
                    fontSize: '20px',
                    fontWeight: '600',
                    color: '#1f2937',
                    marginBottom: '24px',
                    paddingBottom: '12px',
                    borderBottom: '2px solid #e5e7eb',
                  }}
                >
                  {section.section_title}
                </h2>
              )}

              {/* Normal Questions */}
              {section.questions.map((question, questionIndex) => {
                const key = `section_${sectionIndex}_question_${questionIndex}`;
                const selectedAnswer = answers[key];

                return (
                  <div
                    key={questionIndex}
                    style={{
                      marginBottom: '32px',
                      padding: '24px',
                      background: '#f9fafb',
                      borderRadius: '8px',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '16px',
                      }}
                    >
                      <div style={{ fontSize: '16px', fontWeight: '500', color: '#1f2937' }}>
                        {questionIndex + 1}. {question.question_to_be_asked}
                      </div>
                      <div style={{ fontSize: '14px', color: '#6b7280' }}>1 point</div>
                    </div>

                    {question.question_to_be_asked.includes('code') || question.question_to_be_asked.includes('Code') ? (
                      <div
                        style={{
                          background: '#1f2937',
                          color: '#f9fafb',
                          padding: '16px',
                          borderRadius: '6px',
                          fontFamily: 'monospace',
                          fontSize: '14px',
                          marginBottom: '16px',
                          whiteSpace: 'pre-wrap',
                        }}
                      >
                        {question.question_to_be_asked.split('\n').slice(1).join('\n')}
                      </div>
                    ) : null}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {['option_1', 'option_2', 'option_3', 'option_4'].map((optionKey) => {
                        const optionValue = question.option_value[optionKey as keyof typeof question.option_value];
                        if (!optionValue) return null;

                        return (
                          <label
                            key={optionKey}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              padding: '12px',
                              background: selectedAnswer === optionKey ? '#ede9fe' : 'white',
                              border: `2px solid ${selectedAnswer === optionKey ? '#6366f1' : '#e5e7eb'}`,
                              borderRadius: '6px',
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                            }}
                          >
                            <input
                              type="radio"
                              name={key}
                              value={optionKey}
                              checked={selectedAnswer === optionKey}
                              onChange={(e) => handleAnswerChange(sectionIndex, questionIndex, e.target.value)}
                              style={{ marginRight: '12px', cursor: 'pointer' }}
                            />
                            <span style={{ fontSize: '14px', color: '#374151' }}>{optionValue}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {/* Coding Questions */}
              {section.coding_questions.map((codingQuestion, codingIndex) => {
                const key = `section_${sectionIndex}_coding_${codingIndex}`;
                const codingAnswer = answers[key];

                return (
                  <div
                    key={codingIndex}
                    style={{
                      marginBottom: '32px',
                      padding: '24px',
                      background: '#f9fafb',
                      borderRadius: '8px',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '16px',
                      }}
                    >
                      <div style={{ fontSize: '16px', fontWeight: '500', color: '#1f2937' }}>
                        {section.questions.length + codingIndex + 1}. {codingQuestion.coding_question_to_be_asked}
                      </div>
                      <div style={{ fontSize: '14px', color: '#6b7280' }}>1 point</div>
                    </div>

                    <textarea
                      value={codingAnswer || ''}
                      onChange={(e) => handleCodingAnswerChange(sectionIndex, codingIndex, e.target.value)}
                      placeholder="Write your code here..."
                      style={{
                        width: '100%',
                        minHeight: '200px',
                        padding: '12px',
                        border: '2px solid #e5e7eb',
                        borderRadius: '6px',
                        fontFamily: 'monospace',
                        fontSize: '14px',
                        resize: 'vertical',
                      }}
                    />
                  </div>
                );
              })}
            </div>
          ))}

          {/* Submit Button */}
          <div style={{ marginTop: '32px', paddingTop: '24px', borderTop: '2px solid #e5e7eb' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>
                {answeredQuestions} of {totalQuestions} questions answered
              </div>
            </div>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || answeredQuestions === 0}
              style={{
                background: answeredQuestions === 0 || isSubmitting ? '#d1d5db' : '#6366f1',
                color: 'white',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '6px',
                cursor: answeredQuestions === 0 || isSubmitting ? 'not-allowed' : 'pointer',
                fontSize: '16px',
                fontWeight: '500',
                width: '100%',
              }}
            >
              {isSubmitting ? 'Submitting...' : 'Submit'}
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
}

