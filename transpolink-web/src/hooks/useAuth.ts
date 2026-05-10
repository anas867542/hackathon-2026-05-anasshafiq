'use client';

import { useEffect, useState, useCallback } from 'react';
import { session, SessionUser } from '@/lib/auth/session';
import { authApi } from '@/lib/api/auth';
import { useAnalytics } from '@/hooks/useAnalytics';

interface RegisterInput {
  email: string;
  phone: string;
  password: string;
  fullName: string;
  role?: 'customer' | 'driver';
}

export function useAuth() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const { track, identify, reset } = useAnalytics();

  useEffect(() => {
    const stored = session.getUser();
    setUser(stored);
    setHydrated(true);

    // Re-identify on hydration so PostHog links the anonymous pre-login events
    // to the known user without firing a new login event.
    if (stored) {
      identify(stored.id, { email: stored.email, role: stored.role });
    }

    // Same-tab session changes (login, logout, token refresh in this tab)
    const onSameTab = () => setUser(session.getUser());

    // Cross-tab storage changes — only react if it's the SAME user or a logout.
    // Ignoring logins from a different user prevents the customer tab's token
    // refresh from overwriting the driver tab's session (and vice versa), which
    // would cause AuthGuard to unmount and reset all React state.
    const onOtherTab = () => {
      const incoming = session.getUser();
      setUser((prev) => {
        if (prev && incoming && prev.id !== incoming.id) return prev;
        return incoming;
      });
    };

    window.addEventListener('tl:session', onSameTab);
    window.addEventListener('storage', onOtherTab);
    return () => {
      window.removeEventListener('tl:session', onSameTab);
      window.removeEventListener('storage', onOtherTab);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const login = useCallback(async (email: string, password: string) => {
    const res = await authApi.login(email, password);
    session.set(res);
    setUser(res.user);
    identify(res.user.id, { email: res.user.email, role: res.user.role });
    track('user_logged_in', { role: res.user.role });
    return res.user;
  }, [identify, track]);

  const register = useCallback(async (input: RegisterInput) => {
    const res = await authApi.register(input);
    session.set(res);
    setUser(res.user);
    identify(res.user.id, { email: res.user.email, role: res.user.role, name: input.fullName, phone: input.phone });
    track('user_signed_up', { role: res.user.role });
    return res.user;
  }, [identify, track]);

  const logout = useCallback(async () => {
    const currentUser = session.getUser();
    try {
      await authApi.logout();
    } catch {
      /* ignore */
    }
    if (currentUser) {
      track('user_logged_out', { role: currentUser.role });
    }
    session.clear();
    setUser(null);
    reset();
  }, [track, reset]);

  return {
    user,
    isAuthenticated: !!user,
    hydrated,
    login,
    register,
    logout,
  };
}
