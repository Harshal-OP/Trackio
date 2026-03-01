import { differenceInDays, endOfMonth, format, startOfMonth, subMonths } from 'date-fns';
import { Types } from 'mongoose';
import { connectDB } from '@/lib/db';
import { Transaction } from '@/models/Transaction';
import { Subscription } from '@/models/Subscription';
import { Budget } from '@/models/Budget';
import { DEFAULT_CATEGORIES } from '@/models/Category';
import { User } from '@/models/User';
import { DEFAULT_CURRENCY, formatCurrencyAmount, normalizeCurrencyCode } from '@/lib/currency';

interface MonthlyBucket {
  month?: string;
  date?: string;
  income: number;
  expenses: number;
}

const categoryColorMap = DEFAULT_CATEGORIES.reduce<Record<string, string>>((acc, category) => {
  acc[category.name] = category.color;
  return acc;
}, {});

function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

function parseMonthRange(month?: string) {
  const now = new Date();
  const base = month ? new Date(`${month}-01T00:00:00.000Z`) : now;

  if (Number.isNaN(base.getTime())) {
    return {
      key: format(now, 'yyyy-MM'),
      start: startOfMonth(now),
      end: endOfMonth(now),
    };
  }

  return {
    key: format(base, 'yyyy-MM'),
    start: startOfMonth(base),
    end: endOfMonth(base),
  };
}

function getMonthBuckets(count: number) {
  const now = new Date();
  return Array.from({ length: count }, (_, index) => {
    const date = subMonths(startOfMonth(now), count - 1 - index);
    return {
      key: format(date, 'yyyy-MM'),
      label: format(date, 'MMM'),
      date,
    };
  });
}

