'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/Layout';

// Force dynamic rendering - this page requires client-side features
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Component to show assigned courses for trainees
function AssignedCoursesList() {
  const [courses, setCourses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const response = await fetch('/api/courses', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (data.success) {
        setCourses(data.courses?.slice(0, 3) || []); // Show first 3 courses
      }
    } catch (error) {
      console.error('Error fetching courses:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <div style={{ textAlign: 'center', padding: '20px', color: '#6b7280' }}>Loading courses...</div>;
  }

  if (courses.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>📖</div>
        <div style={{ fontSize: '16px', fontWeight: '500', marginBottom: '8px' }}>
          No courses assigned yet
        </div>
        <div style={{ fontSize: '14px' }}>
          Your assigned courses will appear here
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
      {courses.map((course: any) => (
        <div
          key={course.uid}
          onClick={() => router.push(`/dashboard/courses/${course.uid}`)}
          style={{
            padding: '20px',
            background: '#f9fafb',
            borderRadius: '8px',
            border: '1px solid #e5e7eb',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#f3f4f6';
            e.currentTarget.style.borderColor = '#6366f1';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#f9fafb';
            e.currentTarget.style.borderColor = '#e5e7eb';
          }}
        >
          <div
            style={{
              width: '100%',
              height: '120px',
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              borderRadius: '6px',
              marginBottom: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '32px',
              fontWeight: 'bold',
            }}
          >
            {course.title?.[0]?.toUpperCase() || '📚'}
          </div>
          <h4
            style={{
              fontSize: '16px',
              fontWeight: '600',
              color: '#1f2937',
              marginBottom: '4px',
            }}
          >
            {course.title || course.course_title || 'Untitled Course'}
          </h4>
          <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '12px' }}>
            {course.course_modules?.length || 0} modules
          </div>
          <div
            style={{
              padding: '6px 12px',
              background: '#6366f1',
              color: 'white',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: '500',
              textAlign: 'center',
            }}
          >
            Start Course →
          </div>
        </div>
      ))}
    </div>
  );
}

