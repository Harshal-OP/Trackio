'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { apiRequest, ApiClientError } from '@/lib/client-api';
import { useSession } from '@/components/SessionProvider';

function getPasswordStrength(pw: string): { label: string; segments: number; color: string } {
  if (!pw) return { label: '', segments: 0, color: '' };
  let score = 0;
  if (pw.length >= 6) score++;
  if (pw.length >= 10) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 1) return { label: 'Weak', segments: 1, color: '#ef4444' };
  if (score <= 3) return { label: 'Medium', segments: 2, color: '#f59e0b' };
  return { label: 'Strong', segments: 3, color: '#2dd989' };
}

export default function RegisterPage() {
  const router = useRouter();
  const { refreshSession } = useSession();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const strength = useMemo(() => getPasswordStrength(password), [password]);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      await apiRequest('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name, email, password }),
      });
      await refreshSession();
      router.replace('/');
    } catch (requestError) {
      if (requestError instanceof ApiClientError) setError(requestError.message);
      else setError('Registration failed');
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
      <h1 className="text-3xl font-bold text-[var(--foreground)] tracking-tight">Create your account</h1>
      <p className="mt-2 text-[var(--muted)] text-sm">Start tracking your financial future today.</p>

      <form className="mt-8 space-y-5" onSubmit={onSubmit}>
        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-[var(--muted)] mb-1.5">Full Name</label>
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)] text-[18px]">
              person
            </span>
            <input
              type="text"
              autoComplete="name"
              placeholder="Alex Morgan"
              className="auth-input pl-10"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
        </div>

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
              autoComplete="new-password"
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

          {/* Strength bar */}
          {password && (
            <div className="mt-2">
              <div className="flex gap-1.5">
                {[1, 2, 3].map((seg) => (
                  <div
                    key={seg}
                    className="h-1 flex-1 rounded-full transition-all duration-300"
                    style={{
                      backgroundColor: seg <= strength.segments ? strength.color : 'var(--border)',
                    }}
                  />
                ))}
              </div>
              <p className="text-xs mt-1" style={{ color: strength.color }}>
                Strength: {strength.label}
              </p>
            </div>
          )}
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
              Creating account...
            </>
          ) : (
            <>
              Create Account
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </>
          )}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-[var(--muted)]">
        Already have an account?{' '}
        <Link href="/login" className="text-primary font-medium hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