export async function buildReportSummary(userId: string, month?: string, currency?: string) {
  await connectDB();

  const userObjectId = new Types.ObjectId(userId);
  const { key: monthKey, start, end } = parseMonthRange(month);
  let reportCurrency = normalizeCurrencyCode(currency || DEFAULT_CURRENCY);

  if (!currency) {
    const user = await User.findById(userObjectId).select('settings.currency').lean();
    reportCurrency = normalizeCurrencyCode(user?.settings?.currency || reportCurrency);
  }

  const summaryStart = subMonths(startOfMonth(new Date()), 11);

  const [monthlyTransactions, periodTransactions, subscriptions, budgets] = await Promise.all([
    Transaction.find({ userId: userObjectId, date: { $gte: start, $lte: end } }).sort({ date: -1 }).lean(),
    Transaction.find({ userId: userObjectId, date: { $gte: summaryStart, $lte: end } }).lean(),
    Subscription.find({ userId: userObjectId, status: { $ne: 'cancelled' } }).sort({ nextDueDate: 1 }).lean(),
    Budget.find({ userId: userObjectId, month: monthKey }).lean(),
  ]);

  const income = monthlyTransactions
    .filter((transaction) => transaction.type === 'income')
    .reduce((sum, transaction) => sum + transaction.amount, 0);

  const expenses = monthlyTransactions
    .filter((transaction) => transaction.type === 'expense')
    .reduce((sum, transaction) => sum + transaction.amount, 0);

  const categoryTotals = monthlyTransactions
    .filter((transaction) => transaction.type === 'expense')
    .reduce<Record<string, number>>((acc, transaction) => {
      acc[transaction.category] = (acc[transaction.category] || 0) + transaction.amount;
      return acc;
    }, {});

  const totalCategorySpend = Object.values(categoryTotals).reduce((sum, value) => sum + value, 0);
  const categoryBreakdown = Object.entries(categoryTotals)
    .map(([name, total]) => ({
      name,
      total: roundCurrency(total),
      color: categoryColorMap[name] || '#94a3b8',
      percentage: totalCategorySpend > 0 ? roundCurrency((total / totalCategorySpend) * 100) : 0,
    }))
    .sort((a, b) => b.total - a.total);

  const monthlyBuckets = getMonthBuckets(6);
  const monthlyTrend: MonthlyBucket[] = monthlyBuckets.map((bucket) => ({
    date: bucket.label,
    income: 0,
    expenses: 0,
  }));

  const comparisonBuckets = getMonthBuckets(12);
  const monthlyComparison: MonthlyBucket[] = comparisonBuckets.map((bucket) => ({
    month: bucket.label,
    income: 0,
    expenses: 0,
  }));

  const monthIndexByKey = new Map(monthlyBuckets.map((bucket, index) => [bucket.key, index]));
  const comparisonIndexByKey = new Map(comparisonBuckets.map((bucket, index) => [bucket.key, index]));

  for (const transaction of periodTransactions) {
    const key = format(new Date(transaction.date), 'yyyy-MM');
    const trendIndex = monthIndexByKey.get(key);
    const comparisonIndex = comparisonIndexByKey.get(key);

    if (trendIndex !== undefined) {
      if (transaction.type === 'income') monthlyTrend[trendIndex].income += transaction.amount;
      else monthlyTrend[trendIndex].expenses += transaction.amount;
    }

    if (comparisonIndex !== undefined) {
      if (transaction.type === 'income') monthlyComparison[comparisonIndex].income += transaction.amount;
      else monthlyComparison[comparisonIndex].expenses += transaction.amount;
    }
  }

  monthlyTrend.forEach((item) => {
    item.income = roundCurrency(item.income);
    item.expenses = roundCurrency(item.expenses);
  });

  monthlyComparison.forEach((item) => {
    item.income = roundCurrency(item.income);
    item.expenses = roundCurrency(item.expenses);
  });

  const budgetItems = budgets.map((budget) => {
    const spent = categoryTotals[budget.category] || 0;
    const percentUsed = budget.limit > 0 ? roundCurrency((spent / budget.limit) * 100) : 0;
    return {
      id: budget._id.toString(),
      category: budget.category,
      month: budget.month,
      limit: budget.limit,
      spent: roundCurrency(spent),
      remaining: roundCurrency(Math.max(0, budget.limit - spent)),
      percentUsed,
    };
  });

  const budgetTotal = budgetItems.reduce((sum, budget) => sum + budget.limit, 0);
  const budgetSpent = budgetItems.reduce((sum, budget) => sum + budget.spent, 0);

  const now = new Date();
  const monthlySubscriptionCost = subscriptions
    .filter((subscription) => subscription.frequency === 'monthly')
    .reduce((sum, subscription) => sum + subscription.amount, 0);

  const upcomingSubscriptions = subscriptions.filter((subscription) => {
    const days = differenceInDays(new Date(subscription.nextDueDate), now);
    return days >= 0 && days <= 7;
  });

  const notifications = [
    ...budgetItems
      .filter((budget) => budget.percentUsed >= 80)
      .map((budget) => ({
        type: 'budget_alert',
        title: `Budget alert: ${budget.category}`,
        message: `${budget.percentUsed.toFixed(0)}% of your ${budget.category} budget is used`,
      })),
    ...upcomingSubscriptions.map((subscription) => ({
      type: 'subscription_due',
      title: `${subscription.name} due soon`,
      message: `${formatCurrencyAmount(subscription.amount, reportCurrency)} is due on ${format(new Date(subscription.nextDueDate), 'MMM d')}`,
    })),
  ];

  const insights = [
    {
      type: 'insight',
      text: `You spent ${formatCurrencyAmount(roundCurrency(expenses), reportCurrency)} and earned ${formatCurrencyAmount(roundCurrency(income), reportCurrency)} in ${format(start, 'MMMM')}.`,
    },
    ...(categoryBreakdown[0]
      ? [
          {
            type: 'insight',
            text: `${categoryBreakdown[0].name} is your top category at ${categoryBreakdown[0].percentage.toFixed(0)}% of expense spend.`,
          },
        ]
      : []),
    ...(monthlySubscriptionCost > 0
      ? [
          {
            type: 'insight',
            text: `Active monthly subscriptions cost ${formatCurrencyAmount(roundCurrency(monthlySubscriptionCost), reportCurrency)} per month.`,
          },
        ]
      : []),
  ];

  return {
    month: monthKey,
    currency: reportCurrency,
    totals: {
      income: roundCurrency(income),
      expenses: roundCurrency(expenses),
      balance: roundCurrency(income - expenses),
      budgetTotal: roundCurrency(budgetTotal),
      budgetSpent: roundCurrency(budgetSpent),
      budgetRemaining: roundCurrency(Math.max(0, budgetTotal - budgetSpent)),
      activeSubscriptions: subscriptions.length,
      monthlySubscriptionCost: roundCurrency(monthlySubscriptionCost),
      upcomingSubscriptionCost: roundCurrency(
        upcomingSubscriptions.reduce((sum, subscription) => sum + subscription.amount, 0)
      ),
    },
    monthlyTrend,
    monthlyComparison,
    categoryBreakdown,
    recentTransactions: monthlyTransactions.slice(0, 5).map((transaction) => ({
      ...transaction,
      _id: transaction._id.toString(),
      userId: transaction.userId.toString(),
    })),
    budgets: budgetItems,
    notifications,
    insights,
  };
}

export function buildAiSummaryText(summary: Awaited<ReturnType<typeof buildReportSummary>>) {
  const reportCurrency = normalizeCurrencyCode(summary.currency || DEFAULT_CURRENCY);
  const [topCategory] = summary.categoryBreakdown;
  const messageParts = [
    `You spent ${formatCurrencyAmount(summary.totals.expenses, reportCurrency)} and earned ${formatCurrencyAmount(summary.totals.income, reportCurrency)} this month.`,
  ];

  if (topCategory) {
    messageParts.push(
      `${topCategory.name} is your highest expense category at ${topCategory.percentage.toFixed(0)}% of total expenses.`
    );
  }

  if (summary.totals.monthlySubscriptionCost > 0) {
    messageParts.push(
      `Your monthly subscription commitments are ${formatCurrencyAmount(summary.totals.monthlySubscriptionCost, reportCurrency)}.`
    );
  }

  return {
    title: summary.totals.balance >= 0 ? 'You are in positive balance this month' : 'Your expenses exceed income this month',
    message: messageParts.join(' '),
    insights: summary.insights,
    generatedAt: new Date().toISOString(),
  };
}
