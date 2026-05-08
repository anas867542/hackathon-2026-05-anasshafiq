'use client';

const ACCESS_KEY = 'tl.accessToken';
const REFRESH_KEY = 'tl.refreshToken';
const USER_KEY = 'tl.user';

export interface SessionUser {
  id: string;
  email: string;
  role: 'customer' | 'driver' | 'admin';
  driverId?: string | null;
}

export const session = {
  getAccessToken(): string | null {
    if (typeof window === 'undefined') return null;
    return window.localStorage.getItem(ACCESS_KEY);
  },
  getRefreshToken(): string | null {
    if (typeof window === 'undefined') return null;
    return window.localStorage.getItem(REFRESH_KEY);
  },
  getUser(): SessionUser | null {
    if (typeof window === 'undefined') return null;
    const raw = window.localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as SessionUser) : null;
  },
  set({ accessToken, refreshToken, user }: {
    accessToken: string;
    refreshToken: string;
    user: SessionUser;
  }) {
    window.localStorage.setItem(ACCESS_KEY, accessToken);
    window.localStorage.setItem(REFRESH_KEY, refreshToken);
    window.localStorage.setItem(USER_KEY, JSON.stringify(user));
    window.dispatchEvent(new Event('tl:session'));
  },
  clear() {
    window.localStorage.removeItem(ACCESS_KEY);
    window.localStorage.removeItem(REFRESH_KEY);
    window.localStorage.removeItem(USER_KEY);
    window.dispatchEvent(new Event('tl:session'));
  },
};
