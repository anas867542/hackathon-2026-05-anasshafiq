import { session } from '@/lib/auth/session';

export class ApiError extends Error {
  constructor(public status: number, message: string, public payload?: unknown) {
    super(message);
  }
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
  /** Internal flag to prevent infinite refresh loops. */
  _retried?: boolean;
}

const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

// ─────────────────────────────────────────────────────────────
// Token refresh — single-flight so parallel 401s share one call.
// refreshBlocked is set after a failed refresh so every subsequent
// 401 in the same page-load short-circuits without hitting the
// server again (avoids an infinite hammer on /auth/refresh).
// ─────────────────────────────────────────────────────────────
let refreshInFlight: Promise<string | null> | null = null;
let refreshBlocked = false;
let refreshBlockedAt = 0;
const REFRESH_BLOCK_TTL_MS = 5 * 60 * 1000; // auto-unblock after 5 minutes

async function refreshAccessToken(): Promise<string | null> {
  if (refreshInFlight) return refreshInFlight;

  const refreshToken = session.getRefreshToken();
  if (!refreshToken) return null;

  refreshInFlight = (async () => {
    try {
      const res = await fetch(`${baseUrl}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      if (!res.ok) return null;
      const data = (await res.json()) as {
        accessToken: string;
        refreshToken: string;
        user: { id: string; email: string; role: 'customer' | 'driver' | 'admin'; driverId?: string | null };
      };
      session.set(data);
      refreshBlocked = false;
      return data.accessToken;
    } catch {
      return null;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

function redirectToLogin() {
  if (typeof window === 'undefined') return;
  if (window.location.pathname.startsWith('/login')) return;
  const next = encodeURIComponent(window.location.pathname + window.location.search);
  window.location.href = `/login?next=${next}`;
}

// ─────────────────────────────────────────────────────────────
export async function api<T = unknown>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { body, query, headers, _retried, ...rest } = opts;

  const url = new URL(`${baseUrl}${path}`);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
    }
  }

  const token = session.getAccessToken();
  const res = await fetch(url.toString(), {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  // 401 → try a single refresh + retry the original request
  if (res.status === 401 && !_retried && !path.startsWith('/auth/')) {
    if (refreshBlocked && Date.now() - refreshBlockedAt < REFRESH_BLOCK_TTL_MS) {
      throw new ApiError(401, 'Session expired. Please sign in again.');
    }
    refreshBlocked = false; // TTL expired — allow one more attempt
    const newToken = await refreshAccessToken();
    if (newToken) {
      return api<T>(path, { ...opts, _retried: true });
    }
    // Refresh failed — block further attempts for TTL, kill local session, redirect
    refreshBlocked = true;
    refreshBlockedAt = Date.now();
    session.clear();
    redirectToLogin();
    throw new ApiError(401, 'Session expired. Please sign in again.');
  }

  let data: unknown = null;
  const text = await res.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!res.ok) {
    const message =
      (data as { error?: { message?: string } })?.error?.message ??
      (data as { message?: string })?.message ??
      res.statusText;
    throw new ApiError(res.status, message, data);
  }

  return data as T;
}
