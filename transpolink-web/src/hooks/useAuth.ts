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
    const onChange = () => setUser(session.getUser());
    window.addEventListener('tl:session', onChange);
    window.addEventListener('storage', onChange);
    return () => {
      window.removeEventListener('tl:session', onChange);
      window.removeEventListener('storage', onChange);
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
