'use client';

import { useEffect, useMemo, useState } from 'react';
import { useCallback } from 'react';
import { format } from 'date-fns';
import { BudgetData } from '@/lib/types';
import { apiRequest } from '@/lib/client-api';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { ActionMenu } from '@/components/ui/ActionMenu';
import { useToast } from '@/components/ui/Toast';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useSession } from '@/components/SessionProvider';
import { formatCurrencyAmount } from '@/lib/currency';
import { PageLoader } from '@/components/ui/PageLoader';

const defaultForm = {
  category: '',
  limit: '',
};

export default function BudgetsPage() {
  const { currency } = useSession();
  const { showToast } = useToast();
  const month = format(new Date(), 'yyyy-MM');

  const [budgets, setBudgets] = useState<BudgetData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const loadBudgets = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiRequest<{ month: string; budgets: BudgetData[] }>(`/api/budgets?month=${month}`);
      setBudgets(data.budgets);
    } catch {
      setError('Failed to load budgets');
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => {
    void loadBudgets();
  }, [loadBudgets]);

  const totals = useMemo(() => {
    const totalBudget = budgets.reduce((sum, budget) => sum + budget.limit, 0);
    const totalSpent = budgets.reduce((sum, budget) => sum + budget.spent, 0);

    return {
      totalBudget,
      totalSpent,
      remaining: Math.max(0, totalBudget - totalSpent),
      usage: totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0,
    };
  }, [budgets]);

  const saveBudget = async (event: React.FormEvent) => {
    event.preventDefault();

    try {
      if (editingId) {
        await apiRequest(`/api/budgets/${editingId}`, {
          method: 'PUT',
          body: JSON.stringify({
            category: form.category,
            limit: Number(form.limit),
            month,
          }),
        });
      } else {
        await apiRequest('/api/budgets', {
          method: 'POST',
          body: JSON.stringify({
            category: form.category,
            limit: Number(form.limit),
            month,
          }),
        });
      }

      showToast('Budget saved', 'success');
      setShowModal(false);
      setForm(defaultForm);
      setEditingId(null);
      void loadBudgets();
    } catch {
      showToast('Failed to save budget', 'error');
    }
  };

  const deleteBudget = async () => {
    if (!deleteId) return;
    try {
      await apiRequest(`/api/budgets/${deleteId}`, { method: 'DELETE' });
      showToast('Budget deleted', 'success');
      setDeleteId(null);
      void loadBudgets();
    } catch {
      showToast('Failed to delete budget', 'error');
    }
  };

  const startEdit = (budget: BudgetData) => {
    setEditingId(budget.id);
    setForm({ category: budget.category, limit: String(budget.limit) });
    setShowModal(true);
  };

  return (
    <div className="flex flex-col gap-8 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Budgets</h1>
          <p className="text-[var(--muted)] text-sm mt-1">Set and track your spending limits by category.</p>
        </div>
        <button
          className="btn-primary"
          onClick={() => {
            setEditingId(null);
            setForm(defaultForm);
            setShowModal(true);
          }}
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          Set Budget
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="stat-card">
          <p className="text-sm text-[var(--muted)] mb-2">Total Budget</p>
          <h3 className="text-3xl font-bold">{formatCurrencyAmount(totals.totalBudget, currency)}</h3>
          <p className="text-xs text-[var(--muted)] mt-1">Across {budgets.length} categories</p>
        </div>
        <div className="stat-card">
          <p className="text-sm text-[var(--muted)] mb-2">Total Spent</p>
          <h3 className="text-3xl font-bold">{formatCurrencyAmount(totals.totalSpent, currency)}</h3>
          <p className="text-xs text-emerald-400 mt-1">{totals.usage}% of budget used</p>
        </div>
        <div className="stat-card">
          <p className="text-sm text-[var(--muted)] mb-2">Remaining</p>
          <h3 className="text-3xl font-bold text-primary">{formatCurrencyAmount(totals.remaining, currency)}</h3>
          <p className="text-xs text-[var(--muted)] mt-1">Month: {month}</p>
        </div>
      </div>

      {loading ? (
        <PageLoader title="Loading budgets" subtitle="Calculating limits and remaining balances..." />
      ) : error ? (
        <EmptyState
          icon="error"
          title="Unable to load budgets"
          description={error}
          action={
            <button className="btn-primary" onClick={() => void loadBudgets()}>
              Retry
            </button>
          }
        />
      ) : budgets.length === 0 ? (
        <EmptyState
          icon="savings"
          title="No budgets set"
          description="Set your first category budget to track spending progress."
          action={
            <button className="btn-primary" onClick={() => setShowModal(true)}>
              <span className="material-symbols-outlined text-[18px]">add</span>
              Set Budget
            </button>
          }
        />
      ) : (
        <div className="space-y-4">
          {budgets.map((budget) => {
            const isOver = budget.percentUsed >= 90;
            return (
              <div key={budget.id} className="stat-card">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold">{budget.category}</h4>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="font-bold">{formatCurrencyAmount(budget.spent, currency)}</span>
                      <span className="text-[var(--muted)] text-sm"> / {formatCurrencyAmount(budget.limit, currency)}</span>
                    </div>
                    <ActionMenu
                      items={[
                        { label: 'Edit', onClick: () => startEdit(budget) },
                        { label: 'Delete', danger: true, onClick: () => setDeleteId(budget.id) },
                      ]}
                    />
                  </div>
                </div>
                <div className="w-full bg-[var(--surface-muted)] h-2 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${isOver ? 'bg-rose-500' : 'bg-primary'}`}
                    style={{ width: `${Math.min(100, budget.percentUsed)}%` }}
                  />
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className={`text-xs font-medium ${isOver ? 'text-rose-400' : 'text-[var(--muted)]'}`}>
                    {budget.percentUsed.toFixed(0)}% used
                  </span>
                  <span className="text-xs text-[var(--muted)]">{formatCurrencyAmount(budget.remaining, currency)} remaining</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editingId ? 'Edit Budget' : 'Set Budget'}>
        <form className="space-y-4" onSubmit={saveBudget}>
          <div>
            <label className="block text-sm font-medium text-[var(--muted)] mb-1">Category</label>
            <input
              type="text"
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2.5"
              value={form.category}
              onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--muted)] mb-1">Monthly Limit</label>
            <input
              type="number"
              step="0.01"
              min="0"
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2.5"
              value={form.limit}
              onChange={(event) => setForm((current) => ({ ...current, limit: event.target.value }))}
              required
            />
          </div>

          <button type="submit" className="btn-primary w-full justify-center">
            {editingId ? 'Update Budget' : 'Create Budget'}
          </button>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteId)}
        title="Delete Budget"
        message="This budget will be removed from the current month."
        confirmText="Delete"
        danger
        onCancel={() => setDeleteId(null)}
        onConfirm={() => void deleteBudget()}
      />
    </div>
  );
}
