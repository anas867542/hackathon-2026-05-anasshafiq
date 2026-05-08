'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import type { SessionUser } from '@/lib/auth/session';

interface Props {
  role?: SessionUser['role'];
  children: React.ReactNode;
}

export function AuthGuard({ role, children }: Props) {
  const router = useRouter();
  const { user, hydrated } = useAuth();

  useEffect(() => {
    if (!hydrated) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    if (role && user.role !== role) {
      if (user.role === 'admin') router.replace('/admin/dashboard');
      else router.replace(user.role === 'driver' ? '/driver/dashboard' : '/dashboard');
    }
  }, [hydrated, user, role, router]);

  if (!hydrated || !user || (role && user.role !== role)) {
    return (
      <div className="container-page py-16 text-sm text-zinc-500">Loading…</div>
    );
  }
  return <>{children}</>;
}
