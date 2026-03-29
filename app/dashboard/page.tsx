'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

export default function DashboardRootPage() {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    // Redirect to role-specific dashboard
    switch (user.role) {
      case 'admin':
        router.push('/dashboard/admin');
        break;
      case 'manager':
        router.push('/dashboard/manager');
        break;
      default:
        router.push('/dashboard/employee');
        break;
    }
  }, [user, router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  );
}
