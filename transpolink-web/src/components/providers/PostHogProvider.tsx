'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { initPostHog, posthog } from '@/lib/analytics/posthog';

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const pathname      = usePathname();
  const searchParams  = useSearchParams();
  const initialized   = useRef(false);

  // Init once on mount
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    initPostHog();
  }, []);

  // Capture a pageview on every route change
  useEffect(() => {
    if (!posthog.__loaded) return;
    const url = pathname + (searchParams.toString() ? `?${searchParams.toString()}` : '');
    posthog.capture('$pageview', { $current_url: url });
  }, [pathname, searchParams]);

  return <>{children}</>;
}
