'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { apiRequest } from '@/lib/client-api';
import { UserProfile } from '@/lib/types';
import {
  DEFAULT_CURRENCY,
  normalizeCurrencyCode,
  readCachedCurrency,
  writeCachedCurrency,
} from '@/lib/currency';

interface SessionContextValue {
  user: UserProfile | null;
  currency: string;
  loading: boolean;
  refreshSession: () => Promise<void>;
  setUser: (user: UserProfile | null) => void;
  logout: () => Promise<void>;
}

const SessionContext = createContext<SessionContextValue | undefined>(undefined);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [currency, setCurrency] = useState(DEFAULT_CURRENCY);
  const [loading, setLoading] = useState(true);

  const refreshSession = useCallback(async () => {
    try {
      const response = await apiRequest<{ user: UserProfile }>('/api/auth/me');
      const nextCurrency = normalizeCurrencyCode(response.user.settings.currency);
      setUser({
        ...response.user,
        settings: {
          ...response.user.settings,
          currency: nextCurrency,
        },
      });
      setCurrency(nextCurrency);
      writeCachedCurrency(nextCurrency);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setCurrency(readCachedCurrency());
  }, []);

  useEffect(() => {
    if (!user) return;
    const nextCurrency = normalizeCurrencyCode(user.settings.currency);
    if (nextCurrency !== currency) {
      setCurrency(nextCurrency);
    }
    writeCachedCurrency(nextCurrency);
  }, [currency, user]);

  useEffect(() => {
    void refreshSession();
  }, [refreshSession]);

  const logout = useCallback(async () => {
    await apiRequest<{ message: string }>('/api/auth/logout', { method: 'POST' });
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, currency, loading, refreshSession, setUser, logout }),
    [user, currency, loading, refreshSession, logout]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession must be used within SessionProvider');
  }
  return context;
}
