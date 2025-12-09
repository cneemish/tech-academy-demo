'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/Layout';

// Force dynamic rendering - this page requires client-side features
export const dynamic = 'force-dynamic';

export default function CoursesPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [courses, setCourses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTaxonomy, setSelectedTaxonomy] = useState('');
  const [taxonomyTerms, setTaxonomyTerms] = useState<any[]>([]);
  const [taxonomyTree, setTaxonomyTree] = useState<any[]>([]);

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
    fetchTaxonomy();
    fetchCourses();
    
    // Auto-refresh courses every 30 seconds to detect new entries (silent refresh)
    const refreshInterval = setInterval(() => {
      fetchCourses(true); // Silent refresh - no loading indicator
    }, 30000); // 30 seconds
    
    // Also refresh when page becomes visible (user switches back to tab)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchCourses();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      clearInterval(refreshInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  useEffect(() => {
    // Debounce search
    const timer = setTimeout(() => {
      fetchCourses(false); // Show loading for user-initiated searches
    }, 300);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, selectedTaxonomy]);

  const fetchTaxonomy = async () => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      // Use the correct taxonomy UID: "course_module" as per content type
      const response = await fetch(`/api/taxonomy?uid=course_module`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (data.success) {
        // Set both flat list (for filtering) and tree (for display)
        setTaxonomyTerms(data.taxonomy || []);
        setTaxonomyTree(data.taxonomyTree || []);
      } else {
        setTaxonomyTerms([]);
        setTaxonomyTree([]);
      }
    } catch (error) {
      console.error('Error fetching taxonomy:', error);
      setTaxonomyTerms([]);
      setTaxonomyTree([]);
    }
  };

  const fetchCourses = async (silent = false) => {
    try {
      if (!silent) {
        setIsLoading(true);
      }
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (selectedTaxonomy) params.append('taxonomy', selectedTaxonomy);

      const response = await fetch(`/api/courses?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      if (data.success) {
        // Only update if courses actually changed (to avoid unnecessary re-renders)
        const newCourses = data.courses || [];
        const currentCourseIds = courses.map((c: any) => c.uid).sort().join(',');
        const newCourseIds = newCourses.map((c: any) => c.uid).sort().join(',');
        
        if (currentCourseIds !== newCourseIds) {
          setCourses(newCourses);
          // If new courses were added, show a subtle notification
          if (newCourses.length > courses.length && courses.length > 0) {
            console.log(`New course(s) detected! Total: ${newCourses.length}`);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching courses:', error);
      // Don't crash the app - just log the error
      // The UI will continue to show existing courses
    } finally {
      if (!silent) {
        setIsLoading(false);
      }
    }
  };

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <Layout user={user} activePage="courses">
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <h2
          style={{
            fontSize: '28px',
            fontWeight: 'bold',
            color: '#1f2937',
            marginBottom: '8px',
          }}
        >
          {user?.role === 'trainee' ? 'My Assigned Courses' : 'All Courses'}
        </h2>
        <p style={{ fontSize: '16px', color: '#6b7280', marginBottom: '32px' }}>
          {user?.role === 'trainee'
            ? 'View courses assigned to you by your trainer'
            : 'Manage and view all available courses'}
        </p>

        {/* Search and Filter */}
        <div
          style={{
            background: 'white',
            borderRadius: '12px',
            padding: '24px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            marginBottom: '24px',
          }}
        >
          <div style={{ marginBottom: '16px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#1f2937', marginBottom: '4px' }}>
              Search & Filter
            </h3>
            <p style={{ fontSize: '14px', color: '#6b7280' }}>
              Find courses by name or category
            </p>
          </div>
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div style={{ flex: 1, minWidth: '200px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '8px',
                }}
              >
                <span style={{ marginRight: '6px' }}>🔍</span>
                Search Courses
              </label>
              <input
                type="text"
                placeholder="Type to search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '14px',
                  transition: 'all 0.2s',
                  outline: 'none',
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#6366f1';
                  e.target.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.1)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#e5e7eb';
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>
            <div style={{ minWidth: '280px', flex: 1 }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '8px',
                }}
              >
                <span style={{ marginRight: '6px' }}>📂</span>
                Category
              </label>
              <div style={{ position: 'relative' }}>
                <select
                  value={selectedTaxonomy}
                  onChange={(e) => setSelectedTaxonomy(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    paddingRight: '40px',
                    border: selectedTaxonomy ? '2px solid #6366f1' : '2px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '14px',
                    background: 'white',
                    cursor: 'pointer',
                    appearance: 'none',
                    transition: 'all 0.2s',
                    outline: 'none',
                    fontWeight: selectedTaxonomy ? '500' : '400',
                    color: selectedTaxonomy ? '#6366f1' : '#374151',
                  }}
                  disabled={taxonomyTerms.length === 0}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#6366f1';
                    e.target.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = selectedTaxonomy ? '#6366f1' : '#e5e7eb';
                    e.target.style.boxShadow = 'none';
                  }}
                >
                  <option value="" style={{ fontWeight: '500', color: '#6b7280' }}>
                    {taxonomyTerms.length === 0 ? 'No categories available' : '✓ All Categories'}
                  </option>
                  {taxonomyTree.length > 0 ? (
                    // Render hierarchical categories with full path (e.g., "Headless CMS > UI > Content Type")
                    taxonomyTree.map((term: any) => {
                      const renderTerm = (t: any, indent: number = 0): JSX.Element[] => {
                        const elements: JSX.Element[] = [];
                        
                        // Render current term with full path if available, otherwise just name
                        const displayText = t.path || t.name || 'Unnamed Term';
                        const isParent = t.children && t.children.length > 0;
                        const prefix = indent === 0 ? '📁 ' : indent === 1 ? '  ├─ ' : '  │  '.repeat(indent - 1) + '  └─ ';
                        
                        elements.push(
                          <option 
                            key={t.uid} 
                            value={t.uid}
                            style={{
                              fontWeight: indent === 0 ? '600' : indent === 1 ? '500' : '400',
                              color: indent === 0 ? '#6366f1' : indent === 1 ? '#4b5563' : '#6b7280',
                              paddingLeft: `${indent * 8}px`,
                            }}
                          >
                            {prefix}{displayText}
                          </option>
                        );
                        
                        // Recursively render children with indentation
                        if (t.children && t.children.length > 0) {
                          t.children.forEach((child: any) => {
                            elements.push(...renderTerm(child, indent + 1));
                          });
                        }
                        
                        return elements;
                      };
                      
                      return renderTerm(term);
                    })
                  ) : taxonomyTerms.length > 0 ? (
                    // Fallback to flat list with paths if available
                    taxonomyTerms.map((term: any) => (
                      <option key={term.uid} value={term.uid}>
                        {term.path || term.name || term.title || 'Unnamed Term'}
                      </option>
                    ))
                  ) : null}
                </select>
                <div
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    pointerEvents: 'none',
                    color: '#9ca3af',
                    fontSize: '12px',
                  }}
                >
                  ▼
                </div>
              </div>
            </div>
            {selectedTaxonomy && (
              <button
                onClick={() => setSelectedTaxonomy('')}
                style={{
                  padding: '12px 20px',
                  background: 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)',
                  color: '#6b7280',
                  border: '2px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '14px',
                  cursor: 'pointer',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.2s',
                  whiteSpace: 'nowrap',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)';
                  e.currentTarget.style.borderColor = '#ef4444';
                  e.currentTarget.style.color = '#dc2626';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)';
                  e.currentTarget.style.borderColor = '#d1d5db';
                  e.currentTarget.style.color = '#6b7280';
                }}
              >
                <span>✕</span>
                <span>Clear Filter</span>
              </button>
            )}
          </div>
          {selectedTaxonomy && (
            <div
              style={{
                marginTop: '16px',
                padding: '12px 16px',
                background: '#ede9fe',
                borderRadius: '8px',
                border: '1px solid #c7d2fe',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <span style={{ fontSize: '16px' }}>✓</span>
              <span style={{ fontSize: '14px', color: '#6366f1', fontWeight: '500' }}>
                Filtering by: {taxonomyTerms.find((t: any) => t.uid === selectedTaxonomy)?.path || 
                  taxonomyTree.find((t: any) => {
                    const findTerm = (term: any): any => {
                      if (term.uid === selectedTaxonomy) return term;
                      if (term.children) {
                        for (const child of term.children) {
                          const found = findTerm(child);
                          if (found) return found;
                        }
                      }
                      return null;
                    };
                    return findTerm(t);
                  })?.path || 'Selected category'}
              </span>
            </div>
          )}
        </div>

        {/* Courses Grid */}
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#6b7280' }}>
            Loading courses...
          </div>
        ) : courses.length === 0 ? (
          <div
            style={{
              background: 'white',
              borderRadius: '12px',
              padding: '60px',
              textAlign: 'center',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            }}
          >
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📚</div>
            <div style={{ fontSize: '18px', fontWeight: '500', color: '#1f2937', marginBottom: '8px' }}>
              {user?.role === 'trainee' ? 'No courses assigned' : 'No courses found'}
            </div>
            <div style={{ fontSize: '14px', color: '#6b7280' }}>
              {user?.role === 'trainee'
                ? 'Please contact your trainer to assign courses to you.'
                : searchTerm || selectedTaxonomy
                ? 'Try adjusting your search or filters'
                : 'No courses are available at the moment'}
            </div>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: '24px',
            }}
          >
            {courses.map((course: any) => (
              <div
                key={course.uid}
                onClick={() => router.push(`/dashboard/courses/${course.uid}`)}
                style={{
                  background: 'white',
                  borderRadius: '12px',
                  padding: '24px',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  border: '1px solid #e5e7eb',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <div
                  style={{
                    width: '100%',
                    height: '180px',
                    borderRadius: '8px',
                    marginBottom: '16px',
                    overflow: 'hidden',
                    background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '48px',
                    fontWeight: 'bold',
                    position: 'relative',
                  }}
                >
                  {(() => {
                    // Contentstack file field can be an object with url property or a string
                    const thumbnailUrl = 
                      course.course_thumbnail?.url || 
                      (typeof course.course_thumbnail === 'string' ? course.course_thumbnail : null);
                    
                    if (thumbnailUrl) {
                      return (
                        <img
                          src={thumbnailUrl}
                          alt={course.title || 'Course thumbnail'}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            position: 'absolute',
                            top: 0,
                            left: 0,
                          }}
                          onError={(e) => {
                            // Fallback to gradient if image fails to load
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                          }}
                        />
                      );
                    }
                    return course.title?.[0]?.toUpperCase() || '📚';
                  })()}
                </div>
                <h3
                  style={{
                    fontSize: '20px',
                    fontWeight: '600',
                    color: '#1f2937',
                    marginBottom: '8px',
                  }}
                >
                  {course.title || course.course_title || 'Untitled Course'}
                </h3>
                {(course.description || course.course_description) && (
                  <p
                    style={{
                      fontSize: '14px',
                      color: '#6b7280',
                      marginBottom: '16px',
                      display: '-webkit-box',
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {course.description || course.course_description}
                  </p>
                )}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingTop: '16px',
                    borderTop: '1px solid #e5e7eb',
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <span
                      style={{
                        fontSize: '12px',
                        color: '#6b7280',
                      }}
                    >
                      {course.module_count || 0} modules
                    </span>
                  </div>
                  <span
                    style={{
                      padding: '6px 12px',
                      background: '#f3f4f6',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: '500',
                      color: '#6366f1',
                    }}
                  >
                    View Course →
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}

