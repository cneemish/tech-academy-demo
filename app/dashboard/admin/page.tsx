'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import InviteUser from '@/components/InviteUser';
import UsersList from '@/components/UsersList';

export default function AdminDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'invite' | 'users'>('invite');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    if (!token || !userData) {
      router.push('/');
      return;
    }

    const parsedUser = JSON.parse(userData);
    if (parsedUser.role !== 'admin' && parsedUser.role !== 'superadmin') {
      router.push('/dashboard/home');
      return;
    }

    setUser(parsedUser);

    // Check URL params for tab
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    if (tab === 'users' || tab === 'invite') {
      setActiveTab(tab);
    }
  }, [router]);

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <Layout user={user} activePage="users">
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div
          style={{
            display: 'flex',
            gap: '20px',
            marginBottom: '30px',
            borderBottom: '2px solid #e5e7eb',
          }}
        >
          <button
            onClick={() => setActiveTab('invite')}
            style={{
              padding: '12px 24px',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'invite' ? '3px solid #6366f1' : '3px solid transparent',
              color: activeTab === 'invite' ? '#6366f1' : '#6b7280',
              fontWeight: activeTab === 'invite' ? '600' : '400',
              cursor: 'pointer',
              fontSize: '16px',
            }}
          >
            Invite User
          </button>
          <button
            onClick={() => setActiveTab('users')}
            style={{
              padding: '12px 24px',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'users' ? '3px solid #6366f1' : '3px solid transparent',
              color: activeTab === 'users' ? '#6366f1' : '#6b7280',
              fontWeight: activeTab === 'users' ? '600' : '400',
              cursor: 'pointer',
              fontSize: '16px',
            }}
          >
            Users
          </button>
        </div>

        {activeTab === 'invite' && <InviteUser />}
        {activeTab === 'users' && <UsersList />}
      </div>
    </Layout>
  );
}

