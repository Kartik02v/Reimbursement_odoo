'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AuthProvider, useAuth } from '@/lib/auth-context';
import { ExpenseProvider } from '@/lib/expense-context';
import { Sidebar } from '@/components/dashboard/sidebar';
import { Spinner } from '@/components/ui/spinner';

function DashboardContent({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, company } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  // If loading or (authenticated and company data isn't synced yet)
  if (isLoading || (isAuthenticated && !company)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Spinner className="w-8 h-8" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <ExpenseProvider>
      <div className="min-h-screen bg-background">
        <Sidebar />
        <main className="pl-64 h-full">{children}</main>
      </div>
    </ExpenseProvider>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <DashboardContent>{children}</DashboardContent>
    </AuthProvider>
  );
}
