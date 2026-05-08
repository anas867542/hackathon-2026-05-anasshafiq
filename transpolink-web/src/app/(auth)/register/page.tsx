'use client';

import { FormEvent, Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/hooks/useAuth';
import { ApiError } from '@/lib/api/client';
import { cn } from '@/lib/utils';

type Role = 'customer' | 'driver';

const ROLES = [
  { value: 'customer' as Role, label: 'I want to ship', icon: '📦' },
  { value: 'driver'   as Role, label: 'I want to drive', icon: '🚛' },
];

function RegisterForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { register } = useAuth();

  const initialRole = (params.get('role') === 'driver' ? 'driver' : 'customer') as Role;
  const [role,       setRole]       = useState<Role>(initialRole);
  const [fullName,   setFullName]   = useState('');
  const [email,      setEmail]      = useState('');
  const [phone,      setPhone]      = useState('');
  const [password,   setPassword]   = useState('');
  const [confirm,    setConfirm]    = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    if (password.length < 8)  { setError('Password must be at least 8 characters.'); return; }
    setSubmitting(true);
    setError(null);
    try {
      const user = await register({ email, phone, password, fullName, role });
      router.replace(user.role === 'driver' ? '/driver/onboarding' : '/dashboard');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Sign-up failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <div className="rounded-3xl border border-gray-100 bg-white p-8 shadow-card">
        <div className="mb-7">
          <h1 className="text-2xl font-bold text-gray-900">Create your account</h1>
          <p className="mt-1 text-sm text-gray-500">Choose how you&apos;ll use the platform.</p>
        </div>

        {/* Role toggle */}
        <div className="mb-6 grid grid-cols-2 gap-1.5 rounded-2xl bg-gray-100 p-1.5">
          {ROLES.map((r) => (
            <button
              key={r.value}
              type="button"
              onClick={() => setRole(r.value)}
              className={cn(
                'flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-150',
                role === r.value
                  ? 'bg-white text-gray-900 shadow-soft'
                  : 'text-gray-500 hover:text-gray-700',
              )}
            >
              <span aria-hidden>{r.icon}</span>
              {r.label}
            </button>
          ))}
        </div>

        {role === 'driver' && (
          <div className="mb-5 rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-xs text-amber-700 animate-slide-up">
            After signup we&apos;ll walk you through driver onboarding — license, truck, and documents.
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-4">
          <Input label="Full name"        value={fullName}  onChange={(e) => setFullName(e.target.value)}  required autoComplete="name"         placeholder="Your full name" />
          <Input label="Email" type="email" value={email}  onChange={(e) => setEmail(e.target.value)}    required autoComplete="email"        placeholder="you@example.com" />
          <Input label="Phone" type="tel"  value={phone}   onChange={(e) => setPhone(e.target.value)}    required autoComplete="tel"          placeholder="+923000000000" hint="International format (E.164)" />
          <Input label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} required autoComplete="new-password" placeholder="Min. 8 characters" />
          <Input label="Confirm password" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} minLength={8} required autoComplete="new-password" placeholder="Repeat your password" />

          {error && (
            <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700 animate-slide-up">
              {error}
            </div>
          )}

          <Button type="submit" variant="brand" size="lg" className="w-full" isLoading={submitting}>
            {role === 'driver' ? 'Sign up & start onboarding' : 'Create account'}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          Already have an account?{' '}
          <Link href="/login" className="font-semibold text-brand-600 hover:text-brand-700">
            Sign in →
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

export default function RegisterPage() {
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
          <RegisterForm />
        </Suspense>
      </div>
    </main>
  );
}
