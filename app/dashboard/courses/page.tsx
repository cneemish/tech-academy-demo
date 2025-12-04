'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/Layout';

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
          All Courses
        </h2>
        <p style={{ fontSize: '16px', color: '#6b7280', marginBottom: '32px' }}>
          Manage and view all available courses
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
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '200px' }}>
              <input
                type="text"
                placeholder="Search courses..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '14px',
                }}
              />
            </div>
            <div style={{ minWidth: '250px' }}>
              <select
                value={selectedTaxonomy}
                onChange={(e) => setSelectedTaxonomy(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '14px',
                  background: 'white',
                  cursor: 'pointer',
                }}
                disabled={taxonomyTerms.length === 0}
              >
                <option value="">
                  {taxonomyTerms.length === 0 ? 'No categories available' : 'All Categories'}
                </option>
                {taxonomyTree.length > 0 ? (
                  // Render hierarchical categories with indentation
                  taxonomyTree.map((term: any) => {
                    const renderTerm = (t: any, level: number = 0): JSX.Element[] => {
                      const indent = '  '.repeat(level);
                      const elements: JSX.Element[] = [
                        <option key={t.uid} value={t.uid}>
                          {indent}{t.name || 'Unnamed Term'}
                        </option>
                      ];
                      
                      // Recursively render children
                      if (t.children && t.children.length > 0) {
                        t.children.forEach((child: any) => {
                          elements.push(...renderTerm(child, level + 1));
                        });
                      }
                      
                      return elements;
                    };
                    
                    return renderTerm(term);
                  })
                ) : (
                  // Fallback to flat list if tree is not available
                  taxonomyTerms.map((term: any) => (
                    <option key={term.uid} value={term.uid}>
                      {term.name || term.title || 'Unnamed Term'}
                    </option>
                  ))
                )}
              </select>
            </div>
            {selectedTaxonomy && (
              <button
                onClick={() => setSelectedTaxonomy('')}
                style={{
                  padding: '12px 20px',
                  background: '#f3f4f6',
                  color: '#6b7280',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '14px',
                  cursor: 'pointer',
                  fontWeight: '500',
                }}
              >
                Clear Filter
              </button>
            )}
          </div>
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
              No courses found
            </div>
            <div style={{ fontSize: '14px', color: '#6b7280' }}>
              {searchTerm || selectedTaxonomy
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
                      {course.course_modules?.length || 0} modules
                    </span>
                    {course.taxonomy && Array.isArray(course.taxonomy) && course.taxonomy.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {course.taxonomy.slice(0, 3).map((taxonomyTerm: any, idx: number) => {
                          // Handle both object and string formats
                          const termUid = typeof taxonomyTerm === 'string' 
                            ? taxonomyTerm 
                            : taxonomyTerm?.uid || taxonomyTerm?.term_uid;
                          const termName = typeof taxonomyTerm === 'string'
                            ? taxonomyTerms.find(t => t.uid === taxonomyTerm)?.name || taxonomyTerm
                            : taxonomyTerm?.name || taxonomyTerm?.title || 'Category';
                          
                          return (
                            <span
                              key={termUid || idx}
                              style={{
                                padding: '4px 8px',
                                background: '#e0e7ff',
                                color: '#6366f1',
                                borderRadius: '4px',
                                fontSize: '11px',
                                fontWeight: '500',
                              }}
                            >
                              {termName}
                            </span>
                          );
                        })}
                        {course.taxonomy.length > 3 && (
                          <span
                            style={{
                              padding: '4px 8px',
                              background: '#f3f4f6',
                              color: '#6b7280',
                              borderRadius: '4px',
                              fontSize: '11px',
                            }}
                          >
                            +{course.taxonomy.length - 3} more
                          </span>
                        )}
                      </div>
                    )}
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

