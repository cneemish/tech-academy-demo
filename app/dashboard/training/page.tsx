'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import TrainingScheduler from '@/components/TrainingScheduler';

export default function TrainingPage() {
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
    if (parsedUser.role !== 'admin' && parsedUser.role !== 'superadmin') {
      router.push('/dashboard/home');
      return;
    }

    setUser(parsedUser);
  }, [router]);

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <Layout user={user} activePage="training">
      <TrainingScheduler />
    </Layout>
  );
}

