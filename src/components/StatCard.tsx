'use client';

import { ReactNode } from 'react';

interface StatCardProps {
    title: string;
    value: string;
    change?: { value: string; positive: boolean };
    icon: string;
    iconColor?: string;
    children?: ReactNode;
}

export function StatCard({ title, value, change, icon, iconColor = 'text-primary' }: StatCardProps) {
    return (
        <div className="stat-card group">
            <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <span className={`material-symbols-outlined text-6xl ${iconColor}`}>{icon}</span>
            </div>
            <div className="relative z-10">
                <p className="text-[var(--muted)] text-sm font-medium mb-2">{title}</p>
                <div className="flex items-baseline gap-2">
                    <h3 className="text-3xl font-bold">{value}</h3>
                    {change && (
                        <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${change.positive
                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
                                    : 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400'
                                }`}
                        >
                            <span className="material-symbols-outlined text-[14px] mr-0.5">
                                {change.positive ? 'trending_up' : 'trending_down'}
                            </span>
                            {change.value}
                        </span>
                    )}
                </div>
                {change && (
                    <p className="text-xs text-[var(--muted)] mt-2">vs last month</p>
                )}
            </div>
        </div>
    );
}
