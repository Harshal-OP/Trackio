// Shared types for the frontend
export interface TransactionData {
    _id: string;
    amount: number;
    type: 'income' | 'expense';
    date: string;
    category: string;
    label?: string;
    notes?: string;
    paymentMethod: string;
    isRecurring: boolean;
    description: string;
    icon?: string;
}

export interface SubscriptionData {
    _id: string;
    name: string;
    category: string;
    amount: number;
    frequency: 'monthly' | 'yearly' | 'weekly';
    nextDueDate: string;
    autopay: boolean;
    status: 'active' | 'paused' | 'cancelled';
    logo?: string;
    icon: string;
    color: string;
    notes?: string;
}

export interface CategoryData {
    _id: string;
    name: string;
    icon: string;
    color: string;
    isDefault: boolean;
}

export interface DashboardSummary {
    totalBalance: number;
    monthlySpending: number;
    monthlyIncome: number;
    balanceChange: number;
    spendingChange: number;
    recentTransactions: TransactionData[];
    categoryBreakdown: { name: string; total: number; color: string; percentage: number }[];
    monthlyTrend: { date: string; income: number; expenses: number }[];
}

export interface NotificationData {
    _id: string;
    type: 'subscription_due' | 'budget_alert' | 'insight';
    title: string;
    message: string;
    read: boolean;
    createdAt: string;
}

export interface UserSettings {
    currency: string;
    notifications: {
        subscriptionDue: boolean;
        budgetAlerts: boolean;
        weeklySummary: boolean;
        emailNotifications: boolean;
    };
}

export interface UserProfile {
    id: string;
    name: string;
    email: string;
    plan: 'free' | 'pro';
    settings: UserSettings;
}

export interface BudgetData {
    id: string;
    category: string;
    month: string;
    limit: number;
    spent: number;
    remaining: number;
    percentUsed: number;
}

export interface SplitGroupData {
    id: string;
    ownerId: string;
    name: string;
    description?: string;
    currency: string;
    status: 'active' | 'archived';
    inviteCode: string;
    memberCount: number;
    createdAt: string;
    updatedAt: string;
}

export interface SplitMemberData {
    id: string;
    groupId: string;
    userId?: string;
    guestName?: string;
    email?: string;
    role: 'owner' | 'member';
    status: 'active' | 'invited' | 'left';
    createdAt: string;
    updatedAt: string;
}

export interface SplitExpenseData {
    id: string;
    groupId: string;
    paidByMemberId: string;
    createdByUserId: string;
    amount: number;
    currency: string;
    description: string;
    splitType: 'equal' | 'custom';
    splits: Array<{ memberId: string; amount: number }>;
    date: string;
    notes?: string;
    createdAt: string;
    updatedAt: string;
}

export interface SplitSettlementData {
    id: string;
    groupId: string;
    payerMemberId: string;
    receiverMemberId: string;
    amount: number;
    currency: string;
    date: string;
    note?: string;
    createdAt: string;
    updatedAt: string;
}

export interface SplitActivityData {
    id: string;
    groupId: string;
    actorUserId?: string;
    actorMemberId?: string;
    type: string;
    payload: Record<string, unknown>;
    createdAt: string;
}

// Category color mapping
export const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string; bgDark: string; textDark: string; borderDark: string }> = {
    Food: { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200', bgDark: 'bg-orange-500/10', textDark: 'text-orange-400', borderDark: 'border-orange-500/20' },
    Groceries: { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200', bgDark: 'bg-orange-500/10', textDark: 'text-orange-400', borderDark: 'border-orange-500/20' },
    Transport: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200', bgDark: 'bg-blue-500/10', textDark: 'text-blue-400', borderDark: 'border-blue-500/20' },
    Shopping: { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200', bgDark: 'bg-orange-500/10', textDark: 'text-orange-400', borderDark: 'border-orange-500/20' },
    Entertainment: { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200', bgDark: 'bg-purple-500/10', textDark: 'text-purple-400', borderDark: 'border-purple-500/20' },
    Utilities: { bg: 'bg-cyan-100', text: 'text-cyan-700', border: 'border-cyan-200', bgDark: 'bg-cyan-500/10', textDark: 'text-cyan-400', borderDark: 'border-cyan-500/20' },
    Health: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200', bgDark: 'bg-red-500/10', textDark: 'text-red-400', borderDark: 'border-red-500/20' },
    Income: { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200', bgDark: 'bg-emerald-500/10', textDark: 'text-emerald-400', borderDark: 'border-emerald-500/20' },
    Salary: { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200', bgDark: 'bg-emerald-500/10', textDark: 'text-emerald-400', borderDark: 'border-emerald-500/20' },
    Gas: { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-200', bgDark: 'bg-slate-500/10', textDark: 'text-slate-300', borderDark: 'border-slate-500/20' },
    Software: { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200', bgDark: 'bg-purple-500/10', textDark: 'text-purple-400', borderDark: 'border-purple-500/20' },
    Rent: { bg: 'bg-violet-100', text: 'text-violet-700', border: 'border-violet-200', bgDark: 'bg-violet-500/10', textDark: 'text-violet-400', borderDark: 'border-violet-500/20' },
    Travel: { bg: 'bg-teal-100', text: 'text-teal-700', border: 'border-teal-200', bgDark: 'bg-teal-500/10', textDark: 'text-teal-400', borderDark: 'border-teal-500/20' },
    Other: { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-200', bgDark: 'bg-slate-500/10', textDark: 'text-slate-300', borderDark: 'border-slate-500/20' },
};

export const CATEGORY_ICONS: Record<string, string> = {
    Food: 'restaurant',
    Groceries: 'shopping_cart',
    Transport: 'directions_car',
    Shopping: 'shopping_bag',
    Entertainment: 'movie',
    Utilities: 'bolt',
    Health: 'fitness_center',
    Income: 'payments',
    Salary: 'account_balance',
    Gas: 'local_gas_station',
    Software: 'design_services',
    Rent: 'home',
    Travel: 'flight',
    Other: 'category',
};

export const PAYMENT_METHODS = [
    'Cash',
    'Credit Card',
    'Debit Card',
    'Bank Transfer',
    'UPI',
    'Chase Sapphire',
    'Amex Gold',
] as const;
