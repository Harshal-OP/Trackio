'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { apiRequest, ApiClientError } from '@/lib/client-api';
import { useSession } from '@/components/SessionProvider';

export default function LoginPage() {
  const router = useRouter();
  const { refreshSession } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      await apiRequest('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      await refreshSession();
      router.replace('/');
    } catch (requestError) {
      if (requestError instanceof ApiClientError) setError(requestError.message);
      else setError('Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in">
      {/* Brand */}
      <div className="flex items-center gap-2.5 mb-8">
        <div className="w-9 h-9 rounded-lg bg-primary/15 flex items-center justify-center">
          <span className="material-symbols-outlined text-primary text-[20px]">account_balance_wallet</span>
        </div>
        <span className="font-bold text-lg text-[var(--foreground)]">Trakio</span>
      </div>

      {/* Heading */}
      <h1 className="text-3xl font-bold text-[var(--foreground)] tracking-tight">Welcome back</h1>
      <p className="mt-2 text-[var(--muted)] text-sm">Sign in to continue managing your finances.</p>

      <form className="mt-8 space-y-5" onSubmit={onSubmit}>
        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-[var(--muted)] mb-1.5">Email Address</label>
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)] text-[18px]">
              mail
            </span>
            <input
              type="email"
              autoComplete="email"
              placeholder="name@company.com"
              className="auth-input pl-10"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
        </div>

        {/* Password */}
        <div>
          <label className="block text-sm font-medium text-[var(--muted)] mb-1.5">Password</label>
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)] text-[18px]">
              lock
            </span>
            <input
              type={showPw ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="••••••••"
              className="auth-input pl-10 pr-10"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
              onClick={() => setShowPw(!showPw)}
              tabIndex={-1}
            >
              <span className="material-symbols-outlined text-[18px]">
                {showPw ? 'visibility' : 'visibility_off'}
              </span>
            </button>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-sm text-rose-400 bg-rose-400/10 border border-rose-400/20 rounded-xl px-4 py-2.5">
            <span className="material-symbols-outlined text-[16px]">error</span>
            {error}
          </div>
        )}

        <button
          type="submit"
          className="btn-primary w-full justify-center py-3 text-base font-semibold"
          disabled={loading}
        >
          {loading ? (
            <>
              <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
              Signing in...
            </>
          ) : (
            <>
              Sign In
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </>
          )}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-[var(--muted)]">
        New here?{' '}
        <Link href="/register" className="text-primary font-medium hover:underline">
          Create account
        </Link>
      </p>
    </div>
  );
}
