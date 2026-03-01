'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { CATEGORY_COLORS, CATEGORY_ICONS, PAYMENT_METHODS, TransactionData } from '@/lib/types';
import { apiRequest } from '@/lib/client-api';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { ActionMenu } from '@/components/ui/ActionMenu';
import { useToast } from '@/components/ui/Toast';
import { useSession } from '@/components/SessionProvider';
import { formatCurrencyAmount } from '@/lib/currency';
import { PageLoader } from '@/components/ui/PageLoader';

const CATEGORIES = Object.keys(CATEGORY_ICONS);

function getCategoryStyle(category: string) {
  return CATEGORY_COLORS[category] || CATEGORY_COLORS.Other;
}

function getCategoryIcon(category: string) {
  return CATEGORY_ICONS[category] || 'category';
}

const defaultForm = {
  amount: '',
  type: 'expense' as 'income' | 'expense',
  date: format(new Date(), 'yyyy-MM-dd'),
  category: 'Other',
  paymentMethod: 'Cash',
  description: '',
  notes: '',
  isRecurring: false,
};

export default function TransactionsPage() {
  const { currency } = useSession();
  const { showToast } = useToast();
  const [transactions, setTransactions] = useState<TransactionData[]>([]);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [submitting, setSubmitting] = useState(false);

  const pages = Math.max(1, Math.ceil(total / limit));

  const monthRange = useMemo(() => {
    const now = new Date();
    return {
      startDate: format(startOfMonth(now), 'yyyy-MM-dd'),
      endDate: format(endOfMonth(now), 'yyyy-MM-dd'),
    };
  }, []);

  const loadTransactions = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(limit));
      params.set('startDate', monthRange.startDate);
      params.set('endDate', monthRange.endDate);
      if (search) params.set('search', search);
      if (typeFilter !== 'all') params.set('type', typeFilter);

      const data = await apiRequest<{
        transactions: TransactionData[];
        pagination: { total: number; page: number; pages: number; limit: number };
      }>(`/api/transactions?${params.toString()}`);

      setTransactions(data.transactions);
      setTotal(data.pagination.total);
    } catch {
      setError('Failed to load transactions');
    } finally {
      setLoading(false);
    }
  }, [limit, monthRange.endDate, monthRange.startDate, page, search, typeFilter]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      void loadTransactions();
    }, 250);
    return () => clearTimeout(timeout);
  }, [loadTransactions]);

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === transactions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(transactions.map((transaction) => transaction._id)));
    }
  };

  const handleExport = () => {
    const params = new URLSearchParams();
    params.set('startDate', monthRange.startDate);
    params.set('endDate', monthRange.endDate);
    window.open(`/api/transactions/export?${params.toString()}`, '_blank');
  };

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();

    setSubmitting(true);
    try {
      await apiRequest<{ transaction: TransactionData }>('/api/transactions', {
        method: 'POST',
        body: JSON.stringify({
          amount: Number(form.amount),
          type: form.type,
          date: form.date,
          category: form.category,
          paymentMethod: form.paymentMethod,
          description: form.description,
          notes: form.notes,
          isRecurring: form.isRecurring,
        }),
      });
      showToast('Transaction created', 'success');
      setShowAddModal(false);
      setForm(defaultForm);
      void loadTransactions();
    } catch {
      showToast('Failed to create transaction', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await apiRequest<{ message: string }>(`/api/transactions/${deleteId}`, {
        method: 'DELETE',
      });
      showToast('Transaction deleted', 'success');
      setDeleteId(null);
      void loadTransactions();
    } catch {
      showToast('Failed to delete transaction', 'error');
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Transactions</h1>
          <p className="text-[var(--muted)] mt-1">View and manage your financial activity.</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleExport} className="btn-secondary">
            <span className="material-symbols-outlined text-[18px]">file_upload</span>
            Export
          </button>
          <button onClick={() => setShowAddModal(true)} className="btn-primary">
            <span className="material-symbols-outlined text-[18px]">add</span>
            Add Transaction
          </button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1 min-w-[240px]">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[var(--muted)]">
            <span className="material-symbols-outlined text-[20px]">search</span>
          </div>
          <input
            type="text"
            value={search}
            onChange={(event) => {
              setPage(1);
              setSearch(event.target.value);
            }}
            className="block w-full pl-10 pr-4 py-2.5 rounded-lg bg-[var(--surface)] border border-[var(--border)] placeholder-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm transition-shadow"
            placeholder="Search by merchant, category, or amount..."
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          <button className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--surface)] border border-[var(--border)] text-sm font-medium whitespace-nowrap" onClick={() => void loadTransactions()}>
            <span className="material-symbols-outlined text-[18px]">calendar_month</span>
            This Month
          </button>
          <div className="h-6 w-px bg-[var(--border)] mx-1" />
          {(['all', 'income', 'expense'] as const).map((type) => (
            <button
              key={type}
              onClick={() => {
                setPage(1);
                setTypeFilter(type);
              }}
              className={`group flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${typeFilter === type
                  ? 'bg-[var(--surface)] border border-[var(--border)] shadow-sm'
                  : 'border border-transparent hover:border-[var(--border)] hover:bg-[var(--surface)]'
                }`}
            >
              <span
                className={`size-2 rounded-full ${type === 'all' ? 'bg-slate-400' : type === 'income' ? 'bg-emerald-500' : 'bg-rose-500'
                  }`}
              />
              {type === 'all' ? 'All Types' : type === 'income' ? 'Income' : 'Expenses'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <PageLoader title="Loading transactions" subtitle="Pulling latest income and expense history..." rows={6} />
      ) : error ? (
        <EmptyState
          icon="error"
          title="Unable to load transactions"
          description={error}
          action={
            <button className="btn-primary" onClick={() => void loadTransactions()}>
              Retry
            </button>
          }
        />
      ) : transactions.length === 0 ? (
        <EmptyState
          icon="receipt_long"
          title="No transactions found"
          description="Add your first transaction to start tracking your spending and income."
          action={
            <button className="btn-primary" onClick={() => setShowAddModal(true)}>
              <span className="material-symbols-outlined text-[18px]">add</span>
              Add Transaction
            </button>
          }
        />
      ) : (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[var(--border)] bg-slate-50 dark:bg-white/[0.02]">
                  <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider w-12 text-center">
                    <input
                      type="checkbox"
                      checked={selectedIds.size === transactions.length && transactions.length > 0}
                      onChange={toggleSelectAll}
                      className="size-4 rounded border-slate-300 dark:border-white/20 bg-transparent text-primary focus:ring-primary/50"
                    />
                  </th>
                  <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider min-w-[120px]">Date</th>
                  <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider min-w-[200px]">Description</th>
                  <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Category</th>
                  <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">Method</th>
                  <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Amount</th>
                  <th className="py-3 px-4 w-16" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]/50 text-sm">
                {transactions.map((transaction) => {
                  const style = getCategoryStyle(transaction.category);
                  const icon = transaction.icon || getCategoryIcon(transaction.category);

                  return (
                    <tr key={transaction._id} className="group hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
                      <td className="py-3 px-4 text-center">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(transaction._id)}
                          onChange={() => toggleSelect(transaction._id)}
                          className="size-4 rounded border-slate-300 dark:border-white/20 bg-transparent text-primary focus:ring-primary/50"
                        />
                      </td>
                      <td className="py-3 px-4 text-[var(--muted)] whitespace-nowrap">
                        {format(new Date(transaction.date), 'MMM d, yyyy')}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className={`flex items-center justify-center size-8 rounded-full ${style.bgDark}`}>
                            <span className={`material-symbols-outlined text-[18px] ${style.textDark}`}>{icon}</span>
                          </div>
                          <span className="font-medium">{transaction.description}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`badge ${style.bgDark} ${style.textDark} border ${style.borderDark}`}>{transaction.category}</span>
                      </td>
                      <td className="py-3 px-4 text-[var(--muted)] hidden md:table-cell">{transaction.paymentMethod}</td>
                      <td className={`py-3 px-4 text-right font-medium ${transaction.type === 'income' ? 'text-emerald-500' : 'text-rose-400'}`}>
                        {transaction.type === 'income' ? '+' : '-'}
                        {formatCurrencyAmount(Math.abs(transaction.amount), currency)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <ActionMenu
                          items={[
                            {
                              label: 'Delete',
                              danger: true,
                              onClick: () => setDeleteId(transaction._id),
                            },
                          ]}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="border-t border-[var(--border)] p-4 flex items-center justify-between">
            <span className="text-xs text-[var(--muted)]">
              Showing {(page - 1) * limit + 1}-{Math.min(page * limit, total)} of {total} transactions
            </span>
            <div className="flex items-center gap-2">
              <button
                className="flex items-center justify-center size-8 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--foreground)] transition-colors disabled:opacity-50"
                disabled={page <= 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
              >
                <span className="material-symbols-outlined text-[18px]">chevron_left</span>
              </button>
              <button
                className="flex items-center justify-center size-8 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--foreground)] transition-colors disabled:opacity-50"
                disabled={page >= pages}
                onClick={() => setPage((current) => Math.min(pages, current + 1))}
              >
                <span className="material-symbols-outlined text-[18px]">chevron_right</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <Modal open={showAddModal} onClose={() => setShowAddModal(false)} title="Add Transaction">
        <form className="space-y-4" onSubmit={handleCreate}>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setForm((current) => ({ ...current, type: 'expense' }))}
              className={`flex-1 py-2 rounded-lg border text-sm font-medium ${form.type === 'expense'
                  ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                  : 'bg-[var(--surface)] border-[var(--border)] text-[var(--muted)]'
                }`}
            >
              Expense
            </button>
            <button
              type="button"
              onClick={() => setForm((current) => ({ ...current, type: 'income' }))}
              className={`flex-1 py-2 rounded-lg border text-sm font-medium ${form.type === 'income'
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : 'bg-[var(--surface)] border-[var(--border)] text-[var(--muted)]'
                }`}
            >
              Income
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--muted)] mb-1">Amount</label>
            <input
              type="number"
              step="0.01"
              min="0"
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2.5"
              required
              value={form.amount}
              onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--muted)] mb-1">Description</label>
            <input
              type="text"
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2.5"
              required
              value={form.description}
              onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--muted)] mb-1">Category</label>
              <select
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2.5"
                value={form.category}
                onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
              >
                {CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--muted)] mb-1">Date</label>
              <input
                type="date"
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2.5"
                value={form.date}
                onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--muted)] mb-1">Payment Method</label>
            <select
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2.5"
              value={form.paymentMethod}
              onChange={(event) => setForm((current) => ({ ...current, paymentMethod: event.target.value }))}
            >
              {PAYMENT_METHODS.map((method) => (
                <option key={method} value={method}>
                  {method}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--muted)] mb-1">Notes (optional)</label>
            <textarea
              rows={2}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2.5"
              value={form.notes}
              onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              className="size-4 rounded border-[var(--border)] bg-transparent text-primary focus:ring-primary/50"
              checked={form.isRecurring}
              onChange={(event) => setForm((current) => ({ ...current, isRecurring: event.target.checked }))}
            />
            <span className="text-sm">This is a recurring transaction</span>
          </label>

          <button type="submit" className="btn-primary w-full justify-center py-3 text-base" disabled={submitting}>
            <span className="material-symbols-outlined text-[20px]">add</span>
            {submitting ? 'Saving...' : 'Add Transaction'}
          </button>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteId)}
        title="Delete Transaction"
        message="This action cannot be undone. Do you want to delete this transaction?"
        confirmText="Delete"
        danger
        onCancel={() => setDeleteId(null)}
        onConfirm={() => void handleDelete()}
      />
    </div>
  );
}
