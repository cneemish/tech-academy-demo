'use client';

import { useState, useEffect } from 'react';

interface Trainee {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
}

interface TrainingModule {
  moduleName: string;
  trainerName: string;
  startDate: string;
  endDate: string;
}

export default function TrainingScheduler() {
  const [trainees, setTrainees] = useState<Trainee[]>([]);
  const [selectedTrainee, setSelectedTrainee] = useState<string>('');
  const [planName, setPlanName] = useState('');
  const [description, setDescription] = useState('');
  const [modules, setModules] = useState<TrainingModule[]>([
    { moduleName: '', trainerName: '', startDate: '', endDate: '' },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetchTrainees();
  }, []);

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
    setModules(updated);
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!planName.trim()) {
      newErrors.planName = 'Training plan name is required';
    }

    if (!selectedTrainee) {
      newErrors.trainee = 'Please select a trainee';
    }

    modules.forEach((module, index) => {
      if (!module.moduleName.trim()) {
        newErrors[`module_${index}_name`] = 'Module name is required';
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
          traineeId: selectedTrainee,
          modules: modules.map((m) => ({
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
              <h4
                style={{
                  fontSize: '18px',
                  fontWeight: '600',
                  color: '#1f2937',
                }}
              >
                Training Modules
              </h4>
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
                      Module Name <span style={{ color: '#ef4444' }}>*</span>
                    </label>
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
                      placeholder="e.g., Introduction to Contentstack"
                      style={{
                        width: '100%',
                        padding: '10px',
                        border: `1px solid ${errors[`module_${index}_name`] ? '#ef4444' : '#d1d5db'}`,
                        borderRadius: '6px',
                        fontSize: '14px',
                      }}
                    />
                    {errors[`module_${index}_name`] && (
                      <p style={{ color: '#ef4444', fontSize: '11px', marginTop: '4px' }}>
                        {errors[`module_${index}_name`]}
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
                    <input
                      type="text"
                      value={module.trainerName}
                      onChange={(e) => updateModule(index, 'trainerName', e.target.value)}
                      placeholder="e.g., John Doe"
                      style={{
                        width: '100%',
                        padding: '10px',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '14px',
                      }}
                    />
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

