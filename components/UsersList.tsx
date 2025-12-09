'use client';

import { useState, useEffect } from 'react';

interface User {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  status: string;
  invitedBy?: string;
  invitedAt?: string;
  lastLoginAt?: string;
}

interface UsersListProps {
  currentUser?: {
    userId: string;
    role: string;
  };
}

export default function UsersList({ currentUser }: UsersListProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      setError(null); // Clear previous errors
      
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      
      if (!token) {
        setError('Authentication token not found. Please log in again.');
        setIsLoading(false);
        return;
      }

      const response = await fetch('/api/users', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      
      if (!response.ok) {
        let errorMessage = data.error || 'Failed to fetch users';
        
        if (response.status === 401) {
          errorMessage = 'Authentication failed. Please log in again.';
        } else if (response.status === 403) {
          errorMessage = 'You do not have permission to view users.';
        }
        
        setError(errorMessage);
        setIsLoading(false);
        return;
      }

      if (data.success) {
        setUsers(data.users || []);
      } else {
        setError('Failed to load users. Please try again.');
      }
    } catch (error: any) {
      console.error('Error fetching users:', error);
      
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        setError('Network error: Could not connect to server. Please check your internet connection.');
      } else {
        setError(`An error occurred while loading users: ${error.message || 'Unknown error'}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const filteredUsers = users.filter(
    (user) =>
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.lastName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleDeleteUser = async (userId: string, userEmail: string) => {
    // Clear previous messages
    setError(null);
    setSuccessMessage(null);

    if (!confirm(`Are you sure you want to delete user "${userEmail}"?\n\nThis action cannot be undone.`)) {
      return;
    }

    setDeletingUserId(userId);
    
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      
      if (!token) {
        setError('Authentication token not found. Please log in again.');
        setDeletingUserId(null);
        return;
      }

      const response = await fetch(`/api/users?userId=${encodeURIComponent(userId)}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle specific error codes
        let errorMessage = data.error || 'Failed to delete user';
        
        switch (data.errorCode) {
          case 'MISSING_PARAMETER':
            errorMessage = 'Invalid request: User ID is missing';
            break;
          case 'USER_NOT_FOUND':
            errorMessage = `User not found. They may have already been deleted.`;
            // Refresh the list to get updated data
            fetchUsers();
            break;
          case 'SELF_DELETE_NOT_ALLOWED':
            errorMessage = 'You cannot delete your own account';
            break;
          case 'DELETE_FAILED':
            errorMessage = 'Failed to delete user. They may have been deleted by another process.';
            // Refresh the list
            fetchUsers();
            break;
          case 'DUPLICATE_KEY':
            errorMessage = 'Duplicate key error. Please refresh and try again.';
            fetchUsers();
            break;
          case 'VALIDATION_ERROR':
            errorMessage = `Validation error: ${data.details || 'Invalid data'}`;
            break;
          case 'INTERNAL_ERROR':
            errorMessage = 'Server error occurred. Please try again later.';
            break;
          default:
            if (response.status === 401) {
              errorMessage = 'Authentication failed. Please log in again.';
            } else if (response.status === 403) {
              errorMessage = 'You do not have permission to delete users. Only superadmins can delete users.';
            } else if (response.status === 404) {
              errorMessage = 'User not found. They may have already been deleted.';
              fetchUsers();
            } else if (response.status === 409) {
              errorMessage = 'Conflict: User may have been modified. Please refresh and try again.';
              fetchUsers();
            }
        }

        setError(errorMessage);
        setDeletingUserId(null);
        return;
      }

      // Success - remove user from list and show success message
      setUsers(users.filter((user) => user.userId !== userId));
      setSuccessMessage(`User "${userEmail}" deleted successfully`);
      
      // Clear success message after 5 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 5000);

    } catch (error: any) {
      console.error('Error deleting user:', error);
      
      // Handle network errors
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        setError('Network error: Could not connect to server. Please check your internet connection and try again.');
      } else {
        setError(`An unexpected error occurred: ${error.message || 'Unknown error'}`);
      }
      
      setDeletingUserId(null);
    }
  };

  // Check if current user is superadmin
  const isSuperAdmin = currentUser?.role === 'superadmin';

  return (
    <div
      style={{
        background: 'white',
        borderRadius: '8px',
        padding: '30px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2
          style={{
            fontSize: '20px',
            fontWeight: 'bold',
            color: '#1f2937',
          }}
        >
          Users
        </h2>
        <input
          type="text"
          placeholder="Search user"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            padding: '10px',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            fontSize: '14px',
            width: '300px',
          }}
        />
      </div>

      {/* Error Message */}
      {error && (
        <div
          style={{
            background: '#fee2e2',
            color: '#dc2626',
            padding: '16px',
            borderRadius: '8px',
            marginBottom: '20px',
            border: '1px solid #fca5a5',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ flex: 1 }}>
            <strong style={{ display: 'block', marginBottom: '4px' }}>Error:</strong>
            <span>{error}</span>
          </div>
          <button
            onClick={() => setError(null)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#dc2626',
              fontSize: '20px',
              cursor: 'pointer',
              padding: '0 8px',
              fontWeight: 'bold',
            }}
            title="Dismiss error"
          >
            ×
          </button>
        </div>
      )}

      {/* Success Message */}
      {successMessage && (
        <div
          style={{
            background: '#d1fae5',
            color: '#065f46',
            padding: '16px',
            borderRadius: '8px',
            marginBottom: '20px',
            border: '1px solid #10b981',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ flex: 1 }}>
            <strong style={{ display: 'block', marginBottom: '4px' }}>Success:</strong>
            <span>{successMessage}</span>
          </div>
          <button
            onClick={() => setSuccessMessage(null)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#065f46',
              fontSize: '20px',
              cursor: 'pointer',
              padding: '0 8px',
              fontWeight: 'bold',
            }}
            title="Dismiss message"
          >
            ×
          </button>
        </div>
      )}

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>Loading users...</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: '600', color: '#374151' }}>
                  Email Address
                </th>
                <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: '600', color: '#374151' }}>
                  First Name
                </th>
                <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: '600', color: '#374151' }}>
                  Last Name
                </th>
                <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: '600', color: '#374151' }}>
                  Status
                </th>
                <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: '600', color: '#374151' }}>
                  Role
                </th>
                <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: '600', color: '#374151' }}>
                  Invited At
                </th>
                <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: '600', color: '#374151' }}>
                  Last Login
                </th>
                {isSuperAdmin && (
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: '600', color: '#374151' }}>
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={isSuperAdmin ? 8 : 7} style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
                    No users found
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr
                    key={user.userId}
                    style={{
                      borderBottom: '1px solid #e5e7eb',
                      transition: 'background-color 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#f9fafb';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'white';
                    }}
                  >
                    <td style={{ padding: '12px', fontSize: '14px', color: '#1f2937' }}>
                      {user.email}
                    </td>
                    <td style={{ padding: '12px', fontSize: '14px', color: '#1f2937' }}>
                      {user.firstName}
                    </td>
                    <td style={{ padding: '12px', fontSize: '14px', color: '#1f2937' }}>
                      {user.lastName}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <span
                        style={{
                          padding: '4px 12px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: '500',
                          background: user.status === 'accepted' ? '#d1fae5' : '#fef3c7',
                          color: user.status === 'accepted' ? '#065f46' : '#92400e',
                        }}
                      >
                        {user.status === 'accepted' ? 'Accepted' : 'Pending'}
                      </span>
                    </td>
                    <td style={{ padding: '12px', fontSize: '14px', color: '#1f2937', textTransform: 'capitalize' }}>
                      {user.role}
                    </td>
                    <td style={{ padding: '12px', fontSize: '14px', color: '#6b7280' }}>
                      {formatDate(user.invitedAt)}
                    </td>
                    <td style={{ padding: '12px', fontSize: '14px', color: '#6b7280' }}>
                      {formatDate(user.lastLoginAt)}
                    </td>
                    {isSuperAdmin && (
                      <td style={{ padding: '12px' }}>
                        <button
                          onClick={() => handleDeleteUser(user.userId, user.email)}
                          disabled={deletingUserId === user.userId || user.userId === currentUser?.userId}
                          style={{
                            padding: '6px 12px',
                            background: deletingUserId === user.userId || user.userId === currentUser?.userId
                              ? '#9ca3af'
                              : '#ef4444',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: '500',
                            cursor: deletingUserId === user.userId || user.userId === currentUser?.userId
                              ? 'not-allowed'
                              : 'pointer',
                            opacity: deletingUserId === user.userId || user.userId === currentUser?.userId ? 0.6 : 1,
                          }}
                          title={user.userId === currentUser?.userId ? 'You cannot delete your own account' : 'Delete user'}
                        >
                          {deletingUserId === user.userId ? 'Deleting...' : 'Delete'}
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

