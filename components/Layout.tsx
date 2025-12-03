'use client';

import { ReactNode } from 'react';
import { useRouter } from 'next/navigation';

interface LayoutProps {
  children: ReactNode;
  user: any;
  activePage?: string;
}

export default function Layout({ children, user, activePage = 'home' }: LayoutProps) {
  const router = useRouter();

  const navigationItems = [
    { id: 'home', label: 'Home', icon: '🏠', path: '/dashboard/home' },
    { id: 'courses', label: 'Courses', icon: '📚', path: '/dashboard/courses' },
    ...(user?.role === 'admin' || user?.role === 'superadmin'
      ? [
          { id: 'training', label: 'Training Scheduler', icon: '📅', path: '/dashboard/training' },
          { id: 'users', label: 'Users', icon: '👥', path: '/dashboard/admin?tab=users' },
        ]
      : []),
  ];

  const handleNavigation = (path: string) => {
    router.push(path);
  };

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
    router.push('/');
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb', display: 'flex' }}>
      {/* Sidebar */}
      <aside
        style={{
          width: '280px',
          background: 'white',
          boxShadow: '2px 0 4px rgba(0, 0, 0, 0.1)',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* User Profile */}
        <div
          style={{
            marginBottom: '32px',
            paddingBottom: '24px',
            borderBottom: '1px solid #e5e7eb',
          }}
        >
          <div
            style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '24px',
              fontWeight: 'bold',
              marginBottom: '12px',
            }}
          >
            {user?.firstName?.[0]?.toUpperCase() || 'U'}
          </div>
          <div style={{ fontSize: '16px', fontWeight: '600', color: '#1f2937' }}>
            Hi, {user?.firstName || 'User'}
          </div>
          <div style={{ fontSize: '14px', color: '#6b7280', marginTop: '4px' }}>
            {user?.role === 'admin' || user?.role === 'superadmin'
              ? 'Admin'
              : user?.role === 'trainee'
              ? 'Trainee'
              : 'User'}
          </div>
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1 }}>
          {navigationItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNavigation(item.path)}
              style={{
                width: '100%',
                padding: '12px 16px',
                marginBottom: '8px',
                background: activePage === item.id ? '#f3f4f6' : 'transparent',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                fontSize: '15px',
                color: activePage === item.id ? '#6366f1' : '#6b7280',
                fontWeight: activePage === item.id ? '600' : '400',
                transition: 'all 0.2s',
                textAlign: 'left',
              }}
              onMouseEnter={(e) => {
                if (activePage !== item.id) {
                  e.currentTarget.style.background = '#f9fafb';
                }
              }}
              onMouseLeave={(e) => {
                if (activePage !== item.id) {
                  e.currentTarget.style.background = 'transparent';
                }
              }}
            >
              <span style={{ fontSize: '20px' }}>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          style={{
            width: '100%',
            padding: '12px 16px',
            background: '#ef4444',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '15px',
            fontWeight: '500',
            marginTop: 'auto',
          }}
        >
          Logout
        </button>
      </aside>

      {/* Main Content */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <header
          style={{
            background: 'white',
            padding: '20px 32px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            marginBottom: '24px',
          }}
        >
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1f2937' }}>
            Tech Academy
          </h1>
        </header>

        {/* Page Content */}
        <div style={{ flex: 1, padding: '0 32px 32px 32px', overflow: 'auto' }}>
          {children}
        </div>
      </main>
    </div>
  );
}

