'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Layout from '@/components/Layout';

export default function CourseDetailPage() {
  const router = useRouter();
  const params = useParams();
  const courseId = params?.courseId as string;
  const [user, setUser] = useState<any>(null);
  const [course, setCourse] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeModule, setActiveModule] = useState<string | null>(null);

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
    fetchCourse();
  }, [courseId, router]);

  const fetchCourse = async () => {
    try {
      setIsLoading(true);
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const response = await fetch(`/api/courses/${courseId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (data.success) {
        setCourse(data.course);
      }
    } catch (error) {
      console.error('Error fetching course:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
    return <div>Loading...</div>;
  }

  if (isLoading) {
    return (
      <Layout user={user} activePage="courses">
        <div style={{ textAlign: 'center', padding: '60px', color: '#6b7280' }}>
          Loading course...
        </div>
      </Layout>
    );
  }

  if (!course) {
    return (
      <Layout user={user} activePage="courses">
        <div
          style={{
            background: 'white',
            borderRadius: '12px',
            padding: '60px',
            textAlign: 'center',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          }}
        >
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>❌</div>
          <div style={{ fontSize: '18px', fontWeight: '500', color: '#1f2937', marginBottom: '8px' }}>
            Course not found
          </div>
          <button
            onClick={() => router.push('/dashboard/courses')}
            style={{
              marginTop: '16px',
              padding: '12px 24px',
              background: '#6366f1',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
            }}
          >
            Back to Courses
          </button>
        </div>
      </Layout>
    );
  }

  const modules = course.course_modules || [];
  const completedModules = 0; // TODO: Get from training plan progress
  const progress = modules.length > 0 ? Math.round((completedModules / modules.length) * 100) : 0;

  return (
    <Layout user={user} activePage="courses">
      <div style={{ display: 'flex', gap: '24px', maxWidth: '1400px', margin: '0 auto' }}>
        {/* Left Sidebar - Course Navigation */}
        <aside
          style={{
            width: '320px',
            background: 'white',
            borderRadius: '12px',
            padding: '24px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            height: 'fit-content',
            position: 'sticky',
            top: '24px',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '24px',
            }}
          >
            <h3
              style={{
                fontSize: '18px',
                fontWeight: '600',
                color: '#1f2937',
              }}
            >
              {course.title || 'Course'}
            </h3>
            <button
              onClick={() => router.push('/dashboard/courses')}
              style={{
                background: 'transparent',
                border: 'none',
                fontSize: '20px',
                cursor: 'pointer',
                color: '#6b7280',
              }}
            >
              ×
            </button>
          </div>

          {/* Progress */}
          <div style={{ marginBottom: '24px', paddingBottom: '24px', borderBottom: '1px solid #e5e7eb' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '14px', color: '#6b7280' }}>Progress</span>
              <span style={{ fontSize: '14px', fontWeight: '600', color: '#6366f1' }}>
                {progress}%
              </span>
            </div>
            <div
              style={{
                width: '100%',
                height: '8px',
                background: '#e5e7eb',
                borderRadius: '4px',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${progress}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #6366f1 0%, #8b5cf6 100%)',
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
            <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '8px' }}>
              {completedModules} of {modules.length} modules completed
            </div>
          </div>

          {/* Modules List */}
          <div>
            <h4
              style={{
                fontSize: '14px',
                fontWeight: '600',
                color: '#374151',
                marginBottom: '16px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
            >
              Course Modules
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {modules.map((module: any, index: number) => {
                const isCompleted = index < completedModules;
                const isActive = activeModule === module.uid;

                return (
                  <div
                    key={module.uid}
                    onClick={() => setActiveModule(module.uid)}
                    style={{
                      padding: '12px',
                      background: isActive ? '#f3f4f6' : 'transparent',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      border: isActive ? '2px solid #6366f1' : '1px solid #e5e7eb',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.background = '#f9fafb';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.background = 'transparent';
                      }
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div
                        style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          background: isCompleted ? '#10b981' : '#e5e7eb',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: isCompleted ? 'white' : '#6b7280',
                          fontSize: '12px',
                          fontWeight: '600',
                          flexShrink: 0,
                        }}
                      >
                        {isCompleted ? '✓' : index + 1}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div
                          style={{
                            fontSize: '14px',
                            fontWeight: isActive ? '600' : '500',
                            color: '#1f2937',
                            marginBottom: '2px',
                          }}
                        >
                          {module.title || `Module ${index + 1}`}
                        </div>
                        {module.duration && (
                          <div style={{ fontSize: '12px', color: '#9ca3af' }}>
                            {module.duration} min
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main style={{ flex: 1 }}>
          {/* Course Header */}
          <div
            style={{
              background: 'white',
              borderRadius: '12px',
              padding: '32px',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
              marginBottom: '24px',
            }}
          >
            <h1
              style={{
                fontSize: '32px',
                fontWeight: 'bold',
                color: '#1f2937',
                marginBottom: '12px',
              }}
            >
              {course.title || 'Course Title'}
            </h1>
            {course.description && (
              <p style={{ fontSize: '16px', color: '#6b7280', marginBottom: '24px', lineHeight: '1.6' }}>
                {course.description}
              </p>
            )}

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '12px' }}>
              {completedModules === 0 ? (
                <button
                  onClick={() => {
                    if (modules.length > 0) {
                      setActiveModule(modules[0].uid);
                    }
                  }}
                  style={{
                    padding: '14px 28px',
                    background: '#6366f1',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '16px',
                    fontWeight: '500',
                    cursor: 'pointer',
                  }}
                >
                  Start Course
                </button>
              ) : (
                <button
                  onClick={() => {
                    const nextModule = modules[completedModules];
                    if (nextModule) {
                      setActiveModule(nextModule.uid);
                    }
                  }}
                  style={{
                    padding: '14px 28px',
                    background: '#6366f1',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '16px',
                    fontWeight: '500',
                    cursor: 'pointer',
                  }}
                >
                  Resume Course
                </button>
              )}
            </div>
          </div>

          {/* Module Content */}
          {activeModule ? (
            <div
              style={{
                background: 'white',
                borderRadius: '12px',
                padding: '32px',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
              }}
            >
              {(() => {
                const module = modules.find((m: any) => m.uid === activeModule);
                if (!module) return null;

                return (
                  <>
                    <h2
                      style={{
                        fontSize: '24px',
                        fontWeight: '600',
                        color: '#1f2937',
                        marginBottom: '16px',
                      }}
                    >
                      {module.title || 'Module'}
                    </h2>
                    {module.description && (
                      <div
                        style={{
                          fontSize: '16px',
                          color: '#374151',
                          lineHeight: '1.6',
                          marginBottom: '24px',
                        }}
                        dangerouslySetInnerHTML={{ __html: module.description }}
                      />
                    )}
                    {module.content && (
                      <div
                        style={{
                          fontSize: '16px',
                          color: '#374151',
                          lineHeight: '1.6',
                        }}
                        dangerouslySetInnerHTML={{ __html: module.content }}
                      />
                    )}
                  </>
                );
              })()}
            </div>
          ) : (
            <div
              style={{
                background: 'white',
                borderRadius: '12px',
                padding: '60px',
                textAlign: 'center',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
              }}
            >
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>📖</div>
              <div style={{ fontSize: '18px', fontWeight: '500', color: '#1f2937', marginBottom: '8px' }}>
                Select a module to begin
              </div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>
                Choose a module from the sidebar to view its content
              </div>
            </div>
          )}
        </main>
      </div>
    </Layout>
  );
}

