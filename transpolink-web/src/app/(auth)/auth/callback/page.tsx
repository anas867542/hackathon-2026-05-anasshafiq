'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { session, SessionUser } from '@/lib/auth/session';

function OAuthCallback() {
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    const accessToken  = params.get('accessToken');
    const refreshToken = params.get('refreshToken');
    const userId       = params.get('userId');
    const email        = params.get('email');
    const role         = params.get('role') as SessionUser['role'] | null;
    const driverId     = params.get('driverId');
    const next         = params.get('next');

    if (!accessToken || !refreshToken || !userId || !email || !role) {
      router.replace('/login?error=oauth_failed');
      return;
    }

    session.set({
      accessToken,
      refreshToken,
      user: { id: userId, email, role, driverId: driverId ?? null },
    });

    const fallback =
      role === 'driver' ? '/driver/dashboard'
      : role === 'admin' ? '/admin/dashboard'
      : '/dashboard';

    router.replace(next ? decodeURIComponent(next) : fallback);
  }, [params, router]);

  return (
    <div className="grid min-h-screen place-items-center bg-whisper">
      <div className="flex flex-col items-center gap-4 animate-fade-in">
        <div className="grid size-14 place-items-center rounded-2xl bg-brand-600 shadow-glow text-2xl font-bold text-white">
          T
        </div>
        <p className="text-sm text-gray-500">Signing you in…</p>
        <div className="size-5 rounded-full border-2 border-brand-200 border-t-brand-600 animate-spin" />
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="grid min-h-screen place-items-center bg-whisper">
          <div className="size-5 rounded-full border-2 border-brand-200 border-t-brand-600 animate-spin" />
        </div>
      }
    >
      <OAuthCallback />
    </Suspense>
  );
}
