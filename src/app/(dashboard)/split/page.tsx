'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { apiRequest } from '@/lib/client-api';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';
import { ActionMenu } from '@/components/ui/ActionMenu';
import { useToast } from '@/components/ui/Toast';
import { useSession } from '@/components/SessionProvider';
import { normalizeCurrencyCode } from '@/lib/currency';
import { PageLoader } from '@/components/ui/PageLoader';

interface GroupListItem {
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
  membership: {
    id: string;
    role: 'owner' | 'member';
    status: 'active' | 'invited' | 'left';
  };
}

export default function SplitGroupsPage() {
  const { currency } = useSession();
  const { showToast } = useToast();
  const [groups, setGroups] = useState<GroupListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);

  const [createForm, setCreateForm] = useState({
    name: '',
    description: '',
    currency: normalizeCurrencyCode(currency),
    passcode: '',
  });

  const [joinForm, setJoinForm] = useState({
    inviteCode: '',
    passcode: '',
  });

  const [latestInvite, setLatestInvite] = useState<{ inviteCode: string; passcode: string } | null>(null);

  const openCreateModal = () => {
    setCreateForm({
      name: '',
      description: '',
      currency: normalizeCurrencyCode(currency),
      passcode: '',
    });
    setCreateOpen(true);
  };

  const loadGroups = async () => {
    setLoading(true);
    setError('');

    try {
      const data = await apiRequest<{ groups: GroupListItem[] }>('/api/split/groups');
      setGroups(data.groups);
    } catch {
      setError('Failed to load split groups');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadGroups();
  }, []);

  const createGroup = async (event: React.FormEvent) => {
    event.preventDefault();
    setCreating(true);
    try {
      const data = await apiRequest<{ group: GroupListItem; invite: { inviteCode: string; passcode: string } }>('/api/split/groups', {
        method: 'POST',
        body: JSON.stringify(createForm),
      });

      showToast('Group created', 'success');
      setCreateOpen(false);
      setCreateForm({ name: '', description: '', currency: normalizeCurrencyCode(currency), passcode: '' });
      setLatestInvite(data.invite);
      void loadGroups();
    } catch {
      showToast('Failed to create group', 'error');
    } finally {
      setCreating(false);
    }
  };

  const joinGroup = async (event: React.FormEvent) => {
    event.preventDefault();
    setJoining(true);
    try {
      await apiRequest('/api/split/groups/join', {
        method: 'POST',
        body: JSON.stringify(joinForm),
      });

      showToast('Joined group successfully', 'success');
      setJoinOpen(false);
      setJoinForm({ inviteCode: '', passcode: '' });
      void loadGroups();
    } catch {
      showToast('Join failed. Check invite code/passcode.', 'error');
    } finally {
      setJoining(false);
    }
  };

  const regenerateInvite = async (groupId: string) => {
    try {
      const data = await apiRequest<{ invite: { inviteCode: string; passcode: string } }>(`/api/split/groups/${groupId}/invite/regenerate`, {
        method: 'POST',
      });
      setLatestInvite(data.invite);
      showToast('Invite code regenerated', 'success');
      void loadGroups();
    } catch {
      showToast('Failed to regenerate invite', 'error');
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Split Groups</h1>
          <p className="text-sm text-[var(--muted)] mt-1">Create groups, split bills, and settle balances.</p>
        </div>
        <div className="flex gap-3">
          <button className="btn-secondary" onClick={() => setJoinOpen(true)}>
            <span className="material-symbols-outlined text-[18px]">group_add</span>
            Join Group
          </button>
          <button className="btn-primary" onClick={openCreateModal}>
            <span className="material-symbols-outlined text-[18px]">add</span>
            Create Group
          </button>
        </div>
      </div>

      {latestInvite ? (
        <div className="rounded-xl border border-primary/30 bg-primary/10 p-4">
          <p className="text-sm font-semibold text-primary">Latest Invite Credentials</p>
          <p className="text-xs text-[var(--muted)] mt-1">Share both with members to join.</p>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-[var(--surface)] px-3 py-2">
              <p className="text-[10px] uppercase text-[var(--muted)]">Invite Code</p>
              <p className="font-semibold">{latestInvite.inviteCode}</p>
            </div>
            <div className="rounded-lg bg-[var(--surface)] px-3 py-2">
              <p className="text-[10px] uppercase text-[var(--muted)]">Passcode</p>
              <p className="font-semibold">{latestInvite.passcode}</p>
            </div>
          </div>
        </div>
      ) : null}

      {loading ? (
        <PageLoader title="Loading split groups" subtitle="Syncing members, invites, and balances..." />
      ) : error ? (
        <EmptyState
          icon="error"
          title="Unable to load split groups"
          description={error}
          action={
            <button className="btn-primary" onClick={() => void loadGroups()}>
              Retry
            </button>
          }
        />
      ) : groups.length === 0 ? (
        <EmptyState
          icon="group"
          title="No split groups yet"
          description="Create your first group or join with invite code + passcode."
          action={
            <button className="btn-primary" onClick={openCreateModal}>
              <span className="material-symbols-outlined text-[18px]">add</span>
              Create Group
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {groups.map((group) => (
            <div key={group.id} className="stat-card flex flex-col gap-3">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-lg">{group.name}</h3>
                  <p className="text-sm text-[var(--muted)]">{group.description || 'No description'}</p>
                </div>
                {group.membership.role === 'owner' ? (
                  <ActionMenu
                    items={[
                      {
                        label: 'Regenerate Invite',
                        onClick: () => void regenerateInvite(group.id),
                      },
                    ]}
                  />
                ) : null}
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-lg bg-[var(--surface-muted)] px-3 py-2">
                  <p className="text-[10px] uppercase text-[var(--muted)]">Currency</p>
                  <p>{group.currency}</p>
                </div>
                <div className="rounded-lg bg-[var(--surface-muted)] px-3 py-2">
                  <p className="text-[10px] uppercase text-[var(--muted)]">Members</p>
                  <p>{group.memberCount}</p>
                </div>
                <div className="rounded-lg bg-[var(--surface-muted)] px-3 py-2 col-span-2">
                  <p className="text-[10px] uppercase text-[var(--muted)]">Your Role</p>
                  <p className="capitalize">{group.membership.role}</p>
                </div>
              </div>
              <Link href={`/split/${group.id}`} className="btn-secondary justify-center mt-1">
                Open Group
              </Link>
            </div>
          ))}
        </div>
      )}

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create Split Group">
        <form className="space-y-4" onSubmit={createGroup}>
          <div>
            <label className="block text-sm text-[var(--muted)] mb-1">Group Name</label>
            <input className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2.5" value={createForm.name} onChange={(event) => setCreateForm((current) => ({ ...current, name: event.target.value }))} required />
          </div>
          <div>
            <label className="block text-sm text-[var(--muted)] mb-1">Description</label>
            <textarea className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2.5" rows={2} value={createForm.description} onChange={(event) => setCreateForm((current) => ({ ...current, description: event.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-[var(--muted)] mb-1">Currency (3-letter)</label>
              <input className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 uppercase" maxLength={3} value={createForm.currency} onChange={(event) => setCreateForm((current) => ({ ...current, currency: event.target.value.toUpperCase() }))} required />
            </div>
            <div>
              <label className="block text-sm text-[var(--muted)] mb-1">Passcode</label>
              <input className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2.5" value={createForm.passcode} onChange={(event) => setCreateForm((current) => ({ ...current, passcode: event.target.value }))} required />
            </div>
          </div>
          <button className="btn-primary w-full justify-center" disabled={creating}>
            {creating ? 'Creating...' : 'Create Group'}
          </button>
        </form>
      </Modal>

      <Modal open={joinOpen} onClose={() => setJoinOpen(false)} title="Join Group">
        <form className="space-y-4" onSubmit={joinGroup}>
          <div>
            <label className="block text-sm text-[var(--muted)] mb-1">Invite Code</label>
            <input className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 uppercase" value={joinForm.inviteCode} onChange={(event) => setJoinForm((current) => ({ ...current, inviteCode: event.target.value.toUpperCase() }))} required />
          </div>
          <div>
            <label className="block text-sm text-[var(--muted)] mb-1">Passcode</label>
            <input className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2.5" value={joinForm.passcode} onChange={(event) => setJoinForm((current) => ({ ...current, passcode: event.target.value }))} required />
          </div>
          <button className="btn-primary w-full justify-center" disabled={joining}>
            {joining ? 'Joining...' : 'Join Group'}
          </button>
        </form>
      </Modal>
    </div>
  );
}
