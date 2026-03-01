'use client';

import { useEffect, useState } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { apiRequest } from '@/lib/client-api';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageLoader } from '@/components/ui/PageLoader';
import { useSession } from '@/components/SessionProvider';
import { formatCurrencyAmount } from '@/lib/currency';

interface SummaryData {
  totals: {
    expenses: number;
    income: number;
  };
  monthlyComparison: Array<{ month: string; income: number; expenses: number }>;
  categoryBreakdown: Array<{ name: string; total: number; color: string; percentage: number }>;
}

export default function ReportsPage() {
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
        setError('Failed to load reports');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  if (loading) {
    return <PageLoader title="Loading reports" subtitle="Building trends and category analytics..." rows={5} />;
  }

  if (error || !summary) {
    return (
      <EmptyState
        icon="error"
        title="Reports unavailable"
        description={error || 'Could not load reports.'}
        action={
          <button className="btn-primary" onClick={() => window.location.reload()}>
            Retry
          </button>
        }
      />
    );
  }

  const thisMonth = summary.totals.expenses;
  const monthsWithData = summary.monthlyComparison.filter((item) => item.expenses > 0 || item.income > 0);
  const prevMonth = monthsWithData.length > 1 ? monthsWithData[monthsWithData.length - 2]?.expenses || 0 : 0;
  const changePercent = prevMonth > 0 ? (((thisMonth - prevMonth) / prevMonth) * 100).toFixed(1) : '0.0';
  const average =
    monthsWithData.length > 0
      ? monthsWithData.reduce((sum, item) => sum + item.expenses, 0) / monthsWithData.length
      : 0;

  return (
    <div className="flex flex-col gap-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
        <p className="text-[var(--muted)] text-sm mt-1">Analyze your financial trends and patterns.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="stat-card">
          <p className="text-sm text-[var(--muted)] mb-2">This Month</p>
          <h3 className="text-3xl font-bold">{formatCurrencyAmount(thisMonth, currency)}</h3>
          <p className="text-xs text-emerald-400 mt-1">{changePercent}% vs last month</p>
        </div>
        <div className="stat-card">
          <p className="text-sm text-[var(--muted)] mb-2">Last Month</p>
          <h3 className="text-3xl font-bold">{formatCurrencyAmount(prevMonth, currency)}</h3>
        </div>
        <div className="stat-card">
          <p className="text-sm text-[var(--muted)] mb-2">Monthly Average</p>
          <h3 className="text-3xl font-bold">
            {formatCurrencyAmount(average, currency, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </h3>
          <p className="text-xs text-[var(--muted)] mt-1">Based on {monthsWithData.length} months</p>
        </div>
      </div>

      <div className="stat-card">
        <h3 className="font-semibold text-lg mb-4">Monthly Overview</h3>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={summary.monthlyComparison} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.3} />
              <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={{ stroke: 'var(--border)' }} tickLine={false} />
              <YAxis
                tick={{ fill: '#94a3b8', fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(value) =>
                  `${formatCurrencyAmount(Number(value) / 1000, currency, {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 1,
                  })}k`
                }
              />
              <Tooltip
                contentStyle={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '12px' }}
                formatter={(value: number | string | undefined) =>
                  value != null
                    ? [
                        formatCurrencyAmount(Number(value), currency, {
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 2,
                        }),
                        '',
                      ]
                    : ['-', '']
                }
              />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Bar dataKey="income" fill="#19e65e" radius={[4, 4, 0, 0]} name="Income" />
              <Bar dataKey="expenses" fill="#f43f5e" radius={[4, 4, 0, 0]} name="Expenses" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="stat-card">
        <h3 className="font-semibold text-lg mb-4">Category Breakdown</h3>
        <div className="space-y-3">
          {summary.categoryBreakdown.map((category) => (
            <div key={category.name} className="flex items-center gap-3">
              <span className="size-3 rounded-full" style={{ backgroundColor: category.color }} />
              <span className="text-sm font-medium flex-1">{category.name}</span>
              <span className="text-sm text-[var(--muted)]">{category.percentage}%</span>
              <span className="text-sm font-semibold">{formatCurrencyAmount(category.total, currency)}</span>
              <div className="w-24 bg-[var(--surface-muted)] h-1.5 rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${category.percentage}%`, backgroundColor: category.color }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
