'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { format } from 'date-fns';
import { apiRequest } from '@/lib/client-api';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';
import { ActionMenu } from '@/components/ui/ActionMenu';
import { useToast } from '@/components/ui/Toast';
import { PageLoader } from '@/components/ui/PageLoader';

interface GroupDetail {
  id: string;
  ownerId: string;
  name: string;
  description?: string;
  currency: string;
  status: 'active' | 'archived';
  inviteCode: string;
  memberCount: number;
  membership: {
    id: string;
    role: 'owner' | 'member';
    status: 'active' | 'invited' | 'left';
  };
}

interface MemberItem {
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

interface ExpenseItem {
  id: string;
  paidByMemberId: string;
  amount: number;
  currency: string;
  description: string;
  splitType: 'equal' | 'custom';
  splits: Array<{ memberId: string; amount: number }>;
  date: string;
}

interface SettlementItem {
  id: string;
  payerMemberId: string;
  receiverMemberId: string;
  amount: number;
  currency: string;
  date: string;
  note?: string;
}

interface ActivityItem {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  createdAt: string;
}

interface BalanceItem {
  memberId: string;
  amount: number;
  member?: {
    name: string;
    email?: string;
  };
}

type TabKey = 'overview' | 'expenses' | 'members' | 'activity' | 'settlements';

const TABS: Array<{ key: TabKey; label: string }> = [
  { key: 'overview', label: 'Overview' },
  { key: 'expenses', label: 'Expenses' },
  { key: 'members', label: 'Members' },
  { key: 'activity', label: 'Activity' },
  { key: 'settlements', label: 'Settlements' },
];

export default function SplitGroupDetailPage() {
  const params = useParams<{ groupId: string }>();
  const groupId = params.groupId;
  const { showToast } = useToast();

  const [tab, setTab] = useState<TabKey>('overview');
  const [group, setGroup] = useState<GroupDetail | null>(null);
  const [members, setMembers] = useState<MemberItem[]>([]);
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [settlements, setSettlements] = useState<SettlementItem[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [balances, setBalances] = useState<BalanceItem[]>([]);
  const [suggestedTransfers, setSuggestedTransfers] = useState<Array<{ fromMemberId: string; toMemberId: string; amount: number }>>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [memberModal, setMemberModal] = useState(false);
  const [expenseModal, setExpenseModal] = useState(false);
  const [settlementModal, setSettlementModal] = useState(false);

  const [memberForm, setMemberForm] = useState({ guestName: '', email: '' });
  const [expenseForm, setExpenseForm] = useState({
    description: '',
    amount: '',
    paidByMemberId: '',
    selectedMemberIds: [] as string[],
    date: format(new Date(), 'yyyy-MM-dd'),
    notes: '',
  });
  const [settlementForm, setSettlementForm] = useState({
    payerMemberId: '',
    receiverMemberId: '',
    amount: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    note: '',
  });

  const memberName = (memberId: string) => {
    const member = members.find((item) => item.id === memberId);
    return member?.guestName || member?.email || 'Member';
  };

  const activeMembers = useMemo(
    () => members.filter((member) => member.status === 'active' || member.status === 'invited'),
    [members]
  );

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const [groupData, membersData, expensesData, settlementsData, activityData, balancesData] = await Promise.all([
        apiRequest<{ group: GroupDetail }>(`/api/split/groups/${groupId}`),
        apiRequest<{ members: MemberItem[] }>(`/api/split/groups/${groupId}/members`),
        apiRequest<{ expenses: ExpenseItem[] }>(`/api/split/groups/${groupId}/expenses`),
        apiRequest<{ settlements: SettlementItem[] }>(`/api/split/groups/${groupId}/settlements`),
        apiRequest<{ activity: ActivityItem[] }>(`/api/split/groups/${groupId}/activity`),
        apiRequest<{ balances: BalanceItem[]; transfers: Array<{ fromMemberId: string; toMemberId: string; amount: number }> }>(
          `/api/split/groups/${groupId}/balances`
        ),
      ]);

      setGroup(groupData.group);
      setMembers(membersData.members);
      setExpenses(expensesData.expenses);
      setSettlements(settlementsData.settlements);
      setActivity(activityData.activity);
      setBalances(balancesData.balances);
      setSuggestedTransfers(balancesData.transfers);
    } catch {
      setError('Failed to load group details');
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    if (!groupId) return;
    void loadAll();
  }, [groupId, loadAll]);

  const addMember = async (event: React.FormEvent) => {
    event.preventDefault();

    try {
      await apiRequest(`/api/split/groups/${groupId}/members`, {
        method: 'POST',
        body: JSON.stringify({
          guestName: memberForm.guestName,
          email: memberForm.email,
          role: 'member',
          status: 'invited',
        }),
      });
      showToast('Member invited', 'success');
      setMemberModal(false);
      setMemberForm({ guestName: '', email: '' });
      void loadAll();
    } catch {
      showToast('Failed to add member', 'error');
    }
  };

