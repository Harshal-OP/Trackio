'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { usePathname } from 'next/navigation';
import { ThemeToggle } from './ThemeToggle';
import { useSession } from './SessionProvider';
import { useToast } from './ui/Toast';

const navItems = [
    { href: '/', label: 'Dashboard', icon: 'dashboard' },
    { href: '/transactions', label: 'Transactions', icon: 'receipt_long' },
    { href: '/subscriptions', label: 'Subscriptions', icon: 'credit_card' },
    { href: '/budgets', label: 'Budgets', icon: 'savings' },
    { href: '/reports', label: 'Reports', icon: 'bar_chart' },
    { href: '/split', label: 'Split Groups', icon: 'group' },
];

export function Sidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const { user, logout } = useSession();
    const { showToast } = useToast();

    const handleLogout = async () => {
        try {
            await logout();
            router.replace('/login');
        } catch {
            showToast('Logout failed', 'error');
        }
    };

    return (
        <aside className="w-64 flex-shrink-0 border-r border-[var(--sidebar-border)] bg-[var(--sidebar-bg)] text-[var(--sidebar-text)] hidden md:flex flex-col h-full">
            <div className="p-5 flex items-center gap-3 border-b border-[var(--sidebar-border)]">
                <div className="flex size-10 items-center justify-center rounded-xl bg-primary/20 text-primary">
                    <span className="material-symbols-outlined">account_balance_wallet</span>
                </div>
                <div className="flex flex-col">
                    <h1 className="text-base font-semibold leading-tight tracking-tight text-[var(--sidebar-text-active)]">Trakio</h1>
                    <p className="text-primary/70 text-xs font-medium leading-tight">Personal Finance</p>
                </div>
            </div>

            <nav className="flex-1 px-3 py-4 space-y-1.5">
                {navItems.map((item) => {
                    const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
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
            </nav>

            <div className="p-3 space-y-1.5 border-t border-[var(--sidebar-border)]">
                <ThemeToggle />
                <Link href="/settings" className="nav-link">
                    <span className="material-symbols-outlined">settings</span>
                    <span className="text-sm font-medium">Settings</span>
                </Link>
                <button className="nav-link w-full text-rose-300 hover:text-rose-200" onClick={handleLogout}>
                    <span className="material-symbols-outlined">logout</span>
                    <span className="text-sm font-medium">Log Out</span>
                </button>
            </div>

            <div className="p-4 border-t border-[var(--sidebar-border)]">
                <div className="flex items-center gap-3 rounded-xl border border-[var(--sidebar-border)] bg-[var(--sidebar-surface)]/80 p-3">
                    <div className="size-9 rounded-full bg-primary/20 flex items-center justify-center text-primary text-sm font-bold ring-1 ring-primary/30">
                        {(user?.name || 'A').charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <p className="text-sm font-medium text-[var(--sidebar-text-active)]">{user?.name || 'Guest'}</p>
                        <p className="text-[10px] text-[var(--sidebar-text)]">{user?.plan ? `${user.plan.toUpperCase()} Plan` : ''}</p>
                    </div>
                </div>
            </div>
        </aside>
    );
}
