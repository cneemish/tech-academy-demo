'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/Layout';

export default function TraineeDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    if (!token || !userData) {
      router.push('/');
      return;
    }

    const parsedUser = JSON.parse(userData);
    if (parsedUser.role !== 'trainee') {
      router.push('/dashboard/admin');
      return;
    }

    setUser(parsedUser);
  }, [router]);

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <Layout user={user} activePage="home">
      <div
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            background: 'white',
            padding: '60px',
            borderRadius: '8px',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          }}
        >
          <h2
            style={{
              fontSize: '32px',
              fontWeight: 'bold',
              color: '#1f2937',
              marginBottom: '20px',
            }}
          >
            Hello Trainee!
          </h2>
          <p style={{ fontSize: '18px', color: '#6b7280' }}>
            Welcome, {user.firstName} {user.lastName}
          </p>
          <p style={{ fontSize: '16px', color: '#9ca3af', marginTop: '10px' }}>
            You can participate in training sessions here.
          </p>
        </div>
      </div>
    </Layout>
  );
}

