'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { apiRequest } from '@/lib/client-api';
import { useSession } from './SessionProvider';

const navItems = [
    { href: '/', label: 'Dashboard', icon: 'dashboard' },
    { href: '/transactions', label: 'Transactions', icon: 'receipt_long' },
    { href: '/subscriptions', label: 'Subscriptions', icon: 'credit_card' },
    { href: '/budgets', label: 'Budgets', icon: 'savings' },
    { href: '/reports', label: 'Reports', icon: 'bar_chart' },
    { href: '/split', label: 'Split Groups', icon: 'group' },
];

export function Header() {
    const pathname = usePathname();
    const { user } = useSession();
    const [searchQuery, setSearchQuery] = useState('');
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);
    const [notifications, setNotifications] = useState<Array<{ type: string; title: string; message: string }>>([]);

    useEffect(() => {
        setMobileMenuOpen(false);
        setShowNotifications(false);
    }, [pathname]);

    useEffect(() => {
        document.body.style.overflow = mobileMenuOpen ? 'hidden' : '';
        return () => {
            document.body.style.overflow = '';
        };
    }, [mobileMenuOpen]);

    useEffect(() => {
        if (!user) return;

        const load = async () => {
            try {
                const summary = await apiRequest<{ notifications: Array<{ type: string; title: string; message: string }> }>(
                    '/api/reports/summary'
                );
                setNotifications(summary.notifications || []);
            } catch {
                setNotifications([]);
            }
        };

        void load();
    }, [user]);

    return (
        <>
            <header className="sticky top-0 z-50 flex items-center justify-between border-b border-[var(--border)] bg-[var(--background)]/85 backdrop-blur-xl px-4 sm:px-6 py-3">
                <div className="flex items-center gap-3">
                    <button
                        className="md:hidden flex items-center justify-center size-9 rounded-xl border border-transparent hover:border-[var(--border)] hover:bg-[var(--surface)] transition-colors"
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    >
                        <span className="material-symbols-outlined">
                            {mobileMenuOpen ? 'close' : 'menu'}
                        </span>
                    </button>
                    <div className="sm:hidden">
                        <p className="text-xs uppercase tracking-[0.14em] text-[var(--muted)]">Overview</p>
                        <p className="text-sm font-semibold">{pathname === '/' ? 'Dashboard' : pathname.slice(1).replace('-', ' ')}</p>
                    </div>
                </div>

                <div className="relative flex-1 max-w-md mx-4 hidden sm:block">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[var(--muted)]">
                        <span className="material-symbols-outlined text-[20px]">search</span>
                    </div>
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="block w-full pl-10 pr-4 py-2.5 rounded-xl bg-[var(--surface)] border border-[var(--border)] placeholder-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/50 text-sm transition-shadow shadow-inner"
                        placeholder="Search transactions..."
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-sans font-medium text-[var(--muted)] border border-[var(--border)] rounded bg-[var(--surface-muted)]">
                            ⌘K
                        </kbd>
                    </div>
                </div>

                <div className="flex items-center gap-2 sm:gap-3">
                    <button
                        className="flex items-center justify-center size-9 rounded-xl border border-transparent text-[var(--muted)] hover:border-[var(--border)] hover:bg-[var(--surface)] hover:text-primary transition-colors relative"
                        onClick={() => setShowNotifications((current) => !current)}
                    >
                        <span className="material-symbols-outlined text-[20px]">notifications</span>
                        {notifications.length > 0 ? (
                            <span className="absolute top-1 right-1 size-2 rounded-full bg-primary animate-pulse" />
                        ) : null}
                    </button>

                    <Link href="/transactions?add=true" className="btn-primary hidden sm:flex">
                        <span className="material-symbols-outlined text-[18px]">add</span>
                        Add Transaction
                    </Link>

                    <Link
                        href="/transactions?add=true"
                        className="sm:hidden flex items-center justify-center size-9 rounded-xl bg-primary text-[var(--primary-foreground)] shadow-lg shadow-primary/25"
                    >
                        <span className="material-symbols-outlined text-[20px]">add</span>
                    </Link>
                </div>
            </header>

            {showNotifications ? (
                <div className="absolute right-4 top-[72px] z-50 w-[320px] rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3 shadow-xl">
                    <div className="mb-2 flex items-center justify-between">
                        <h3 className="text-sm font-semibold">Notifications</h3>
                        <button
                            className="text-xs text-[var(--muted)] hover:text-[var(--foreground)]"
                            onClick={() => setShowNotifications(false)}
                        >
                            Close
                        </button>
                    </div>
                    <div className="max-h-[280px] space-y-2 overflow-y-auto">
                        {notifications.length === 0 ? (
                            <p className="rounded-xl bg-[var(--surface-muted)] p-3 text-xs text-[var(--muted)]">
                                No alerts right now.
                            </p>
                        ) : (
                            notifications.map((item, index) => (
                                <div key={`${item.title}-${index}`} className="rounded-xl bg-[var(--surface-muted)] p-3">
                                    <p className="text-xs font-semibold">{item.title}</p>
                                    <p className="mt-1 text-xs text-[var(--muted)]">{item.message}</p>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            ) : null}

            {mobileMenuOpen && (
                <div className="md:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)}>
                    <nav
                        className="absolute top-0 left-0 h-full w-72 bg-[var(--sidebar-bg)] border-r border-[var(--sidebar-border)] p-4 space-y-1.5 animate-slide-in-right text-[var(--sidebar-text)]"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center gap-3 mb-5 p-2 border-b border-[var(--sidebar-border)] pb-4">
                            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/20 text-primary">
                                <span className="material-symbols-outlined">account_balance_wallet</span>
                            </div>
                            <div>
                                <h1 className="text-base font-semibold text-[var(--sidebar-text-active)]">Trakio</h1>
                                <p className="text-xs text-primary/70">Personal Finance</p>
                            </div>
                        </div>
                        {navItems.map((item) => {
                            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={() => setMobileMenuOpen(false)}
                                    className={isActive ? 'nav-link-active' : 'nav-link group'}
                                >
                                    <span
                                        className={`material-symbols-outlined text-[20px] ${isActive ? 'text-primary' : 'text-[var(--sidebar-text)] group-hover:text-primary'
                                            }`}
                                    >
                                        {item.icon}
                                    </span>
                                    <span className="text-sm font-medium">{item.label}</span>
                                </Link>
                            );
                        })}
                        <Link href="/settings" onClick={() => setMobileMenuOpen(false)} className="nav-link mt-4">
                            <span className="material-symbols-outlined">settings</span>
                            <span className="text-sm font-medium">Settings</span>
                        </Link>
                    </nav>
                </div>
            )}
        </>
    );
}
