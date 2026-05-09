'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

export function Header() {
  const pathname  = usePathname();
  const router    = useRouter();
  const { user, isAuthenticated, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  useEffect(() => {
    if (!mobileOpen) return;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  const links = isAuthenticated
    ? user?.role === 'driver'
      ? [{ href: '/driver/dashboard', label: 'Dashboard' }]
      : user?.role === 'admin'
      ? [{ href: '/admin/dashboard',  label: 'Admin' }]
      : [
          { href: '/dashboard', label: 'Dashboard' },
          { href: '/book',      label: 'Book a truck' },
        ]
    : [];

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-gray-100 dark:border-gray-800 bg-white/95 dark:bg-gray-950/95 backdrop-blur-md">
        <div className="container-page flex h-16 items-center justify-between">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 font-bold text-gray-900 dark:text-white text-base tracking-tight">
            <span className="grid size-8 place-items-center rounded-xl bg-brand-600 text-sm font-bold text-white shadow-glow">
              T
            </span>
            <span className="hidden sm:block">TranspoLink</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-1 md:flex">
            {links.map((l) => {
              const active = pathname?.startsWith(l.href);
              return (
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                <Link key={l.href} href={l.href as any}
                  className={cn(
                    'rounded-full px-4 py-2 text-sm font-medium transition-colors',
                    active
                      ? 'bg-brand-50 dark:bg-brand-950/60 text-brand-700 dark:text-brand-400'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white',
                  )}
                >
                  {l.label}
                </Link>
              );
            })}
          </nav>

          {/* Desktop actions */}
          <div className="hidden items-center gap-2 md:flex">
            {/* Dark mode toggle */}
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="grid size-9 place-items-center rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label="Toggle dark mode"
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>

            {isAuthenticated ? (
              <>
                <span className="text-sm text-gray-400 dark:text-gray-500 truncate max-w-[180px]">{user?.email}</span>
                <Button size="sm" variant="secondary"
                  onClick={() => { logout(); router.push('/'); }}
                >
                  Sign out
                </Button>
              </>
            ) : (
              <>
                <Link href="/login">
                  <Button size="sm" variant="ghost">Sign in</Button>
                </Link>
                <Link href="/register">
                  <Button size="sm" variant="brand">Get started</Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen((v) => !v)}
            className="grid size-9 place-items-center rounded-full text-gray-600 dark:text-gray-400 transition hover:bg-gray-100 dark:hover:bg-gray-800 md:hidden"
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          >
            {mobileOpen ? (
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="3" y1="3" x2="15" y2="15" /><line x1="15" y1="3" x2="3" y2="15" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="3" y1="5" x2="15" y2="5" /><line x1="3" y1="9" x2="15" y2="9" /><line x1="3" y1="13" x2="15" y2="13" />
              </svg>
            )}
          </button>
        </div>
      </header>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-black/20 dark:bg-black/50 animate-fade-in"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute inset-x-0 top-16 animate-slide-down bg-white dark:bg-gray-950 border-b border-gray-100 dark:border-gray-800 shadow-card">
            <nav className="container-page flex flex-col gap-1 py-4">
              {links.map((l) => {
                const active = pathname?.startsWith(l.href);
                return (
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  <Link key={l.href} href={l.href as any}
                    className={cn(
                      'rounded-2xl px-4 py-3 text-sm font-medium transition-colors',
                      active
                        ? 'bg-brand-50 dark:bg-brand-950/60 text-brand-700 dark:text-brand-400'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-900 hover:text-gray-900 dark:hover:text-white',
                    )}
                  >
                    {l.label}
                  </Link>
                );
              })}

              <div className="mt-2 border-t border-gray-100 dark:border-gray-800 pt-3">
                <div className="flex items-center gap-2 px-1 mb-2">
                  <button
                    onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                    className="flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors w-full"
                  >
                    {theme === 'dark' ? '☀️' : '🌙'}
                    <span>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
                  </button>
                </div>
                {isAuthenticated ? (
                  <div className="flex items-center justify-between px-1">
                    <span className="text-xs text-gray-400 dark:text-gray-500 px-3 truncate">{user?.email}</span>
                    <Button size="sm" variant="secondary"
                      onClick={() => { logout(); router.push('/'); }}
                    >
                      Sign out
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 px-1">
                    <Link href="/login">
                      <Button size="md" variant="secondary" className="w-full">Sign in</Button>
                    </Link>
                    <Link href="/register">
                      <Button size="md" variant="brand" className="w-full">Get started</Button>
                    </Link>
                  </div>
                )}
              </div>
            </nav>
          </div>
        </div>
      )}
    </>
  );
}