  const addExpense = async (event: React.FormEvent) => {
    event.preventDefault();

    const amount = Number(expenseForm.amount);
    const selected = expenseForm.selectedMemberIds.length > 0 ? expenseForm.selectedMemberIds : activeMembers.map((member) => member.id);
    const perMember = selected.length > 0 ? Number((amount / selected.length).toFixed(2)) : 0;

    const splits = selected.map((memberId, index) => {
      if (index === selected.length - 1) {
        const assigned = perMember * (selected.length - 1);
        return { memberId, amount: Number((amount - assigned).toFixed(2)) };
      }
      return { memberId, amount: perMember };
    });

    try {
      await apiRequest(`/api/split/groups/${groupId}/expenses`, {
        method: 'POST',
        body: JSON.stringify({
          paidByMemberId: expenseForm.paidByMemberId,
          amount,
          currency: group?.currency,
          description: expenseForm.description,
          splitType: 'equal',
          splits,
          date: expenseForm.date,
          notes: expenseForm.notes,
        }),
      });

      showToast('Expense added', 'success');
      setExpenseModal(false);
      setExpenseForm({
        description: '',
        amount: '',
        paidByMemberId: '',
        selectedMemberIds: [],
        date: format(new Date(), 'yyyy-MM-dd'),
        notes: '',
      });
      void loadAll();
    } catch {
      showToast('Failed to add expense', 'error');
    }
  };

  const addSettlement = async (event: React.FormEvent) => {
    event.preventDefault();

    try {
      await apiRequest(`/api/split/groups/${groupId}/settlements`, {
        method: 'POST',
        body: JSON.stringify({
          payerMemberId: settlementForm.payerMemberId,
          receiverMemberId: settlementForm.receiverMemberId,
          amount: Number(settlementForm.amount),
          currency: group?.currency,
          date: settlementForm.date,
          note: settlementForm.note,
        }),
      });

      showToast('Settlement recorded', 'success');
      setSettlementModal(false);
      setSettlementForm({
        payerMemberId: '',
        receiverMemberId: '',
        amount: '',
        date: format(new Date(), 'yyyy-MM-dd'),
        note: '',
      });
      void loadAll();
    } catch {
      showToast('Failed to record settlement', 'error');
    }
  };

  const removeMember = async (memberId: string) => {
    try {
      await apiRequest(`/api/split/groups/${groupId}/members/${memberId}`, {
        method: 'DELETE',
      });
      showToast('Member removed', 'success');
      void loadAll();
    } catch {
      showToast('Failed to remove member', 'error');
    }
  };

  const regenerateInvite = async () => {
    try {
      const data = await apiRequest<{ invite: { inviteCode: string; passcode: string } }>(
        `/api/split/groups/${groupId}/invite/regenerate`,
        { method: 'POST' }
      );
      showToast(`New invite: ${data.invite.inviteCode} / ${data.invite.passcode}`, 'success');
      void loadAll();
    } catch {
      showToast('Failed to regenerate invite', 'error');
    }
  };

  if (loading) {
    return <PageLoader title="Loading split group" subtitle="Fetching members, expenses, and balances..." rows={5} />;
  }

