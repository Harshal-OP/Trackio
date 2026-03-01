import { Types } from 'mongoose';
import { connectDB } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { ApiHttpError, handleApiError, ok, readJson } from '@/lib/api-response';
import { splitExpenseCreateSchema } from '@/lib/validators';
import { SplitExpense } from '@/models/SplitExpense';
import { SplitMember } from '@/models/SplitMember';
import { logSplitActivity } from '@/lib/split-utils';
import { requireGroupMember } from '@/lib/split-access';

function serializeExpense(expense: {
  _id: Types.ObjectId;
  groupId: Types.ObjectId;
  paidByMemberId: Types.ObjectId;
  createdByUserId: Types.ObjectId;
  amount: number;
  currency: string;
  description: string;
  splitType: string;
  splits: Array<{ memberId: Types.ObjectId; amount: number }>;
  date: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: expense._id.toString(),
    groupId: expense.groupId.toString(),
    paidByMemberId: expense.paidByMemberId.toString(),
    createdByUserId: expense.createdByUserId.toString(),
    amount: expense.amount,
    currency: expense.currency,
    description: expense.description,
    splitType: expense.splitType,
    splits: expense.splits.map((split) => ({
      memberId: split.memberId.toString(),
      amount: split.amount,
    })),
    date: expense.date,
    notes: expense.notes,
    createdAt: expense.createdAt,
    updatedAt: expense.updatedAt,
  };
}

export async function GET(_req: Request, { params }: { params: { groupId: string } }) {
  try {
    const session = await requireUser();
    await connectDB();

    await requireGroupMember(params.groupId, session.userId);

    const expenses = await SplitExpense.find({ groupId: params.groupId })
      .sort({ date: -1 })
      .lean();

    return ok({ expenses: expenses.map((expense) => serializeExpense(expense)) });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: Request, { params }: { params: { groupId: string } }) {
  try {
    const session = await requireUser();
    await connectDB();

    const { group, member } = await requireGroupMember(params.groupId, session.userId);
    const body = splitExpenseCreateSchema.parse(await readJson(req));

    if (body.currency !== group.currency) {
      throw new ApiHttpError(409, 'CONFLICT', 'Expense currency must match group currency');
    }

    const memberIds = new Set(
      (
        await SplitMember.find({
          groupId: params.groupId,
          status: { $in: ['active', 'invited'] },
        })
          .select('_id')
          .lean()
      ).map((memberItem) => memberItem._id.toString())
    );

    if (!memberIds.has(body.paidByMemberId)) {
      throw new ApiHttpError(422, 'VALIDATION_ERROR', 'Paid by member does not belong to group');
    }

    for (const split of body.splits) {
      if (!memberIds.has(split.memberId)) {
        throw new ApiHttpError(422, 'VALIDATION_ERROR', 'Split member does not belong to group');
      }
    }

    const expense = await SplitExpense.create({
      groupId: params.groupId,
      paidByMemberId: body.paidByMemberId,
      createdByUserId: session.userId,
      amount: body.amount,
      currency: body.currency,
      description: body.description,
      splitType: body.splitType,
      splits: body.splits,
      date: body.date ? new Date(body.date) : new Date(),
      notes: body.notes || '',
    });

    await logSplitActivity({
      groupId: params.groupId,
      actorUserId: session.userId,
      actorMemberId: member._id.toString(),
      type: 'EXPENSE_CREATED',
      payload: {
        expenseId: expense._id.toString(),
        amount: expense.amount,
        description: expense.description,
      },
    });

    return ok({ expense: serializeExpense(expense.toObject()) }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
