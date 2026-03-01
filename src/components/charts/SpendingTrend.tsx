'use client';

import {
    ResponsiveContainer,
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
} from 'recharts';
import { useSession } from '@/components/SessionProvider';
import { formatCurrencyAmount } from '@/lib/currency';

interface SpendingTrendProps {
    data: { date: string; income: number; expenses: number }[];
}

export function SpendingTrend({ data }: SpendingTrendProps) {
    const { currency } = useSession();

    return (
        <div className="stat-card">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h3 className="font-semibold text-lg">Spending Trends</h3>
                    <p className="text-sm text-[var(--muted)]">Income vs Expenses over time</p>
                </div>
                <select className="text-sm bg-[var(--surface)] border border-[var(--border)] rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/50">
                    <option>This Month</option>
                    <option>Last Month</option>
                    <option>3 Months</option>
                    <option>This Year</option>
                </select>
            </div>
            <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                        <defs>
                            <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#19e65e" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#19e65e" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.2} />
                                <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.3} />
                        <XAxis
                            dataKey="date"
                            tick={{ fill: 'var(--muted)', fontSize: 12 }}
                            axisLine={{ stroke: 'var(--border)' }}
                            tickLine={false}
                        />
                        <YAxis
                            tick={{ fill: 'var(--muted)', fontSize: 12 }}
                            axisLine={false}
                            tickLine={false}
                            tickFormatter={(value) =>
                                formatCurrencyAmount(Number(value), currency, {
                                    minimumFractionDigits: 0,
                                    maximumFractionDigits: 0,
                                })
                            }
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: 'var(--surface)',
                                border: '1px solid var(--border)',
                                borderRadius: '8px',
                                fontSize: '12px',
                                color: 'var(--foreground)',
                            }}
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
                        <Area
                            type="monotone"
                            dataKey="income"
                            stroke="#19e65e"
                            strokeWidth={2}
                            fill="url(#incomeGradient)"
                            name="Income"
                        />
                        <Area
                            type="monotone"
                            dataKey="expenses"
                            stroke="#f43f5e"
                            strokeWidth={2}
                            fill="url(#expenseGradient)"
                            name="Expenses"
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
