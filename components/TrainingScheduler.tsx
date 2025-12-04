'use client';

import { useState, useEffect } from 'react';

interface Trainee {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
}

interface Trainer {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
}

interface CourseModule {
  uid: string;
  title: string;
  module_title?: string;
  description?: string;
  module_number?: number;
  trainer?: {
    title?: string;
    name?: string;
  };
}

interface Course {
  uid: string;
  title: string;
  course_title?: string;
  course_modules?: CourseModule[];
}

interface TrainingModule {
  moduleUid?: string;
  moduleName: string;
  trainerName: string;
  startDate: string;
  endDate: string;
}

export default function TrainingScheduler() {
  const [trainees, setTrainees] = useState<Trainee[]>([]);
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [allModules, setAllModules] = useState<CourseModule[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string>('');
  const [selectedCourseData, setSelectedCourseData] = useState<Course | null>(null);
  const [selectedTrainee, setSelectedTrainee] = useState<string>('');
  const [planName, setPlanName] = useState('');
  const [description, setDescription] = useState('');
  const [modules, setModules] = useState<TrainingModule[]>([
    { moduleName: '', trainerName: '', startDate: '', endDate: '' },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingCourses, setIsLoadingCourses] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetchTrainees();
    fetchTrainers();
    fetchCourses();
    // Don't fetch all modules - we'll use modules from selected course
    
    // Auto-refresh courses every 30 seconds to detect new entries (silent refresh)
    const refreshInterval = setInterval(() => {
      fetchCourses(true); // Silent refresh
      // Also refresh selected course details if a course is selected
      if (selectedCourse) {
        fetchCourseDetails(selectedCourse, true);
      }
    }, 30000); // 30 seconds
    
    // Also refresh when page becomes visible
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
  }, []);

  useEffect(() => {
    if (selectedCourse) {
      fetchCourseDetails(selectedCourse);
      // Reset modules when course changes
      setModules([{ moduleName: '', trainerName: '', startDate: '', endDate: '' }]);
    } else {
      setSelectedCourseData(null);
      setAllModules([]); // Clear modules when no course is selected
      setModules([{ moduleName: '', trainerName: '', startDate: '', endDate: '' }]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCourse]);

  const fetchTrainees = async () => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const response = await fetch('/api/users/trainees', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        setTrainees(data.trainees);
      }
    } catch (error) {
      console.error('Error fetching trainees:', error);
    }
  };

  const fetchTrainers = async () => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const response = await fetch('/api/users/trainers', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        setTrainers(data.trainers);
      }
    } catch (error) {
      console.error('Error fetching trainers:', error);
    }
  };

  const fetchCourses = async (silent = false) => {
    try {
      if (!silent) {
        setIsLoadingCourses(true);
      }
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const response = await fetch('/api/courses', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        const newCourses = data.courses || [];
        // Only update if courses actually changed
        const currentCourseIds = courses.map((c: Course) => c.uid).sort().join(',');
        const newCourseIds = newCourses.map((c: Course) => c.uid).sort().join(',');
        
        if (currentCourseIds !== newCourseIds) {
          setCourses(newCourses);
          // If a course was selected and it still exists, refresh its details
          if (selectedCourse && newCourses.some((c: Course) => c.uid === selectedCourse)) {
            fetchCourseDetails(selectedCourse, true);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching courses:', error);
      // Don't crash - just log the error
    } finally {
      if (!silent) {
        setIsLoadingCourses(false);
      }
    }
  };


  const fetchCourseDetails = async (entryId: string, silent = false) => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const response = await fetch(`/api/courses/entry/${entryId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success && data.course) {
        const previousModuleCount = selectedCourseData?.course_modules?.length || 0;
        setSelectedCourseData(data.course);
        
        // Extract and sort modules from the course's referenced modules
        // The API maps result.reference to course_modules in the response
        const courseModules = (data.course.course_modules || data.course.reference || []).map((module: any) => ({
          ...module,
          uid: module.uid,
          title: module.title || module.module_title || 'Untitled Module',
          description: module.description || module.module_description || '',
          content: module.content || module.module_content || '',
          trainer: module.trainer || {},
          module_number: module.module_number || module.moduleNumber || 0,
        }));
        
        console.log('Course modules extracted:', {
          count: courseModules.length,
          modules: courseModules.map((m: any) => ({ uid: m.uid, title: m.title, module_number: m.module_number })),
        });
        
        // Sort modules by module_number in ascending order
        const sortedModules = courseModules.sort((a: any, b: any) => {
          const numA = Number(a.module_number) || 0;
          const numB = Number(b.module_number) || 0;
          return numA - numB;
        });
        
        // Set the modules for this course
        setAllModules(sortedModules);
        
        // If new modules were added, log it
        if (sortedModules.length > previousModuleCount && previousModuleCount > 0 && !silent) {
          console.log(`New module(s) detected in course! Previous: ${previousModuleCount}, New: ${sortedModules.length}`);
        }
        
        // Auto-fill plan name with course title
        const courseTitle = data.course.title || data.course.course_title || '';
        if (courseTitle && !planName) {
          setPlanName(courseTitle);
        }
      } else {
        console.error('Failed to fetch course details:', data.error, data.details);
        setAllModules([]);
      }
    } catch (error) {
      console.error('Error fetching course details:', error);
      setAllModules([]);
    }
  };

  const addModule = () => {
    setModules([...modules, { moduleName: '', trainerName: '', startDate: '', endDate: '' }]);
  };

  const removeModule = (index: number) => {
    if (modules.length > 1) {
      setModules(modules.filter((_, i) => i !== index));
    }
  };

  const updateModule = (index: number, field: keyof TrainingModule, value: string) => {
    const updated = [...modules];
    updated[index] = { ...updated[index], [field]: value };
    
    // If module is selected from dropdown, auto-fill module name and trainer
    if (field === 'moduleUid' && value) {
      // First try to find in all modules
      const selectedModule = allModules.find((m: CourseModule) => m.uid === value);
      
      // If not found, try in selected course modules
      if (!selectedModule && selectedCourseData) {
        const courseModule = selectedCourseData.course_modules?.find(
          (m: CourseModule) => m.uid === value
        );
        if (courseModule) {
          updated[index].moduleName = courseModule.title || courseModule.module_title || '';
          // Extract trainer name if available
          if (courseModule.trainer) {
            updated[index].trainerName = 
              courseModule.trainer.title || 
              courseModule.trainer.name || 
              '';
          }
        }
      } else if (selectedModule) {
        updated[index].moduleName = selectedModule.title || selectedModule.module_title || '';
        // Extract trainer name if available
        if (selectedModule.trainer) {
          updated[index].trainerName = 
            selectedModule.trainer.title || 
            selectedModule.trainer.name || 
            '';
        }
      }
    }
    
    setModules(updated);
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!selectedCourse) {
      newErrors.course = 'Please select a course';
    }

    if (!planName.trim()) {
      newErrors.planName = 'Training plan name is required';
    }

    if (!selectedTrainee) {
      newErrors.trainee = 'Please select a trainee';
    }

    modules.forEach((module, index) => {
      if (!module.moduleUid && !module.moduleName.trim()) {
        newErrors[`module_${index}_name`] = 'Module is required';
      }
      if (!module.startDate) {
        newErrors[`module_${index}_start`] = 'Start date is required';
      }
      if (!module.endDate) {
        newErrors[`module_${index}_end`] = 'End date is required';
      }
      if (module.startDate && module.endDate && new Date(module.startDate) >= new Date(module.endDate)) {
        newErrors[`module_${index}_dates`] = 'End date must be after start date';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setSuccess(false);

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const response = await fetch('/api/training-plans', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          planName,
          description,
          courseId: selectedCourse,
          courseTitle: selectedCourseData?.title || selectedCourseData?.course_title || planName,
          traineeId: selectedTrainee,
          modules: modules.map((m) => ({
            moduleUid: m.moduleUid,
            moduleName: m.moduleName,
            trainerName: m.trainerName,
            startDate: m.startDate,
            endDate: m.endDate,
          })),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErrors({ general: data.error || 'Failed to create training plan' });
        setIsLoading(false);
        return;
      }

      setSuccess(true);
      setPlanName('');
      setDescription('');
      setSelectedTrainee('');
      setModules([{ moduleName: '', trainerName: '', startDate: '', endDate: '' }]);
      setIsLoading(false);

      setTimeout(() => {
        setSuccess(false);
      }, 5000);
    } catch (error) {
      console.error('Error creating training plan:', error);
      setErrors({ general: 'An error occurred. Please try again.' });
      setIsLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <h2
        style={{
          fontSize: '28px',
          fontWeight: 'bold',
          color: '#1f2937',
          marginBottom: '8px',
        }}
      >
        Training Scheduler
      </h2>
      <p style={{ fontSize: '16px', color: '#6b7280', marginBottom: '32px' }}>
        Create training plans for trainees with multiple modules and schedules
      </p>

      {success && (
        <div
          style={{
            background: '#d1fae5',
            color: '#065f46',
            padding: '16px',
            borderRadius: '8px',
            marginBottom: '24px',
            border: '2px solid #10b981',
          }}
        >
          ✓ Training plan created successfully!
        </div>
      )}

      {errors.general && (
        <div
          style={{
            background: '#fee2e2',
            color: '#dc2626',
            padding: '16px',
            borderRadius: '8px',
            marginBottom: '24px',
          }}
        >
          {errors.general}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div
          style={{
            background: 'white',
            borderRadius: '12px',
            padding: '32px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            marginBottom: '24px',
          }}
        >
          <h3
            style={{
              fontSize: '20px',
              fontWeight: '600',
              color: '#1f2937',
              marginBottom: '24px',
            }}
          >
            Schedule Training
          </h3>

          {/* Course Selection */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label
                htmlFor="course"
                style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#374151',
                }}
              >
                Select Course <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <button
                type="button"
                onClick={() => fetchCourses(false)}
                disabled={isLoadingCourses}
                style={{
                  padding: '6px 12px',
                  background: '#6366f1',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '12px',
                  cursor: isLoadingCourses ? 'not-allowed' : 'pointer',
                  opacity: isLoadingCourses ? 0.6 : 1,
                }}
                title="Refresh courses list"
              >
                {isLoadingCourses ? 'Loading...' : '🔄 Refresh'}
              </button>
            </div>
            <select
              id="course"
              value={selectedCourse}
              onChange={(e) => {
                setSelectedCourse(e.target.value);
                if (errors.course) {
                  setErrors((prev) => ({ ...prev, course: '' }));
                }
              }}
              disabled={isLoadingCourses}
              style={{
                width: '100%',
                padding: '12px',
                border: `1px solid ${errors.course ? '#ef4444' : '#d1d5db'}`,
                borderRadius: '8px',
                fontSize: '14px',
                background: 'white',
                opacity: isLoadingCourses ? 0.6 : 1,
              }}
            >
              <option value="">
                {isLoadingCourses 
                  ? 'Loading courses...' 
                  : courses.length === 0 
                    ? 'No courses available - Click Refresh or create courses in Contentstack'
                    : 'Select a course'}
              </option>
              {courses.map((course) => (
                <option key={course.uid} value={course.uid}>
                  {course.title || course.course_title || 'Untitled Course'}
                </option>
              ))}
            </select>
            {errors.course && (
              <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>
                {errors.course}
              </p>
            )}
            {!isLoadingCourses && courses.length === 0 && (
              <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>
                No courses found. Please create and publish courses in Contentstack, then click Refresh.
              </p>
            )}
          </div>

          {/* Trainee Selection */}
          <div style={{ marginBottom: '24px' }}>
            <label
              htmlFor="trainee"
              style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151',
              }}
            >
              Select Trainee <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <select
              id="trainee"
              value={selectedTrainee}
              onChange={(e) => {
                setSelectedTrainee(e.target.value);
                if (errors.trainee) {
                  setErrors((prev) => ({ ...prev, trainee: '' }));
                }
              }}
              style={{
                width: '100%',
                padding: '12px',
                border: `1px solid ${errors.trainee ? '#ef4444' : '#d1d5db'}`,
                borderRadius: '8px',
                fontSize: '14px',
                background: 'white',
              }}
            >
              <option value="">Select a trainee</option>
              {trainees.map((trainee) => (
                <option key={trainee.userId} value={trainee.userId}>
                  {trainee.firstName} {trainee.lastName} ({trainee.email})
                </option>
              ))}
            </select>
            {errors.trainee && (
              <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>
                {errors.trainee}
              </p>
            )}
          </div>

          {/* Plan Name */}
          <div style={{ marginBottom: '24px' }}>
            <label
              htmlFor="planName"
              style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151',
              }}
            >
              Training Plan Name <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type="text"
              id="planName"
              value={planName}
              onChange={(e) => {
                setPlanName(e.target.value);
                if (errors.planName) {
                  setErrors((prev) => ({ ...prev, planName: '' }));
                }
              }}
              placeholder="e.g., CSE Tier 1 Training Program"
              style={{
                width: '100%',
                padding: '12px',
                border: `1px solid ${errors.planName ? '#ef4444' : '#d1d5db'}`,
                borderRadius: '8px',
                fontSize: '14px',
              }}
            />
            {errors.planName && (
              <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>
                {errors.planName}
              </p>
            )}
          </div>

          {/* Description */}
          <div style={{ marginBottom: '24px' }}>
            <label
              htmlFor="description"
              style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151',
              }}
            >
              Description (Optional)
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add a description for this training plan"
              rows={3}
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px',
                resize: 'vertical',
              }}
            />
          </div>

          {/* Training Modules */}
          <div style={{ marginTop: '32px' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '20px',
              }}
            >
              <div>
                <h4
                  style={{
                    fontSize: '18px',
                    fontWeight: '600',
                    color: '#1f2937',
                    marginBottom: '4px',
                  }}
                >
                  Training Modules
                </h4>
                {selectedCourse && allModules.length > 0 && (
                  <p style={{ fontSize: '12px', color: '#6b7280', fontStyle: 'italic' }}>
                    {allModules.length} module{allModules.length !== 1 ? 's' : ''} available for this course
                  </p>
                )}
                {selectedCourse && allModules.length === 0 && (
                  <p style={{ fontSize: '12px', color: '#ef4444', fontStyle: 'italic' }}>
                    No modules found for this course. Please add modules to the course in Contentstack.
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={addModule}
                style={{
                  padding: '8px 16px',
                  background: '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span>+</span> Add Module
              </button>
            </div>

            {modules.map((module, index) => (
              <div
                key={index}
                style={{
                  background: '#f9fafb',
                  padding: '20px',
                  borderRadius: '8px',
                  marginBottom: '16px',
                  border: '1px solid #e5e7eb',
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
                  <h5 style={{ fontSize: '16px', fontWeight: '600', color: '#1f2937' }}>
                    Module {index + 1}
                  </h5>
                  {modules.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeModule(index)}
                      style={{
                        padding: '6px 12px',
                        background: '#ef4444',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '12px',
                      }}
                    >
                      Remove
                    </button>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                  <div>
                    <label
                      style={{
                        display: 'block',
                        marginBottom: '6px',
                        fontSize: '13px',
                        fontWeight: '500',
                        color: '#374151',
                      }}
                    >
                      Module <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    {allModules.length > 0 ? (
                      <select
                        value={module.moduleUid || ''}
                        onChange={(e) => {
                          updateModule(index, 'moduleUid', e.target.value);
                          if (errors[`module_${index}_name`]) {
                            setErrors((prev) => {
                              const newErrors = { ...prev };
                              delete newErrors[`module_${index}_name`];
                              return newErrors;
                            });
                          }
                        }}
                        style={{
                          width: '100%',
                          padding: '10px',
                          border: `1px solid ${errors[`module_${index}_name`] ? '#ef4444' : '#d1d5db'}`,
                          borderRadius: '6px',
                          fontSize: '14px',
                          background: 'white',
                        }}
                      >
                        <option value="">Select a module</option>
                        {allModules
                          .filter((mod: CourseModule) => {
                            // Don't show already selected modules in other rows
                            const isUsed = modules.some((m, i) => i !== index && m.moduleUid === mod.uid);
                            return !isUsed;
                          })
                          .map((mod: CourseModule) => (
                            <option key={mod.uid} value={mod.uid}>
                              {mod.title || mod.module_title || 'Untitled Module'}
                            </option>
                          ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={module.moduleName}
                        onChange={(e) => {
                          updateModule(index, 'moduleName', e.target.value);
                          if (errors[`module_${index}_name`]) {
                            setErrors((prev) => {
                              const newErrors = { ...prev };
                              delete newErrors[`module_${index}_name`];
                              return newErrors;
                            });
                          }
                        }}
                        placeholder="Enter module name"
                        style={{
                          width: '100%',
                          padding: '10px',
                          border: `1px solid ${errors[`module_${index}_name`] ? '#ef4444' : '#d1d5db'}`,
                          borderRadius: '6px',
                          fontSize: '14px',
                        }}
                      />
                    )}
                    {errors[`module_${index}_name`] && (
                      <p style={{ color: '#ef4444', fontSize: '11px', marginTop: '4px' }}>
                        {errors[`module_${index}_name`]}
                      </p>
                    )}
                    {!selectedCourse && (
                      <p style={{ color: '#6b7280', fontSize: '11px', marginTop: '4px' }}>
                        Please select a course first to see available modules
                      </p>
                    )}
                    {selectedCourse && allModules.length === 0 && (
                      <p style={{ color: '#ef4444', fontSize: '11px', marginTop: '4px' }}>
                        No modules found for this course. Please add modules to the course in Contentstack.
                      </p>
                    )}
                  </div>

                  <div>
                    <label
                      style={{
                        display: 'block',
                        marginBottom: '6px',
                        fontSize: '13px',
                        fontWeight: '500',
                        color: '#374151',
                      }}
                    >
                      Trainer Name
                    </label>
                    <select
                      value={module.trainerName}
                      onChange={(e) => updateModule(index, 'trainerName', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '14px',
                        background: 'white',
                        cursor: 'pointer',
                      }}
                    >
                      <option value="">Select a trainer</option>
                      {trainers.map((trainer) => (
                        <option 
                          key={trainer.userId} 
                          value={`${trainer.firstName} ${trainer.lastName}`}
                        >
                          {trainer.firstName} {trainer.lastName} ({trainer.email})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label
                      style={{
                        display: 'block',
                        marginBottom: '6px',
                        fontSize: '13px',
                        fontWeight: '500',
                        color: '#374151',
                      }}
                    >
                      Start Date <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="date"
                      value={module.startDate}
                      onChange={(e) => {
                        updateModule(index, 'startDate', e.target.value);
                        if (errors[`module_${index}_start`] || errors[`module_${index}_dates`]) {
                          setErrors((prev) => {
                            const newErrors = { ...prev };
                            delete newErrors[`module_${index}_start`];
                            delete newErrors[`module_${index}_dates`];
                            return newErrors;
                          });
                        }
                      }}
                      style={{
                        width: '100%',
                        padding: '10px',
                        border: `1px solid ${errors[`module_${index}_start`] || errors[`module_${index}_dates`] ? '#ef4444' : '#d1d5db'}`,
                        borderRadius: '6px',
                        fontSize: '14px',
                      }}
                    />
                    {errors[`module_${index}_start`] && (
                      <p style={{ color: '#ef4444', fontSize: '11px', marginTop: '4px' }}>
                        {errors[`module_${index}_start`]}
                      </p>
                    )}
                  </div>

                  <div>
                    <label
                      style={{
                        display: 'block',
                        marginBottom: '6px',
                        fontSize: '13px',
                        fontWeight: '500',
                        color: '#374151',
                      }}
                    >
                      End Date <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="date"
                      value={module.endDate}
                      onChange={(e) => {
                        updateModule(index, 'endDate', e.target.value);
                        if (errors[`module_${index}_end`] || errors[`module_${index}_dates`]) {
                          setErrors((prev) => {
                            const newErrors = { ...prev };
                            delete newErrors[`module_${index}_end`];
                            delete newErrors[`module_${index}_dates`];
                            return newErrors;
                          });
                        }
                      }}
                      style={{
                        width: '100%',
                        padding: '10px',
                        border: `1px solid ${errors[`module_${index}_end`] || errors[`module_${index}_dates`] ? '#ef4444' : '#d1d5db'}`,
                        borderRadius: '6px',
                        fontSize: '14px',
                      }}
                    />
                    {errors[`module_${index}_end`] && (
                      <p style={{ color: '#ef4444', fontSize: '11px', marginTop: '4px' }}>
                        {errors[`module_${index}_end`]}
                      </p>
                    )}
                    {errors[`module_${index}_dates`] && (
                      <p style={{ color: '#ef4444', fontSize: '11px', marginTop: '4px' }}>
                        {errors[`module_${index}_dates`]}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: '32px', display: 'flex', gap: '12px' }}>
            <button
              type="submit"
              disabled={isLoading}
              style={{
                padding: '12px 32px',
                background: isLoading ? '#9ca3af' : '#6366f1',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '500',
                cursor: isLoading ? 'not-allowed' : 'pointer',
              }}
            >
              {isLoading ? 'Creating...' : 'Create Training Plan'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

