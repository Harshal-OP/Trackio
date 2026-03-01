'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { StatCard } from '@/components/StatCard';
import { RecentTransactions } from '@/components/RecentTransactions';
import { SpendingTrend } from '@/components/charts/SpendingTrend';
import { CategoryBreakdown } from '@/components/charts/CategoryBreakdown';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageLoader } from '@/components/ui/PageLoader';
import { apiRequest } from '@/lib/client-api';
import { TransactionData } from '@/lib/types';
import { useSession } from '@/components/SessionProvider';
import { formatCurrencyAmount } from '@/lib/currency';

interface SummaryData {
  totals: {
    balance: number;
    expenses: number;
    income: number;
    budgetRemaining: number;
  };
  monthlyTrend: Array<{ date: string; income: number; expenses: number }>;
  categoryBreakdown: Array<{ name: string; total: number; color: string; percentage: number }>;
  recentTransactions: TransactionData[];
  insights: Array<{ type: string; text: string }>;
}

export default function DashboardPage() {
  const { currency } = useSession();
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await apiRequest<SummaryData>('/api/reports/summary');
        setSummary(data);
      } catch {
        setError('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const primaryInsight = useMemo(() => summary?.insights?.[0]?.text || 'Track your activity to unlock insights.', [summary]);

  if (loading) {
    return <PageLoader title="Loading dashboard" subtitle="Crunching balances and recent activity..." rows={5} />;
  }

  if (error || !summary) {
    return (
      <EmptyState
        icon="error"
        title="Dashboard unavailable"
        description={error || 'Could not load dashboard.'}
        action={
          <button className="btn-primary" onClick={() => window.location.reload()}>
            Retry
          </button>
        }
      />
    );
  }

  const hasData = summary.recentTransactions.length > 0 || summary.categoryBreakdown.length > 0;

  if (!hasData) {
    return (
      <EmptyState
        icon="dashboard"
        title="Welcome to Trakio"
        description="Start by adding your first transaction, then set budgets and subscriptions to unlock full insights."
        action={
          <Link href="/transactions" className="btn-primary">
            <span className="material-symbols-outlined text-[18px]">add</span>
            Add First Transaction
          </Link>
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          title="Total Balance"
          value={formatCurrencyAmount(summary.totals.balance, currency)}
          icon="account_balance"
          iconColor="text-primary"
        />
        <StatCard
          title="Monthly Spending"
          value={formatCurrencyAmount(summary.totals.expenses, currency)}
          icon="credit_card"
          iconColor="text-orange-500"
        />
        <div className="stat-card bg-gradient-to-br from-[var(--surface)] to-primary/5 border-primary/20">
          <div className="flex items-center gap-2 mb-3">
            <span className="material-symbols-outlined text-primary text-[20px]">auto_awesome</span>
            <span className="text-xs font-bold text-primary uppercase tracking-wider">AI Insights</span>
          </div>
          <h4 className="font-bold text-lg mb-2">Performance Summary</h4>
          <p className="text-sm text-[var(--muted)] leading-relaxed">{primaryInsight}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <SpendingTrend data={summary.monthlyTrend} />
        </div>
        <div>
          <RecentTransactions transactions={summary.recentTransactions.slice(0, 5)} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <CategoryBreakdown data={summary.categoryBreakdown} />

        <div className="stat-card">
          <h3 className="font-semibold text-lg mb-1">Budget Buffer</h3>
          <p className="text-sm text-[var(--muted)] mb-4">Remaining this month</p>
          <div className="flex items-baseline gap-2 mb-1">
            <h4 className="text-3xl font-bold">{formatCurrencyAmount(summary.totals.budgetRemaining, currency)}</h4>
            <span className="text-sm text-[var(--muted)]">after current spend</span>
          </div>
          <Link href="/budgets" className="btn-secondary w-full mt-4 justify-center">
            View All Budgets
          </Link>
        </div>
      </div>

      <div className="flex justify-end">
        <a href="/api/transactions/export" className="btn-secondary">
          <span className="material-symbols-outlined text-[18px]">download</span>
          Download Statement
        </a>
      </div>
    </div>
  );
}
