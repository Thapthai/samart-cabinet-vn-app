'use client';


import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, loading, user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/auth/login');
      return;
    }
    if (!loading && isAuthenticated && pathname.startsWith('/admin')) {
      const isAdmin = (user as { is_admin?: boolean })?.is_admin === true;
      if (!isAdmin) {
        router.replace('/staff/dashboard');
      }
    }
  }, [isAuthenticated, loading, router, pathname, user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (isAuthenticated && pathname.startsWith('/admin')) {
    const isAdmin = (user as { is_admin?: boolean })?.is_admin === true;
    if (!isAdmin) {
      return null;
    }
  }

  return <>{children}</>;
}