export default function HomePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [updates, setUpdates] = useState<any>(null);
  const [progress, setProgress] = useState<any>(null);
  const [courseProgress, setCourseProgress] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [progressLoading, setProgressLoading] = useState(true);
  const [courseProgressLoading, setCourseProgressLoading] = useState(true);

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
    fetchUpdates();
    fetchProgress();
    if (parsedUser.role === 'admin' || parsedUser.role === 'superadmin') {
      fetchCourseProgress();
    }
  }, [router]);

  const fetchUpdates = async () => {
    try {
      const response = await fetch('/api/contentstack-docs');
      const data = await response.json();
      if (data.success) {
        setUpdates(data.updates);
      }
    } catch (error) {
      console.error('Error fetching updates:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchProgress = async () => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const response = await fetch('/api/training-plans/progress', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (data.success) {
        setProgress(data);
      }
    } catch (error) {
      console.error('Error fetching progress:', error);
    } finally {
      setProgressLoading(false);
    }
  };

  const fetchCourseProgress = async () => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const response = await fetch('/api/courses/progress/admin', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (data.success) {
        setCourseProgress(data);
      }
    } catch (error) {
      console.error('Error fetching course progress:', error);
    } finally {
      setCourseProgressLoading(false);
    }
  };

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <Layout user={user} activePage="home">
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <h2
          style={{
            fontSize: '28px',
            fontWeight: 'bold',
            color: '#1f2937',
            marginBottom: '8px',
          }}
        >
          Welcome back, {user.firstName}!
        </h2>
        <p style={{ fontSize: '16px', color: '#6b7280', marginBottom: '32px' }}>
          {user.role === 'trainee' 
            ? 'Track your training progress and stay updated'
            : 'Monitor trainee progress and stay updated'}
        </p>

        {/* Assigned Courses Section - For Trainees */}
        {user.role === 'trainee' && (
          <div
            style={{
              background: 'white',
              borderRadius: '12px',
              padding: '24px',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
              marginBottom: '24px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3
                style={{
                  fontSize: '20px',
                  fontWeight: '600',
                  color: '#1f2937',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <span>📚</span> My Assigned Courses
              </h3>
              <button
                onClick={() => router.push('/dashboard/courses')}
                style={{
                  padding: '8px 16px',
                  background: '#6366f1',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                }}
              >
                View All Courses
              </button>
            </div>
            <AssignedCoursesList />
          </div>
        )}

        {/* Trainee Progress Section */}
        {!progressLoading && progress && (
          <div
            style={{
              background: 'white',
              borderRadius: '12px',
              padding: '24px',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
              marginBottom: '24px',
            }}
          >
            <h3
              style={{
                fontSize: '20px',
                fontWeight: '600',
                color: '#1f2937',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <span>📊</span> {user.role === 'trainee' ? 'My Training Progress' : 'Trainee Progress'}
            </h3>

            {user.role === 'trainee' ? (
              // Trainee View
              progress.progress && progress.progress.length > 0 ? (
                <div style={{ display: 'grid', gap: '20px' }}>
                  {progress.progress.map((plan: any, index: number) => (
                    <div
                      key={plan.planId}
                      style={{
                        padding: '20px',
                        background: '#f9fafb',
                        borderRadius: '8px',
                        border: '1px solid #e5e7eb',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '16px' }}>
                        <div>
                          <div style={{ fontSize: '18px', fontWeight: '600', color: '#1f2937', marginBottom: '4px' }}>
                            {plan.planName}
                          </div>
                          {plan.description && (
                            <div style={{ fontSize: '14px', color: '#6b7280' }}>
                              {plan.description}
                            </div>
                          )}
                        </div>
                        <span
                          style={{
                            padding: '6px 12px',
                            borderRadius: '12px',
                            fontSize: '12px',
                            fontWeight: '500',
                            background: plan.status === 'completed' ? '#d1fae5' : plan.status === 'in-progress' ? '#dbeafe' : '#f3f4f6',
                            color: plan.status === 'completed' ? '#065f46' : plan.status === 'in-progress' ? '#1e40af' : '#6b7280',
                          }}
                        >
                          {plan.status}
                        </span>
                      </div>

                      {/* Progress Bar */}
                      <div style={{ marginBottom: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                          <span style={{ fontSize: '14px', fontWeight: '500', color: '#374151' }}>
                            Overall Progress
                          </span>
                          <span style={{ fontSize: '14px', fontWeight: '600', color: '#6366f1' }}>
                            {plan.progressPercentage}%
                          </span>
                        </div>
                        <div
                          style={{
                            width: '100%',
                            height: '12px',
                            background: '#e5e7eb',
                            borderRadius: '6px',
                            overflow: 'hidden',
                          }}
                        >
                          <div
                            style={{
                              width: `${plan.progressPercentage}%`,
                              height: '100%',
                              background: 'linear-gradient(90deg, #6366f1 0%, #8b5cf6 100%)',
                              transition: 'width 0.3s ease',
                            }}
                          />
                        </div>
                      </div>

                      {/* Module Stats */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                        <div style={{ textAlign: 'center', padding: '12px', background: 'white', borderRadius: '6px' }}>
                          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#6366f1' }}>
                            {plan.completedModules}
                          </div>
                          <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                            Completed
                          </div>
                        </div>
                        <div style={{ textAlign: 'center', padding: '12px', background: 'white', borderRadius: '6px' }}>
                          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#3b82f6' }}>
                            {plan.inProgressModules}
                          </div>
                          <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                            In Progress
                          </div>
                        </div>
                        <div style={{ textAlign: 'center', padding: '12px', background: 'white', borderRadius: '6px' }}>
                          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#9ca3af' }}>
                            {plan.pendingModules}
                          </div>
                          <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                            Pending
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                  <div style={{ fontSize: '48px', marginBottom: '16px' }}>📚</div>
                  <div style={{ fontSize: '16px', fontWeight: '500', marginBottom: '8px' }}>
                    No training plans assigned yet
                  </div>
                  <div style={{ fontSize: '14px' }}>
                    Your training plans will appear here once assigned
                  </div>
                </div>
              )
            ) : (
              // Admin View - Summary of all trainees
              progress.progress && progress.progress.length > 0 ? (
                <div>
                  {/* Summary Cards */}
                  {progress.summary && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
                      <div style={{ padding: '20px', background: '#f0f9ff', borderRadius: '8px', border: '1px solid #bae6fd' }}>
                        <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#0369a1', marginBottom: '8px' }}>
                          {progress.summary.totalTrainees}
                        </div>
                        <div style={{ fontSize: '14px', color: '#0c4a6e', fontWeight: '500' }}>
                          Total Trainees
                        </div>
                      </div>
                      <div style={{ padding: '20px', background: '#f5f3ff', borderRadius: '8px', border: '1px solid #c4b5fd' }}>
                        <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#7c3aed', marginBottom: '8px' }}>
                          {progress.summary.totalPlans}
                        </div>
                        <div style={{ fontSize: '14px', color: '#5b21b6', fontWeight: '500' }}>
                          Total Plans
                        </div>
                      </div>
                      <div style={{ padding: '20px', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #86efac' }}>
                        <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#16a34a', marginBottom: '8px' }}>
                          {progress.summary.averageProgress}%
                        </div>
                        <div style={{ fontSize: '14px', color: '#15803d', fontWeight: '500' }}>
                          Avg. Progress
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Trainee List */}
                  <div style={{ display: 'grid', gap: '16px' }}>
                    {progress.progress.map((trainee: any, index: number) => (
                      <div
                        key={trainee.traineeId}
                        style={{
                          padding: '20px',
                          background: '#f9fafb',
                          borderRadius: '8px',
                          border: '1px solid #e5e7eb',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '16px' }}>
                          <div>
                            <div style={{ fontSize: '18px', fontWeight: '600', color: '#1f2937', marginBottom: '4px' }}>
                              {trainee.traineeName}
                            </div>
                            <div style={{ fontSize: '14px', color: '#6b7280' }}>
                              {trainee.traineeEmail}
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#6366f1', marginBottom: '4px' }}>
                              {trainee.progressPercentage}%
                            </div>
                            <div style={{ fontSize: '12px', color: '#6b7280' }}>
                              {trainee.totalPlans} plan{trainee.totalPlans !== 1 ? 's' : ''}
                            </div>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div style={{ marginBottom: '16px' }}>
                          <div
                            style={{
                              width: '100%',
                              height: '10px',
                              background: '#e5e7eb',
                              borderRadius: '5px',
                              overflow: 'hidden',
                            }}
                          >
                            <div
                              style={{
                                width: `${trainee.progressPercentage}%`,
                                height: '100%',
                                background: 'linear-gradient(90deg, #6366f1 0%, #8b5cf6 100%)',
                                transition: 'width 0.3s ease',
                              }}
                            />
                          </div>
                        </div>

                        {/* Module Stats */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                          <div style={{ textAlign: 'center', padding: '10px', background: 'white', borderRadius: '6px' }}>
                            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#6366f1' }}>
                              {trainee.completedModules}
                            </div>
                            <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>
                              Completed
                            </div>
                          </div>
                          <div style={{ textAlign: 'center', padding: '10px', background: 'white', borderRadius: '6px' }}>
                            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#3b82f6' }}>
                              {trainee.inProgressModules}
                            </div>
                            <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>
                              In Progress
                            </div>
                          </div>
                          <div style={{ textAlign: 'center', padding: '10px', background: 'white', borderRadius: '6px' }}>
                            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#9ca3af' }}>
                              {trainee.pendingModules}
                            </div>
                            <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>
                              Pending
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                  <div style={{ fontSize: '48px', marginBottom: '16px' }}>👥</div>
                  <div style={{ fontSize: '16px', fontWeight: '500', marginBottom: '8px' }}>
                    No trainees with training plans yet
                  </div>
                  <div style={{ fontSize: '14px' }}>
                    Create training plans to see progress here
                  </div>
                </div>
              )
            )}
          </div>
        )}

        {/* Course Progress Section - For Admins */}
        {(user.role === 'admin' || user.role === 'superadmin') && !courseProgressLoading && courseProgress && courseProgress.progress && courseProgress.progress.length > 0 && (
          <div
            style={{
              background: 'white',
              borderRadius: '12px',
              padding: '24px',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
              marginBottom: '24px',
            }}
          >
            <h3
              style={{
                fontSize: '20px',
                fontWeight: '600',
                color: '#1f2937',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <span>🎓</span> Course Progress
            </h3>

            <div style={{ display: 'grid', gap: '16px' }}>
              {courseProgress.progress.map((trainee: any) => (
                <div
                  key={trainee.traineeId}
                  style={{
                    padding: '20px',
                    background: '#f9fafb',
                    borderRadius: '8px',
                    border: '1px solid #e5e7eb',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '16px' }}>
                    <div>
                      <div style={{ fontSize: '18px', fontWeight: '600', color: '#1f2937', marginBottom: '4px' }}>
                        {trainee.traineeName}
                      </div>
                      <div style={{ fontSize: '14px', color: '#6b7280' }}>
                        {trainee.traineeEmail}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#6366f1', marginBottom: '4px' }}>
                        {trainee.averageProgress}%
                      </div>
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>
                        {trainee.totalCourses} course{trainee.totalCourses !== 1 ? 's' : ''}
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div
                    style={{
                      width: '100%',
                      height: '8px',
                      background: '#e5e7eb',
                      borderRadius: '4px',
                      overflow: 'hidden',
                      marginBottom: '16px',
                    }}
                  >
                    <div
                      style={{
                        width: `${trainee.averageProgress}%`,
                        height: '100%',
                        background: 'linear-gradient(90deg, #6366f1 0%, #8b5cf6 100%)',
                        transition: 'width 0.3s ease',
                      }}
                    />
                  </div>

                  {/* Course Details */}
                  {trainee.courses && trainee.courses.length > 0 && (
                    <div style={{ display: 'grid', gap: '12px' }}>
                      {trainee.courses.map((course: any, idx: number) => (
                        <div
                          key={idx}
                          style={{
                            padding: '12px',
                            background: 'white',
                            borderRadius: '6px',
                            border: '1px solid #e5e7eb',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <div style={{ fontSize: '14px', fontWeight: '500', color: '#1f2937' }}>
                              Course: {course.courseUid}
                            </div>
                            <div style={{ fontSize: '14px', fontWeight: '600', color: '#6366f1' }}>
                              {course.progress}%
                            </div>
                          </div>
                          <div
                            style={{
                              width: '100%',
                              height: '6px',
                              background: '#e5e7eb',
                              borderRadius: '3px',
                              overflow: 'hidden',
                            }}
                          >
                            <div
                              style={{
                                width: `${course.progress}%`,
                                height: '100%',
                                background: '#6366f1',
                              }}
                            />
                          </div>
                          <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '8px' }}>
                            {course.completedModules} module{course.completedModules !== 1 ? 's' : ''} completed
                            {course.completedAt && (
                              <span style={{ marginLeft: '8px' }}>
                                • Completed on {new Date(course.completedAt).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#6b7280' }}>
            Loading updates...
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '24px' }}>
            {/* What's New Section */}
            <div
              style={{
                background: 'white',
                borderRadius: '12px',
                padding: '24px',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
              }}
            >
              <h3
                style={{
                  fontSize: '20px',
                  fontWeight: '600',
                  color: '#1f2937',
                  marginBottom: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <span>✨</span> What&apos;s New
              </h3>
              {updates?.whatsNew && Array.isArray(updates.whatsNew) ? (
                <div style={{ display: 'grid', gap: '16px' }}>
                  {updates.whatsNew.map((item: any, index: number) => (
                    <div
                      key={index}
                      style={{
                        padding: '16px',
                        background: '#f9fafb',
                        borderRadius: '8px',
                        borderLeft: '4px solid #6366f1',
                      }}
                    >
                      <div
                        style={{
                          fontSize: '16px',
                          fontWeight: '600',
                          color: '#1f2937',
                          marginBottom: '4px',
                        }}
                      >
                        {item.title}
                      </div>
                      <div style={{ fontSize: '14px', color: '#6b7280' }}>
                        {item.description}
                      </div>
                      {item.date && (
                        <div
                          style={{
                            fontSize: '12px',
                            color: '#9ca3af',
                            marginTop: '8px',
                          }}
                        >
                          {new Date(item.date).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ color: '#6b7280', fontSize: '14px' }}>
                  {updates?.whatsNew || 'No updates available at the moment.'}
                </div>
              )}
            </div>

            {/* Recommended Articles */}
            <div
              style={{
                background: 'white',
                borderRadius: '12px',
                padding: '24px',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
              }}
            >
              <h3
                style={{
                  fontSize: '20px',
                  fontWeight: '600',
                  color: '#1f2937',
                  marginBottom: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <span>📚</span> Recommended Articles
              </h3>
              {updates?.recommended && Array.isArray(updates.recommended) ? (
                <div style={{ display: 'grid', gap: '12px' }}>
                  {updates.recommended.map((item: any, index: number) => (
                    <div
                      key={index}
                      style={{
                        padding: '16px',
                        background: '#f9fafb',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        border: '1px solid #e5e7eb',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#f3f4f6';
                        e.currentTarget.style.borderColor = '#6366f1';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = '#f9fafb';
                        e.currentTarget.style.borderColor = '#e5e7eb';
                      }}
                    >
                      <div
                        style={{
                          fontSize: '16px',
                          fontWeight: '500',
                          color: '#1f2937',
                          marginBottom: '4px',
                        }}
                      >
                        {item.title}
                      </div>
                      <div style={{ fontSize: '14px', color: '#6b7280' }}>
                        {item.description}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ color: '#6b7280', fontSize: '14px' }}>
                  {updates?.recommended || 'No recommended articles at the moment.'}
                </div>
              )}
            </div>

            {updates?.lastUpdated && (
              <div style={{ textAlign: 'center', color: '#9ca3af', fontSize: '12px' }}>
                Last updated: {new Date(updates.lastUpdated).toLocaleString()}
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}

