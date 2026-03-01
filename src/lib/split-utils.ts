import { Types } from 'mongoose';
import { SplitActivity, SplitActivityType } from '@/models/SplitActivity';

type ObjectIdLike = Types.ObjectId | string;

interface ExpenseLike {
  paidByMemberId: ObjectIdLike;
  amount: number;
  splits: Array<{ memberId: ObjectIdLike; amount: number }>;
}

interface SettlementLike {
  payerMemberId: ObjectIdLike;
  receiverMemberId: ObjectIdLike;
  amount: number;
}

export interface TransferSuggestion {
  fromMemberId: string;
  toMemberId: string;
  amount: number;
}

export interface BalanceResult {
  balances: Record<string, number>;
  transfers: TransferSuggestion[];
}

function toId(value: ObjectIdLike): string {
  return typeof value === 'string' ? value : value.toString();
}

function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

export function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i += 1) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export function generatePasscode(): string {
  return `${Math.floor(100000 + Math.random() * 900000)}`;
}

export function calculateGroupBalances(expenses: ExpenseLike[], settlements: SettlementLike[]): BalanceResult {
  const balances: Record<string, number> = {};

  for (const expense of expenses) {
    const paidBy = toId(expense.paidByMemberId);
    balances[paidBy] = (balances[paidBy] || 0) + expense.amount;

    for (const share of expense.splits) {
      const memberId = toId(share.memberId);
      balances[memberId] = (balances[memberId] || 0) - share.amount;
    }
  }

  for (const settlement of settlements) {
    const payer = toId(settlement.payerMemberId);
    const receiver = toId(settlement.receiverMemberId);

    balances[payer] = (balances[payer] || 0) + settlement.amount;
    balances[receiver] = (balances[receiver] || 0) - settlement.amount;
  }

  Object.keys(balances).forEach((memberId) => {
    balances[memberId] = roundCurrency(balances[memberId]);
  });

  const creditors = Object.entries(balances)
    .filter(([, balance]) => balance > 0)
    .map(([memberId, balance]) => ({ memberId, balance }))
    .sort((a, b) => b.balance - a.balance);

  const debtors = Object.entries(balances)
    .filter(([, balance]) => balance < 0)
    .map(([memberId, balance]) => ({ memberId, balance: Math.abs(balance) }))
    .sort((a, b) => b.balance - a.balance);

  const transfers: TransferSuggestion[] = [];

  let creditorIndex = 0;
  let debtorIndex = 0;

  while (creditorIndex < creditors.length && debtorIndex < debtors.length) {
    const creditor = creditors[creditorIndex];
    const debtor = debtors[debtorIndex];
    const amount = roundCurrency(Math.min(creditor.balance, debtor.balance));

    if (amount > 0) {
      transfers.push({
        fromMemberId: debtor.memberId,
        toMemberId: creditor.memberId,
        amount,
      });
    }

    creditor.balance = roundCurrency(creditor.balance - amount);
    debtor.balance = roundCurrency(debtor.balance - amount);

    if (creditor.balance <= 0.001) creditorIndex += 1;
    if (debtor.balance <= 0.001) debtorIndex += 1;
  }

  return { balances, transfers };
}

export async function logSplitActivity(params: {
  groupId: string;
  actorUserId?: string;
  actorMemberId?: string;
  type: SplitActivityType;
  payload?: Record<string, unknown>;
}) {
  await SplitActivity.create({
    groupId: new Types.ObjectId(params.groupId),
    actorUserId: params.actorUserId ? new Types.ObjectId(params.actorUserId) : undefined,
    actorMemberId: params.actorMemberId ? new Types.ObjectId(params.actorMemberId) : undefined,
    type: params.type,
    payload: params.payload || {},
  });
}
