'use client';

import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { useSession } from '@/components/SessionProvider';
import { formatCurrencyAmount } from '@/lib/currency';

interface CategoryBreakdownProps {
    data: { name: string; total: number; color: string; percentage: number }[];
}

const COLORS = ['#10b981', '#3b82f6', '#f97316', '#94a3b8', '#a855f7', '#ef4444', '#14b8a6', '#f59e0b'];

export function CategoryBreakdown({ data }: CategoryBreakdownProps) {
    const { currency } = useSession();
    const totalSpending = data.reduce((sum, d) => sum + d.total, 0);

    return (
        <div className="stat-card">
            <h3 className="font-semibold text-lg mb-4">Top Categories</h3>
            <div className="flex items-center gap-6">
                <div className="relative w-32 h-32 flex-shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={data}
                                cx="50%"
                                cy="50%"
                                innerRadius={35}
                                outerRadius={55}
                                dataKey="total"
                                strokeWidth={0}
                            >
                                {data.map((entry, index) => (
                                    <Cell key={entry.name} fill={entry.color || COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
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
                        </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <p className="text-[10px] text-[var(--muted)]">Total</p>
                        <p className="text-sm font-bold">
                            {formatCurrencyAmount(totalSpending / 1000, currency, {
                                minimumFractionDigits: 1,
                                maximumFractionDigits: 1,
                            })}
                            k
                        </p>
                    </div>
                </div>
                <div className="flex-1 space-y-2">
                    {data.slice(0, 4).map((item, index) => (
                        <div key={item.name} className="flex items-center gap-2">
                            <span
                                className="size-2 rounded-full"
                                style={{ backgroundColor: item.color || COLORS[index % COLORS.length] }}
                            />
                            <span className="text-sm">{item.name}</span>
                            <span className="text-sm text-[var(--muted)] ml-auto">{item.percentage}%</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
