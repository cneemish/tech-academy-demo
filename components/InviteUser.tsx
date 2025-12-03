'use client';

import { useState, useEffect } from 'react';

interface Role {
  roleId: string;
  roleName: string;
  description: string;
}

export default function InviteUser() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    role: '',
  });
  const [roles, setRoles] = useState<Role[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [createdUser, setCreatedUser] = useState<{
    email: string;
    password: string;
    emailSent: boolean;
  } | null>(null);

  useEffect(() => {
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    try {
      const response = await fetch('/api/roles');
      const data = await response.json();
      if (data.success) {
        setRoles(data.roles);
      }
    } catch (error) {
      console.error('Error fetching roles:', error);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    if (!formData.role) {
      newErrors.role = 'Role is required';
    }

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
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        setErrors({ general: data.error || 'Failed to create user' });
        setIsLoading(false);
        return;
      }

      setSuccess(true);
      setCreatedUser({
        email: data.user.email,
        password: data.generatedPassword,
        emailSent: data.emailSent || false,
      });
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        role: '',
      });
      setIsLoading(false);

      // Clear success message after 10 seconds (longer to allow copying password)
      setTimeout(() => {
        setSuccess(false);
        setCreatedUser(null);
      }, 10000);
    } catch (error) {
      console.error('Error creating user:', error);
      setErrors({ general: 'An error occurred. Please try again.' });
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        background: 'white',
        borderRadius: '8px',
        padding: '30px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
      }}
    >
      <h2
        style={{
          fontSize: '20px',
          fontWeight: 'bold',
          marginBottom: '24px',
          color: '#1f2937',
        }}
      >
        Invite User
      </h2>

      {success && createdUser && (
        <div
          style={{
            background: createdUser.emailSent ? '#d1fae5' : '#fef3c7',
            color: createdUser.emailSent ? '#065f46' : '#92400e',
            padding: '20px',
            borderRadius: '8px',
            marginBottom: '20px',
            border: `2px solid ${createdUser.emailSent ? '#10b981' : '#f59e0b'}`,
          }}
        >
          <div style={{ marginBottom: '12px' }}>
            <strong style={{ fontSize: '16px', display: 'block', marginBottom: '8px' }}>
              {createdUser.emailSent 
                ? '✓ User created and invitation email sent successfully!' 
                : '⚠ User created successfully, but email could not be sent. Please share credentials manually:'}
            </strong>
          </div>
          <div
            style={{
              background: 'white',
              padding: '16px',
              borderRadius: '6px',
              marginTop: '12px',
              border: '1px solid #d1d5db',
            }}
          >
            <div style={{ marginBottom: '12px' }}>
              <strong>Email:</strong>{' '}
              <span style={{ fontFamily: 'monospace', fontSize: '14px' }}>
                {createdUser.email}
              </span>
            </div>
            <div style={{ marginBottom: '12px' }}>
              <strong>Password:</strong>{' '}
              <span
                style={{
                  fontFamily: 'monospace',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  color: '#6366f1',
                  background: '#f3f4f6',
                  padding: '6px 12px',
                  borderRadius: '4px',
                  display: 'inline-block',
                  marginLeft: '8px',
                }}
              >
                {createdUser.password}
              </span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(createdUser.password);
                  alert('Password copied to clipboard!');
                }}
                style={{
                  marginLeft: '12px',
                  padding: '6px 12px',
                  background: '#6366f1',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px',
                }}
              >
                Copy Password
              </button>
            </div>
            {!createdUser.emailSent && (
              <div style={{ marginTop: '12px', fontSize: '13px', color: '#6b7280' }}>
                <strong>Note:</strong> To enable email sending, configure EMAIL_USER and EMAIL_PASS in your .env.local file.
              </div>
            )}
          </div>
        </div>
      )}

      {errors.general && (
        <div
          style={{
            background: '#fee2e2',
            color: '#dc2626',
            padding: '12px',
            borderRadius: '6px',
            marginBottom: '20px',
          }}
        >
          {errors.general}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
          <div>
            <label
              htmlFor="firstName"
              style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151',
              }}
            >
              First Name <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type="text"
              id="firstName"
              name="firstName"
              value={formData.firstName}
              onChange={handleChange}
              style={{
                width: '100%',
                padding: '10px',
                border: `1px solid ${errors.firstName ? '#ef4444' : '#d1d5db'}`,
                borderRadius: '6px',
                fontSize: '14px',
              }}
            />
            {errors.firstName && (
              <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>
                {errors.firstName}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="lastName"
              style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151',
              }}
            >
              Last Name <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type="text"
              id="lastName"
              name="lastName"
              value={formData.lastName}
              onChange={handleChange}
              style={{
                width: '100%',
                padding: '10px',
                border: `1px solid ${errors.lastName ? '#ef4444' : '#d1d5db'}`,
                borderRadius: '6px',
                fontSize: '14px',
              }}
            />
            {errors.lastName && (
              <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>
                {errors.lastName}
              </p>
            )}
          </div>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label
            htmlFor="email"
            style={{
              display: 'block',
              marginBottom: '8px',
              fontSize: '14px',
              fontWeight: '500',
              color: '#374151',
            }}
          >
            Email <span style={{ color: '#ef4444' }}>*</span>
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            style={{
              width: '100%',
              padding: '10px',
              border: `1px solid ${errors.email ? '#ef4444' : '#d1d5db'}`,
              borderRadius: '6px',
              fontSize: '14px',
            }}
          />
          {errors.email && (
            <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>
              {errors.email}
            </p>
          )}
        </div>

        <div style={{ marginBottom: '24px' }}>
          <label
            htmlFor="role"
            style={{
              display: 'block',
              marginBottom: '8px',
              fontSize: '14px',
              fontWeight: '500',
              color: '#374151',
            }}
          >
            Role <span style={{ color: '#ef4444' }}>*</span>
          </label>
          <select
            id="role"
            name="role"
            value={formData.role}
            onChange={handleChange}
            style={{
              width: '100%',
              padding: '10px',
              border: `1px solid ${errors.role ? '#ef4444' : '#d1d5db'}`,
              borderRadius: '6px',
              fontSize: '14px',
              background: 'white',
            }}
          >
            <option value="">Select a role</option>
            {roles.map((role) => (
              <option key={role.roleId} value={role.roleName}>
                {role.roleName} - {role.description}
              </option>
            ))}
          </select>
          {errors.role && (
            <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>
              {errors.role}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={isLoading}
          style={{
            padding: '12px 24px',
            background: isLoading ? '#9ca3af' : '#6366f1',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '16px',
            fontWeight: '500',
            cursor: isLoading ? 'not-allowed' : 'pointer',
          }}
        >
          {isLoading ? 'Creating User...' : 'Invite User'}
        </button>
      </form>
    </div>
  );
}

