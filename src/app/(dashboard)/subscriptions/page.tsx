'use client';

import { useMemo, useState, useEffect } from 'react';
import { differenceInDays, format, isToday } from 'date-fns';
import { StatCard } from '@/components/StatCard';
import { SubscriptionData } from '@/lib/types';
import { apiRequest } from '@/lib/client-api';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';
import { ActionMenu } from '@/components/ui/ActionMenu';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';
import { useSession } from '@/components/SessionProvider';
import { formatCurrencyAmount } from '@/lib/currency';
import { PageLoader } from '@/components/ui/PageLoader';
import { SubscriptionLogo } from '@/components/subscriptions/SubscriptionLogo';
import {
  POPULAR_SUBSCRIPTION_LOGOS,
  inferSubscriptionLogoKey,
  resolveSubscriptionLogoKey,
} from '@/lib/subscription-logos';

const defaultForm = {
  name: '',
  amount: '',
  category: 'Other',
  frequency: 'monthly' as 'monthly' | 'weekly' | 'yearly',
  nextDueDate: format(new Date(), 'yyyy-MM-dd'),
  autopay: false,
  logo: '',
  icon: 'credit_card',
  color: '#19e65e',
  notes: '',
};

function getDueLabel(dateStr: string): { text: string; urgent: boolean } {
  const date = new Date(dateStr);
  if (isToday(date)) return { text: 'Due Today', urgent: true };
  const days = differenceInDays(date, new Date());
  if (days < 0) return { text: `${Math.abs(days)}d overdue`, urgent: true };
  return { text: `Due in ${days} days`, urgent: days <= 3 };
}

function getProgressPercent(dateStr: string): number {
  const days = differenceInDays(new Date(dateStr), new Date());
  if (days <= 0) return 100;
  if (days >= 30) return 5;
  return Math.round(((30 - days) / 30) * 100);
}

