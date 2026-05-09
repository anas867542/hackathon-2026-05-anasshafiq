'use client';

import { FormEvent, Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { GoogleButton } from '@/components/auth/GoogleButton';
import { useAuth } from '@/hooks/useAuth';
import { ApiError } from '@/lib/api/client';

function LoginForm() {
  const router  = useRouter();
  const params  = useSearchParams();
  const next    = params.get('next') ?? undefined;
  const { login } = useAuth();
  const [email,      setEmail]      = useState('');
  const [password,   setPassword]   = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const user = await login(email, password);
      const fallback =
        user.role === 'driver' ? '/driver/dashboard'
        : user.role === 'admin' ? '/admin/dashboard'
        : '/dashboard';
      router.replace(params.get('next') ?? fallback);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Sign-in failed. Check your credentials.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <div className="rounded-3xl border border-gray-100 bg-white p-8 shadow-card">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Sign in</h1>
          <p className="mt-1 text-sm text-gray-500">Enter your credentials to continue.</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-5">
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            placeholder="you@example.com"
            required
          />
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            placeholder="••••••••"
            required
          />

          {error && (
            <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700 animate-slide-up">
              {error}
            </div>
          )}

          <Button type="submit" variant="brand" size="lg" className="w-full" isLoading={submitting}>
            Sign in
          </Button>
        </form>

        <div className="my-5 flex items-center gap-3">
          <div className="h-px flex-1 bg-gray-100" />
          <span className="text-xs text-gray-400">or</span>
          <div className="h-px flex-1 bg-gray-100" />
        </div>

        <GoogleButton role="customer" next={next} label="Continue with Google" />

        <p className="mt-6 text-center text-sm text-gray-500">
          Don&apos;t have an account?{' '}
          <Link href="/register" className="font-semibold text-brand-600 hover:text-brand-700">
            Create one →
          </Link>
        </p>
      </div>

      <p className="mt-6 text-center">
        <Link href="/" className="text-xs text-gray-400 hover:text-gray-700 transition-colors">
          ← Back to home
        </Link>
      </p>
    </>
  );
}

export default function LoginPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-whisper px-4 py-16">
      <div className="w-full max-w-sm animate-fade-in">
        {/* Logo */}
        <div className="mb-10 flex flex-col items-center gap-3">
          <div className="grid size-14 place-items-center rounded-2xl bg-brand-600 shadow-glow text-2xl font-bold text-white">
            T
          </div>
          <span className="text-lg font-bold text-gray-900">TranspoLink</span>
        </div>

        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}
