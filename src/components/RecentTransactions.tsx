'use client';

import { CATEGORY_COLORS, CATEGORY_ICONS, TransactionData } from '@/lib/types';
import Link from 'next/link';
import { format, isToday, isYesterday } from 'date-fns';
import { useSession } from '@/components/SessionProvider';
import { formatCurrencyAmount } from '@/lib/currency';

function formatTransactionDate(dateStr: string): string {
    const date = new Date(dateStr);
    if (isToday(date)) return `Today, ${format(date, 'h:mm a')}`;
    if (isYesterday(date)) return `Yesterday, ${format(date, 'h:mm a')}`;
    return format(date, 'MMM d, yyyy');
}

function getCategoryStyle(category: string) {
    return CATEGORY_COLORS[category] || CATEGORY_COLORS.Other;
}

function getCategoryIcon(category: string) {
    return CATEGORY_ICONS[category] || 'category';
}

export function RecentTransactions({ transactions }: { transactions: TransactionData[] }) {
    const { currency } = useSession();

    return (
        <div className="stat-card !p-0">
            <div className="flex items-center justify-between p-5 pb-3">
                <h3 className="font-semibold text-lg">Recent Transactions</h3>
                <Link href="/transactions" className="text-primary text-sm font-medium hover:underline">
                    View All
                </Link>
            </div>
            <div className="divide-y divide-[var(--border)]">
                {transactions.map((tx) => {
                    const style = getCategoryStyle(tx.category);
                    const icon = getCategoryIcon(tx.category);
                    return (
                        <div key={tx._id} className="flex items-center gap-3 px-5 py-3 hover:bg-[var(--surface)]/50 transition-colors">
                            <div className={`flex items-center justify-center size-10 rounded-full ${style.bgDark}`}>
                                <span className={`material-symbols-outlined text-[20px] ${style.textDark}`}>{icon}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm truncate">{tx.description}</p>
                                <p className="text-xs text-[var(--muted)]">{formatTransactionDate(tx.date)}</p>
                            </div>
                            <p className={`font-medium text-sm whitespace-nowrap ${tx.type === 'income' ? 'text-emerald-400' : ''
                                }`}>
                                {tx.type === 'income' ? '+' : '-'}
                                {formatCurrencyAmount(Math.abs(tx.amount), currency)}
                            </p>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
