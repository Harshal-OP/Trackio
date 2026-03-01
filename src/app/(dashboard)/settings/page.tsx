'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiRequest } from '@/lib/client-api';
import { useSession } from '@/components/SessionProvider';
import { useToast } from '@/components/ui/Toast';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { SUPPORTED_CURRENCIES, normalizeCurrencyCode } from '@/lib/currency';
import { UserProfile } from '@/lib/types';

export default function SettingsPage() {
  const router = useRouter();
  const { user, setUser, refreshSession, logout } = useSession();
  const { showToast } = useToast();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [notifications, setNotifications] = useState({
    subscriptionDue: true,
    budgetAlerts: true,
    weeklySummary: false,
    emailNotifications: false,
  });

  const [showDeleteData, setShowDeleteData] = useState(false);
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);

  useEffect(() => {
    if (!user) return;
    setName(user.name);
    setEmail(user.email);
    setCurrency(normalizeCurrencyCode(user.settings.currency));
    setNotifications(user.settings.notifications);
  }, [user]);

  const saveProfile = async () => {
    try {
      const response = await apiRequest<{ user: UserProfile }>('/api/users/me', {
        method: 'PUT',
        body: JSON.stringify({
          name,
          settings: {
            currency,
            notifications,
          },
        }),
      });

      if (response.user) {
        setUser(response.user);
      }
      showToast('Settings saved', 'success');
      await refreshSession();
    } catch {
      showToast('Failed to save settings', 'error');
    }
  };

  const deleteAllData = async () => {
    try {
      await apiRequest('/api/users/me/data', { method: 'DELETE' });
      showToast('All account data deleted', 'success');
      setShowDeleteData(false);
      router.replace('/');
      await refreshSession();
    } catch {
      showToast('Failed to delete data', 'error');
    }
  };

  const deleteAccount = async () => {
    try {
      await apiRequest('/api/users/me', { method: 'DELETE' });
      await logout();
      showToast('Account deleted', 'success');
      setShowDeleteAccount(false);
      router.replace('/register');
    } catch {
      showToast('Failed to delete account', 'error');
    }
  };

  return (
    <div className="flex flex-col gap-8 animate-fade-in max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-[var(--muted)] text-sm mt-1">Manage your account and preferences.</p>
      </div>

      <div className="stat-card">
        <h3 className="font-semibold text-lg mb-4">Profile</h3>
        <div className="flex items-center gap-4 mb-6">
          <div className="size-16 rounded-full bg-primary/20 flex items-center justify-center text-primary text-2xl font-bold">
            {(name || 'A').charAt(0).toUpperCase()}
          </div>
          <div>
            <h4 className="font-semibold text-lg">{name || 'User'}</h4>
            <p className="text-sm text-[var(--muted)]">{email || user?.email}</p>
            <span className="badge bg-primary/10 text-primary border border-primary/20 mt-1">{user?.plan || 'free'} plan</span>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-[var(--muted)] mb-1">Name</label>
            <input
              type="text"
              className="w-full px-4 py-2.5 rounded-lg bg-[var(--background)] border border-[var(--border)] focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--muted)] mb-1">Email</label>
            <input
              type="email"
              className="w-full px-4 py-2.5 rounded-lg bg-[var(--background)] border border-[var(--border)] text-sm"
              value={email}
              disabled
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--muted)] mb-1">Currency</label>
            <select
              className="w-full px-4 py-2.5 rounded-lg bg-[var(--background)] border border-[var(--border)] focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
              value={currency}
              onChange={(event) => setCurrency(event.target.value)}
            >
              {SUPPORTED_CURRENCIES.map((item) => (
                <option key={item.code} value={item.code}>
                  {item.code} · {item.label} ({item.symbol})
                </option>
              ))}
            </select>
          </div>
        </div>
        <button className="btn-primary mt-4" onClick={() => void saveProfile()}>
          Save Changes
        </button>
      </div>

      <div className="stat-card">
        <h3 className="font-semibold text-lg mb-4">Notifications</h3>
        <div className="space-y-4">
          {[
            { key: 'subscriptionDue', label: 'Subscription due reminders', desc: 'Get notified before payments are due' },
            { key: 'budgetAlerts', label: 'Budget alerts', desc: 'Alert when spending exceeds 80% of budget' },
            { key: 'weeklySummary', label: 'Weekly summary', desc: 'Receive a weekly spending summary' },
            { key: 'emailNotifications', label: 'Email notifications', desc: 'Receive notifications via email' },
          ].map((item) => (
            <label key={item.key} className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={Boolean(notifications[item.key as keyof typeof notifications])}
                onChange={(event) =>
                  setNotifications((current) => ({
                    ...current,
                    [item.key]: event.target.checked,
                  }))
                }
                className="mt-0.5 size-4 rounded border-[var(--border)] bg-transparent text-primary focus:ring-primary/50"
              />
              <div>
                <p className="text-sm font-medium">{item.label}</p>
                <p className="text-xs text-[var(--muted)]">{item.desc}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      <div className="stat-card border-rose-500/20">
        <h3 className="font-semibold text-lg mb-2 text-rose-400">Danger Zone</h3>
        <p className="text-sm text-[var(--muted)] mb-4">Irreversible actions.</p>
        <div className="flex gap-3">
          <button
            className="px-4 py-2 rounded-lg border border-rose-500/30 text-rose-400 text-sm font-medium hover:bg-rose-500/10 transition-colors"
            onClick={() => setShowDeleteData(true)}
          >
            Delete All Data
          </button>
          <button
            className="px-4 py-2 rounded-lg border border-rose-500/30 text-rose-400 text-sm font-medium hover:bg-rose-500/10 transition-colors"
            onClick={() => setShowDeleteAccount(true)}
          >
            Delete Account
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={showDeleteData}
        title="Delete All Data"
        message="This deletes transactions, budgets, subscriptions, and split data but keeps your account."
        confirmText="Delete Data"
        danger
        onCancel={() => setShowDeleteData(false)}
        onConfirm={() => void deleteAllData()}
      />

      <ConfirmDialog
        open={showDeleteAccount}
        title="Delete Account"
        message="This permanently deletes your account and all associated data."
        confirmText="Delete Account"
        danger
        onCancel={() => setShowDeleteAccount(false)}
        onConfirm={() => void deleteAccount()}
      />
    </div>
  );
}
