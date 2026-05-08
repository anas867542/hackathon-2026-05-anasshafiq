'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

// ── Icons ──────────────────────────────────────────────────────────────────────
function HomeIcon({ filled }: { filled?: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={filled ? 0 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H5a1 1 0 01-1-1V9.5z" />
      <path d="M9 21V12h6v9" />
    </svg>
  );
}

function TruckIcon({ filled }: { filled?: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={filled ? 0 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="3" width="15" height="13" rx="1" />
      <path d="M16 8h4l3 4v5h-7V8z" />
      <circle cx="5.5" cy="18.5" r="2.5" />
      <circle cx="18.5" cy="18.5" r="2.5" />
    </svg>
  );
}

function DashboardIcon({ filled }: { filled?: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={filled ? 0 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="9" rx="1" />
      <rect x="14" y="3" width="7" height="5" rx="1" />
      <rect x="14" y="12" width="7" height="9" rx="1" />
      <rect x="3" y="16" width="7" height="5" rx="1" />
    </svg>
  );
}

// ── Config ────────────────────────────────────────────────────────────────────
interface NavItem {
  href:     string;
  label:    string;
  featured?: boolean;
  icon:     (filled: boolean) => React.ReactNode;
}

const CUSTOMER_NAV: NavItem[] = [
  { href: '/dashboard', label: 'Home',  icon: (f) => <HomeIcon  filled={f} /> },
  { href: '/book',      label: 'Book',  icon: (f) => <TruckIcon filled={f} />, featured: true },
];

const DRIVER_NAV: NavItem[] = [
  { href: '/driver/dashboard', label: 'Dashboard', icon: (f) => <DashboardIcon filled={f} /> },
];

interface Props {
  role: 'customer' | 'driver';
}

export function BottomNav({ role }: Props) {
  const pathname = usePathname();
  const items    = role === 'customer' ? CUSTOMER_NAV : DRIVER_NAV;

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 border-t border-gray-100 bg-white/95 backdrop-blur-md md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex items-center h-16">
        {items.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== '/' && pathname?.startsWith(item.href + '/'));

          if (item.featured) {
            return (
              <Link
                key={item.href}
                href={item.href as any} // eslint-disable-line @typescript-eslint/no-explicit-any
                className="flex flex-1 flex-col items-center gap-1"
              >
                <span
                  className={cn(
                    'flex items-center justify-center size-12 rounded-2xl shadow-soft transition-all active:scale-95',
                    active
                      ? 'bg-brand-700 shadow-glow'
                      : 'bg-brand-600',
                  )}
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.2} strokeLinecap="round">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                </span>
                <span className={cn('text-[10px] font-semibold', active ? 'text-brand-600' : 'text-gray-400')}>
                  {item.label}
                </span>
              </Link>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href as any} // eslint-disable-line @typescript-eslint/no-explicit-any
              className={cn(
                'flex flex-1 flex-col items-center gap-1 py-2 px-3 transition-colors',
                active ? 'text-brand-600' : 'text-gray-400 hover:text-gray-600',
              )}
            >
              {item.icon(active)}
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
