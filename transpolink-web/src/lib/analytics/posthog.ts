import posthog from 'posthog-js';

const POSTHOG_KEY  = process.env.NEXT_PUBLIC_POSTHOG_KEY  ?? '';
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://app.posthog.com';

export function initPostHog() {
  if (typeof window === 'undefined' || !POSTHOG_KEY) return;
  if (posthog.__loaded) return;

  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    person_profiles: 'identified_only',
    capture_pageview: false,        // we handle pageviews manually via PostHogProvider
    capture_pageleave: true,
    autocapture: false,             // keep bundle lean; track explicit events only
    disable_session_recording: false,
    loaded: (ph) => {
      if (process.env.NODE_ENV === 'development') ph.debug();
    },
  });
}

export { posthog };