export default function SubscriptionsPage() {
  const { currency } = useSession();
  const { showToast } = useToast();
  const [subscriptions, setSubscriptions] = useState<SubscriptionData[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState(defaultForm);
  const [submitting, setSubmitting] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const detectedLogoKey = inferSubscriptionLogoKey(form.name);
  const selectedLogoKey = form.logo || detectedLogoKey || '';

  const loadSubscriptions = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiRequest<{ subscriptions: SubscriptionData[] }>('/api/subscriptions');
      setSubscriptions(data.subscriptions);
    } catch {
      setError('Failed to load subscriptions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadSubscriptions();
  }, []);

  const totalMonthlyCost = useMemo(
    () => subscriptions.filter((subscription) => subscription.status === 'active').reduce((sum, subscription) => sum + subscription.amount, 0),
    [subscriptions]
  );

  const activeCount = subscriptions.filter((subscription) => subscription.status === 'active').length;

  const upcoming7Days = subscriptions
    .filter((subscription) => {
      const days = differenceInDays(new Date(subscription.nextDueDate), new Date());
      return days <= 7 && days >= 0;
    })
    .reduce((sum, subscription) => sum + subscription.amount, 0);

  const sortedSubs = [...subscriptions].sort(
    (a, b) => new Date(a.nextDueDate).getTime() - new Date(b.nextDueDate).getTime()
  );

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);

    try {
      await apiRequest<{ subscription: SubscriptionData }>('/api/subscriptions', {
        method: 'POST',
        body: JSON.stringify({
          name: form.name,
          category: form.category,
          amount: Number(form.amount),
          frequency: form.frequency,
          nextDueDate: form.nextDueDate,
          autopay: form.autopay,
          status: 'active',
          logo: selectedLogoKey || undefined,
          icon: form.icon,
          color: form.color,
          notes: form.notes,
        }),
      });
      showToast('Subscription created', 'success');
      setShowAddModal(false);
      setForm(defaultForm);
      void loadSubscriptions();
    } catch {
      showToast('Failed to create subscription', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const updateStatus = async (id: string, status: SubscriptionData['status']) => {
    try {
      await apiRequest<{ subscription: SubscriptionData }>(`/api/subscriptions/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ status }),
      });
      showToast('Subscription updated', 'success');
      void loadSubscriptions();
    } catch {
      showToast('Failed to update subscription', 'error');
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await apiRequest<{ message: string }>(`/api/subscriptions/${deleteId}`, {
        method: 'DELETE',
      });
      showToast('Subscription deleted', 'success');
      setDeleteId(null);
      void loadSubscriptions();
    } catch {
      showToast('Failed to delete subscription', 'error');
    }
  };

  return (
    <div className="flex flex-col gap-8 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Recurring Payments</h1>
          <p className="text-[var(--muted)] text-sm mt-1">Manage monthly subscriptions and fixed expenses.</p>
        </div>
        <div className="flex gap-3">
          <button className="btn-secondary" onClick={() => void loadSubscriptions()}>
            <span className="material-symbols-outlined text-[20px]">refresh</span>
            Refresh
          </button>
          <button onClick={() => setShowAddModal(true)} className="btn-primary">
            <span className="material-symbols-outlined text-[20px]">add</span>
            New Subscription
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard title="Total Monthly Cost" value={formatCurrencyAmount(totalMonthlyCost, currency)} icon="payments" iconColor="text-primary" />
        <StatCard title="Active Subscriptions" value={activeCount.toString()} icon="subscriptions" iconColor="text-blue-500" />
        <StatCard title="Upcoming (7 Days)" value={formatCurrencyAmount(upcoming7Days, currency)} icon="calendar_clock" iconColor="text-amber-500" />
      </div>

      {loading ? (
        <PageLoader title="Loading subscriptions" subtitle="Preparing payment timeline and due dates..." rows={5} />
      ) : error ? (
        <EmptyState
          icon="error"
          title="Unable to load subscriptions"
          description={error}
          action={
            <button className="btn-primary" onClick={() => void loadSubscriptions()}>
              Retry
            </button>
          }
        />
      ) : subscriptions.length === 0 ? (
        <EmptyState
          icon="credit_card"
          title="No subscriptions yet"
          description="Add recurring payments to track upcoming due dates and monthly commitments."
          action={
            <button className="btn-primary" onClick={() => setShowAddModal(true)}>
              <span className="material-symbols-outlined text-[18px]">add</span>
              Add Subscription
            </button>
          }
        />
      ) : (
        <>
          <section className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Payment Timeline</h3>
              <span className="text-sm font-medium text-[var(--muted)]">{format(new Date(), 'MMMM yyyy')}</span>
            </div>
            <div className="stat-card overflow-x-auto">
              <div className="min-w-[700px] flex justify-between items-start relative pb-4">
                <div className="absolute top-[27px] left-0 right-0 h-0.5 bg-[var(--border)] z-0" />

                {sortedSubs.map((subscription) => {
                  const isPast = new Date(subscription.nextDueDate) < new Date() && !isToday(new Date(subscription.nextDueDate));
                  const isCurrent = isToday(new Date(subscription.nextDueDate));
                  const resolvedLogoKey = resolveSubscriptionLogoKey(subscription.logo, subscription.name);
                  return (
                    <div key={subscription._id} className={`flex flex-col items-center gap-3 relative z-10 w-24 ${isPast ? 'opacity-50 grayscale' : ''}`}>
                      <p className={`text-xs font-medium ${isCurrent ? 'text-primary font-bold' : 'text-slate-500'}`}>
                        {isCurrent ? 'Today' : format(new Date(subscription.nextDueDate), 'MMM d')}
                      </p>
                      <div
                        className={`w-3.5 h-3.5 rounded-full ring-4 ${
                          isCurrent
                            ? 'bg-primary ring-primary/20 shadow-[0_0_10px_rgba(25,230,94,0.5)]'
                            : isPast
                              ? 'bg-slate-300 dark:bg-slate-600 ring-[var(--surface)]'
                              : 'bg-slate-200 dark:bg-slate-700 border-2 border-slate-300 dark:border-slate-500 ring-[var(--surface)]'
                        }`}
                      />
                      <div className="flex flex-col items-center text-center mt-1">
                        <SubscriptionLogo
                          logoKey={resolvedLogoKey}
                          fallbackIcon={subscription.icon}
                          fallbackColor={subscription.color}
                          shape="circle"
                          className="mb-2 h-10 w-10"
                        />
                        <span className="text-xs font-semibold">{subscription.name}</span>
                        <span className="text-[10px] text-[var(--muted)]">{formatCurrencyAmount(subscription.amount, currency)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          <section className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">All Subscriptions</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {subscriptions.map((subscription) => {
                const due = getDueLabel(subscription.nextDueDate);
                const progress = getProgressPercent(subscription.nextDueDate);
                const resolvedLogoKey = resolveSubscriptionLogoKey(subscription.logo, subscription.name);

                return (
                  <div key={subscription._id} className="stat-card hover:border-primary/50 cursor-pointer flex flex-col justify-between h-[220px] group">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <SubscriptionLogo
                          logoKey={resolvedLogoKey}
                          fallbackIcon={subscription.icon}
                          fallbackColor={subscription.color}
                          className="h-10 w-10"
                        />
                        <div>
                          <h4 className="font-bold">{subscription.name}</h4>
                          <p className="text-xs text-[var(--muted)]">{subscription.category}</p>
                        </div>
                      </div>
                      <ActionMenu
                        items={[
                          {
                            label: 'Pause',
                            onClick: () => void updateStatus(subscription._id, 'paused'),
                          },
                          {
                            label: 'Activate',
                            onClick: () => void updateStatus(subscription._id, 'active'),
                          },
                          {
                            label: 'Cancel',
                            onClick: () => void updateStatus(subscription._id, 'cancelled'),
                          },
                          {
                            label: 'Delete',
                            danger: true,
                            onClick: () => setDeleteId(subscription._id),
                          },
                        ]}
                      />
                    </div>
                    <div className="mt-4">
                      <p className={`text-xs font-medium mb-1 ${due.urgent ? 'text-primary' : 'text-[var(--muted)]'}`}>{due.text}</p>
                      <h3 className="text-2xl font-bold">
                        {formatCurrencyAmount(subscription.amount, currency)}
                        <span className="text-sm font-normal text-slate-500 ml-1">/{subscription.frequency === 'monthly' ? 'mo' : subscription.frequency === 'yearly' ? 'yr' : 'wk'}</span>
                      </h3>
                      <div className="w-full bg-slate-100 dark:bg-black/40 h-1.5 rounded-full mt-4 overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${progress}%`, backgroundColor: subscription.color }} />
                      </div>
                      <p className="text-[10px] text-[var(--muted)] mt-2 text-right">{subscription.autopay ? 'Autopay enabled' : 'Manual payment'}</p>
                    </div>
                  </div>
                );
              })}

              <button
                onClick={() => setShowAddModal(true)}
                className="bg-[var(--surface)]/40 border border-dashed border-[var(--border)] rounded-xl p-5 hover:border-primary hover:bg-[var(--surface)] transition-all cursor-pointer flex flex-col justify-center items-center h-[220px] text-[var(--muted)] hover:text-primary"
              >
                <span className="material-symbols-outlined text-4xl mb-2">add_circle</span>
                <p className="font-medium">Add New Subscription</p>
              </button>
            </div>
          </section>
        </>
      )}

      <Modal open={showAddModal} onClose={() => setShowAddModal(false)} title="Add Subscription">
        <form className="space-y-4" onSubmit={handleCreate}>
          <div>
            <label className="block text-sm font-medium text-[var(--muted)] mb-1">Name</label>
            <input
              type="text"
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2.5"
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--muted)] mb-1">Amount</label>
              <input
                type="number"
                step="0.01"
                min="0"
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2.5"
                value={form.amount}
                onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--muted)] mb-1">Frequency</label>
              <select
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2.5"
                value={form.frequency}
                onChange={(event) => setForm((current) => ({ ...current, frequency: event.target.value as 'monthly' | 'weekly' | 'yearly' }))}
              >
                <option value="monthly">Monthly</option>
                <option value="weekly">Weekly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--muted)] mb-1">Category</label>
              <input
                type="text"
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2.5"
                value={form.category}
                onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--muted)] mb-1">Next Due Date</label>
              <input
                type="date"
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2.5"
                value={form.nextDueDate}
                onChange={(event) => setForm((current) => ({ ...current, nextDueDate: event.target.value }))}
                required
              />
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="block text-sm font-medium text-[var(--muted)]">Popular Logo</label>
              <button
                type="button"
                className="text-xs text-primary hover:underline"
                onClick={() => setForm((current) => ({ ...current, logo: '' }))}
              >
                Auto-detect
              </button>
            </div>
            <div className="grid max-h-40 grid-cols-4 gap-2 overflow-y-auto rounded-lg border border-[var(--border)] bg-[var(--background)] p-2">
              {POPULAR_SUBSCRIPTION_LOGOS.map((logo) => {
                const active = selectedLogoKey === logo.key;
                return (
                  <button
                    key={logo.key}
                    type="button"
                    className={`flex flex-col items-center gap-1 rounded-lg border px-2 py-2 text-[10px] transition-colors ${
                      active
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-transparent bg-[var(--surface)] hover:border-[var(--border)]'
                    }`}
                    onClick={() => setForm((current) => ({ ...current, logo: logo.key }))}
                  >
                    <SubscriptionLogo
                      logoKey={logo.key}
                      fallbackIcon={form.icon}
                      fallbackColor={form.color}
                      className="h-9 w-9"
                    />
                    <span className="w-full truncate text-center">{logo.label}</span>
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-xs text-[var(--muted)]">
              {selectedLogoKey
                ? `Selected logo: ${POPULAR_SUBSCRIPTION_LOGOS.find((item) => item.key === selectedLogoKey)?.label || selectedLogoKey}`
                : 'No logo selected. We will auto-detect from the subscription name when possible.'}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--muted)] mb-1">Fallback Icon</label>
              <input
                type="text"
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2.5"
                value={form.icon}
                onChange={(event) => setForm((current) => ({ ...current, icon: event.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--muted)] mb-1">Fallback Color</label>
              <input
                type="color"
                className="h-[42px] w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-2"
                value={form.color}
                onChange={(event) => setForm((current) => ({ ...current, color: event.target.value }))}
              />
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              className="size-4 rounded border-[var(--border)] bg-transparent text-primary focus:ring-primary/50"
              checked={form.autopay}
              onChange={(event) => setForm((current) => ({ ...current, autopay: event.target.checked }))}
            />
            <span className="text-sm">Enable autopay</span>
          </label>

          <button type="submit" className="btn-primary w-full justify-center py-3 text-base" disabled={submitting}>
            <span className="material-symbols-outlined text-[20px]">add</span>
            {submitting ? 'Saving...' : 'Add Subscription'}
          </button>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteId)}
        title="Delete Subscription"
        message="This subscription will be removed permanently."
        confirmText="Delete"
        danger
        onCancel={() => setDeleteId(null)}
        onConfirm={() => void handleDelete()}
      />
    </div>
  );
}