  if (error || !group) {
    return (
      <EmptyState
        icon="error"
        title="Group unavailable"
        description={error || 'Could not load this group.'}
        action={
          <button className="btn-primary" onClick={() => void loadAll()}>
            Retry
          </button>
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{group.name}</h1>
          <p className="text-sm text-[var(--muted)] mt-1">{group.description || 'No description provided.'}</p>
        </div>
        <div className="flex gap-3">
          <button className="btn-secondary" onClick={regenerateInvite}>
            Regenerate Invite
          </button>
          <button className="btn-secondary" onClick={() => setMemberModal(true)}>
            Add Member
          </button>
          <button className="btn-primary" onClick={() => setExpenseModal(true)}>
            Add Expense
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="stat-card py-4">
          <p className="text-xs text-[var(--muted)]">Currency</p>
          <p className="text-xl font-semibold">{group.currency}</p>
        </div>
        <div className="stat-card py-4">
          <p className="text-xs text-[var(--muted)]">Members</p>
          <p className="text-xl font-semibold">{group.memberCount}</p>
        </div>
        <div className="stat-card py-4">
          <p className="text-xs text-[var(--muted)]">Expenses</p>
          <p className="text-xl font-semibold">{expenses.length}</p>
        </div>
        <div className="stat-card py-4">
          <p className="text-xs text-[var(--muted)]">Settlements</p>
          <p className="text-xl font-semibold">{settlements.length}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {TABS.map((item) => (
          <button
            key={item.key}
            className={`rounded-lg px-3 py-1.5 text-sm ${tab === item.key ? 'bg-[var(--surface)] border border-[var(--border)]' : 'text-[var(--muted)] hover:bg-[var(--surface)]'}`}
            onClick={() => setTab(item.key)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === 'overview' ? (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div className="stat-card">
            <h3 className="font-semibold mb-3">Net Balances</h3>
            <div className="space-y-2">
              {balances.map((balance) => (
                <div key={balance.memberId} className="flex items-center justify-between rounded-lg bg-[var(--surface-muted)] px-3 py-2 text-sm">
                  <span>{balance.member?.name || memberName(balance.memberId)}</span>
                  <span className={balance.amount >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                    {balance.amount >= 0 ? '+' : ''}{balance.amount.toFixed(2)} {group.currency}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="stat-card">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-semibold">Suggested Settlements</h3>
              <button className="btn-secondary" onClick={() => setSettlementModal(true)}>
                Record Settlement
              </button>
            </div>
            <div className="space-y-2">
              {suggestedTransfers.length === 0 ? (
                <p className="text-sm text-[var(--muted)]">All balances are settled.</p>
              ) : (
                suggestedTransfers.map((transfer, index) => (
                  <div key={`${transfer.fromMemberId}-${transfer.toMemberId}-${index}`} className="rounded-lg bg-[var(--surface-muted)] px-3 py-2 text-sm">
                    <span className="font-medium">{memberName(transfer.fromMemberId)}</span>
                    <span className="text-[var(--muted)]"> pays </span>
                    <span className="font-medium">{memberName(transfer.toMemberId)}</span>
                    <span className="text-[var(--muted)]"> {transfer.amount.toFixed(2)} {group.currency}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      ) : null}

      {tab === 'expenses' ? (
        <div className="stat-card">
          <h3 className="font-semibold mb-3">Expenses</h3>
          <div className="space-y-2">
            {expenses.map((expense) => (
              <div key={expense.id} className="rounded-lg bg-[var(--surface-muted)] px-3 py-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{expense.description}</span>
                  <span>{expense.amount.toFixed(2)} {group.currency}</span>
                </div>
                <p className="text-xs text-[var(--muted)] mt-1">
                  Paid by {memberName(expense.paidByMemberId)} on {format(new Date(expense.date), 'MMM d, yyyy')}
                </p>
              </div>
            ))}
            {expenses.length === 0 ? <p className="text-sm text-[var(--muted)]">No expenses yet.</p> : null}
          </div>
        </div>
      ) : null}

      {tab === 'members' ? (
        <div className="stat-card">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-semibold">Members</h3>
            <button className="btn-secondary" onClick={() => setMemberModal(true)}>Add Member</button>
          </div>
          <div className="space-y-2">
            {members.map((member) => (
              <div key={member.id} className="flex items-center justify-between rounded-lg bg-[var(--surface-muted)] px-3 py-2 text-sm">
                <div>
                  <p className="font-medium">{member.guestName || member.email || 'Member'}</p>
                  <p className="text-xs text-[var(--muted)] capitalize">{member.role} • {member.status}</p>
                </div>
                {group.membership.role === 'owner' && member.role !== 'owner' ? (
                  <ActionMenu
                    items={[
                      {
                        label: 'Remove Member',
                        danger: true,
                        onClick: () => void removeMember(member.id),
                      },
                    ]}
                  />
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {tab === 'activity' ? (
        <div className="stat-card">
          <h3 className="font-semibold mb-3">Activity</h3>
          <div className="space-y-2">
            {activity.map((item) => (
              <div key={item.id} className="rounded-lg bg-[var(--surface-muted)] px-3 py-2 text-sm">
                <p className="font-medium">{item.type.replace(/_/g, ' ')}</p>
                <p className="text-xs text-[var(--muted)] mt-1">{format(new Date(item.createdAt), 'MMM d, yyyy h:mm a')}</p>
              </div>
            ))}
            {activity.length === 0 ? <p className="text-sm text-[var(--muted)]">No activity yet.</p> : null}
          </div>
        </div>
      ) : null}

      {tab === 'settlements' ? (
        <div className="stat-card">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-semibold">Settlements</h3>
            <button className="btn-secondary" onClick={() => setSettlementModal(true)}>Record Settlement</button>
          </div>
          <div className="space-y-2">
            {settlements.map((settlement) => (
              <div key={settlement.id} className="rounded-lg bg-[var(--surface-muted)] px-3 py-2 text-sm">
                <p>
                  <span className="font-medium">{memberName(settlement.payerMemberId)}</span>
                  <span className="text-[var(--muted)]"> paid </span>
                  <span className="font-medium">{memberName(settlement.receiverMemberId)}</span>
                  <span className="text-[var(--muted)]"> {settlement.amount.toFixed(2)} {group.currency}</span>
                </p>
                <p className="text-xs text-[var(--muted)] mt-1">{format(new Date(settlement.date), 'MMM d, yyyy')}</p>
              </div>
            ))}
            {settlements.length === 0 ? <p className="text-sm text-[var(--muted)]">No settlements yet.</p> : null}
          </div>
        </div>
      ) : null}

      <Modal open={memberModal} onClose={() => setMemberModal(false)} title="Add Member">
        <form className="space-y-4" onSubmit={addMember}>
          <div>
            <label className="block text-sm text-[var(--muted)] mb-1">Name</label>
            <input className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2.5" value={memberForm.guestName} onChange={(event) => setMemberForm((current) => ({ ...current, guestName: event.target.value }))} required />
          </div>
          <div>
            <label className="block text-sm text-[var(--muted)] mb-1">Email</label>
            <input type="email" className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2.5" value={memberForm.email} onChange={(event) => setMemberForm((current) => ({ ...current, email: event.target.value }))} required />
          </div>
          <button className="btn-primary w-full justify-center">Invite Member</button>
        </form>
      </Modal>

      <Modal open={expenseModal} onClose={() => setExpenseModal(false)} title="Add Expense">
        <form className="space-y-4" onSubmit={addExpense}>
          <div>
            <label className="block text-sm text-[var(--muted)] mb-1">Description</label>
            <input className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2.5" value={expenseForm.description} onChange={(event) => setExpenseForm((current) => ({ ...current, description: event.target.value }))} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-[var(--muted)] mb-1">Amount ({group.currency})</label>
              <input type="number" step="0.01" min="0" className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2.5" value={expenseForm.amount} onChange={(event) => setExpenseForm((current) => ({ ...current, amount: event.target.value }))} required />
            </div>
            <div>
              <label className="block text-sm text-[var(--muted)] mb-1">Date</label>
              <input type="date" className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2.5" value={expenseForm.date} onChange={(event) => setExpenseForm((current) => ({ ...current, date: event.target.value }))} required />
            </div>
          </div>

          <div>
            <label className="block text-sm text-[var(--muted)] mb-1">Paid By</label>
            <select className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2.5" value={expenseForm.paidByMemberId} onChange={(event) => setExpenseForm((current) => ({ ...current, paidByMemberId: event.target.value }))} required>
              <option value="">Select member</option>
              {activeMembers.map((member) => (
                <option key={member.id} value={member.id}>{member.guestName || member.email || 'Member'}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-[var(--muted)] mb-1">Split Between</label>
            <div className="space-y-1 rounded-lg border border-[var(--border)] bg-[var(--background)] p-2">
              {activeMembers.map((member) => {
                const checked = expenseForm.selectedMemberIds.includes(member.id);
                return (
                  <label key={member.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(event) => {
                        setExpenseForm((current) => ({
                          ...current,
                          selectedMemberIds: event.target.checked
                            ? [...current.selectedMemberIds, member.id]
                            : current.selectedMemberIds.filter((id) => id !== member.id),
                        }));
                      }}
                    />
                    <span>{member.guestName || member.email || 'Member'}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <button className="btn-primary w-full justify-center">Add Expense</button>
        </form>
      </Modal>

      <Modal open={settlementModal} onClose={() => setSettlementModal(false)} title="Record Settlement">
        <form className="space-y-4" onSubmit={addSettlement}>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-[var(--muted)] mb-1">Payer</label>
              <select className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2.5" value={settlementForm.payerMemberId} onChange={(event) => setSettlementForm((current) => ({ ...current, payerMemberId: event.target.value }))} required>
                <option value="">Select</option>
                {activeMembers.map((member) => (
                  <option key={member.id} value={member.id}>{member.guestName || member.email || 'Member'}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-[var(--muted)] mb-1">Receiver</label>
              <select className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2.5" value={settlementForm.receiverMemberId} onChange={(event) => setSettlementForm((current) => ({ ...current, receiverMemberId: event.target.value }))} required>
                <option value="">Select</option>
                {activeMembers.map((member) => (
                  <option key={member.id} value={member.id}>{member.guestName || member.email || 'Member'}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-[var(--muted)] mb-1">Amount ({group.currency})</label>
              <input type="number" step="0.01" min="0" className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2.5" value={settlementForm.amount} onChange={(event) => setSettlementForm((current) => ({ ...current, amount: event.target.value }))} required />
            </div>
            <div>
              <label className="block text-sm text-[var(--muted)] mb-1">Date</label>
              <input type="date" className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2.5" value={settlementForm.date} onChange={(event) => setSettlementForm((current) => ({ ...current, date: event.target.value }))} required />
            </div>
          </div>

          <button className="btn-primary w-full justify-center">Record Settlement</button>
        </form>
      </Modal>
    </div>
  );
}
