import { Types } from 'mongoose';
import { connectDB } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { ApiHttpError, handleApiError, ok, readJson } from '@/lib/api-response';
import { splitExpenseUpdateSchema } from '@/lib/validators';
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

export async function PATCH(
  req: Request,
  { params }: { params: { groupId: string; expenseId: string } }
) {
  try {
    const session = await requireUser();
    await connectDB();

    const { group, member } = await requireGroupMember(params.groupId, session.userId);
    const body = splitExpenseUpdateSchema.parse(await readJson(req));

    const expense = await SplitExpense.findOne({ _id: params.expenseId, groupId: params.groupId });
    if (!expense) {
      throw new ApiHttpError(404, 'NOT_FOUND', 'Expense not found');
    }

    if (member.role !== 'owner' && expense.createdByUserId.toString() !== session.userId) {
      throw new ApiHttpError(403, 'FORBIDDEN', 'Not allowed to update this expense');
    }

    if (body.currency && body.currency !== group.currency) {
      throw new ApiHttpError(409, 'CONFLICT', 'Expense currency must match group currency');
    }

    if (body.amount !== undefined || body.splits !== undefined) {
      const nextAmount = body.amount ?? expense.amount;
      const nextSplits =
        body.splits ??
        expense.splits.map((split: { memberId: Types.ObjectId; amount: number }) => ({
          memberId: split.memberId.toString(),
          amount: split.amount,
        }));

      const splitTotal = nextSplits.reduce((sum: number, split: { memberId: string; amount: number }) => sum + split.amount, 0);
      if (Math.abs(nextAmount - splitTotal) >= 0.001) {
        throw new ApiHttpError(422, 'VALIDATION_ERROR', 'Split amounts must match total amount');
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

      for (const split of nextSplits) {
        if (!memberIds.has(split.memberId.toString())) {
          throw new ApiHttpError(422, 'VALIDATION_ERROR', 'Split member does not belong to group');
        }
      }

      if (body.paidByMemberId && !memberIds.has(body.paidByMemberId)) {
        throw new ApiHttpError(422, 'VALIDATION_ERROR', 'Paid by member does not belong to group');
      }
    }

    if (body.paidByMemberId !== undefined) expense.paidByMemberId = new Types.ObjectId(body.paidByMemberId);
    if (body.amount !== undefined) expense.amount = body.amount;
    if (body.currency !== undefined) expense.currency = body.currency;
    if (body.description !== undefined) expense.description = body.description;
    if (body.splitType !== undefined) expense.splitType = body.splitType;
    if (body.splits !== undefined) {
      expense.splits = body.splits.map((split) => ({
        memberId: new Types.ObjectId(split.memberId),
        amount: split.amount,
      }));
    }
    if (body.date !== undefined) expense.date = new Date(body.date);
    if (body.notes !== undefined) expense.notes = body.notes;

    await expense.save();

    await logSplitActivity({
      groupId: params.groupId,
      actorUserId: session.userId,
      actorMemberId: member._id.toString(),
      type: 'EXPENSE_UPDATED',
      payload: {
        expenseId: expense._id.toString(),
      },
    });

    return ok({ expense: serializeExpense(expense.toObject()) });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: { groupId: string; expenseId: string } }
) {
  try {
    const session = await requireUser();
    await connectDB();

    const { member } = await requireGroupMember(params.groupId, session.userId);

    const expense = await SplitExpense.findOne({ _id: params.expenseId, groupId: params.groupId });
    if (!expense) {
      throw new ApiHttpError(404, 'NOT_FOUND', 'Expense not found');
    }

    if (member.role !== 'owner' && expense.createdByUserId.toString() !== session.userId) {
      throw new ApiHttpError(403, 'FORBIDDEN', 'Not allowed to delete this expense');
    }

    await SplitExpense.deleteOne({ _id: params.expenseId });

    await logSplitActivity({
      groupId: params.groupId,
      actorUserId: session.userId,
      actorMemberId: member._id.toString(),
      type: 'EXPENSE_DELETED',
      payload: {
        expenseId: params.expenseId,
      },
    });

    return ok({ message: 'Expense deleted successfully' });
  } catch (error) {
    return handleApiError(error);
  }
}
