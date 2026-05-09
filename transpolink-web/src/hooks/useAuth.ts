'use client';

import { useEffect, useState, useCallback } from 'react';
import { session, SessionUser } from '@/lib/auth/session';
import { authApi } from '@/lib/api/auth';

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

  useEffect(() => {
    setUser(session.getUser());
    setHydrated(true);

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
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await authApi.login(email, password);
    session.set(res);
    setUser(res.user);
    return res.user;
  }, []);

  const register = useCallback(async (input: RegisterInput) => {
    const res = await authApi.register(input);
    session.set(res);
    setUser(res.user);
    return res.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      /* ignore */
    }
    session.clear();
    setUser(null);
  }, []);

  return {
    user,
    isAuthenticated: !!user,
    hydrated,
    login,
    register,
    logout,
  };
}
