import { Types } from 'mongoose';
import { connectDB } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { ApiHttpError, handleApiError, ok, readJson } from '@/lib/api-response';
import { splitSettlementCreateSchema } from '@/lib/validators';
import { SplitSettlement } from '@/models/SplitSettlement';
import { SplitExpense } from '@/models/SplitExpense';
import { SplitMember } from '@/models/SplitMember';
import { calculateGroupBalances, logSplitActivity } from '@/lib/split-utils';
import { requireGroupMember } from '@/lib/split-access';

function serializeSettlement(settlement: {
  _id: Types.ObjectId;
  groupId: Types.ObjectId;
  payerMemberId: Types.ObjectId;
  receiverMemberId: Types.ObjectId;
  createdByUserId: Types.ObjectId;
  amount: number;
  currency: string;
  date: Date;
  note?: string;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: settlement._id.toString(),
    groupId: settlement.groupId.toString(),
    payerMemberId: settlement.payerMemberId.toString(),
    receiverMemberId: settlement.receiverMemberId.toString(),
    createdByUserId: settlement.createdByUserId.toString(),
    amount: settlement.amount,
    currency: settlement.currency,
    date: settlement.date,
    note: settlement.note,
    createdAt: settlement.createdAt,
    updatedAt: settlement.updatedAt,
  };
}

export async function GET(_req: Request, { params }: { params: { groupId: string } }) {
  try {
    const session = await requireUser();
    await connectDB();

    await requireGroupMember(params.groupId, session.userId);

    const settlements = await SplitSettlement.find({ groupId: params.groupId })
      .sort({ date: -1 })
      .lean();

    return ok({ settlements: settlements.map((settlement) => serializeSettlement(settlement)) });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: Request, { params }: { params: { groupId: string } }) {
  try {
    const session = await requireUser();
    await connectDB();

    const { group, member } = await requireGroupMember(params.groupId, session.userId);
    const body = splitSettlementCreateSchema.parse(await readJson(req));

    if (body.currency !== group.currency) {
      throw new ApiHttpError(409, 'CONFLICT', 'Settlement currency must match group currency');
    }

    const members = await SplitMember.find({
      groupId: params.groupId,
      status: { $in: ['active', 'invited'] },
    })
      .select('_id')
      .lean();

    const memberIds = new Set(members.map((memberItem) => memberItem._id.toString()));
    if (!memberIds.has(body.payerMemberId) || !memberIds.has(body.receiverMemberId)) {
      throw new ApiHttpError(422, 'VALIDATION_ERROR', 'Settlement members must belong to group');
    }

    const [expenses, settlements] = await Promise.all([
      SplitExpense.find({ groupId: params.groupId }).lean(),
      SplitSettlement.find({ groupId: params.groupId }).lean(),
    ]);

    const balanceResult = calculateGroupBalances(expenses, settlements);
    const payerBalance = balanceResult.balances[body.payerMemberId] || 0;
    const receiverBalance = balanceResult.balances[body.receiverMemberId] || 0;

    if (payerBalance >= 0) {
      throw new ApiHttpError(409, 'CONFLICT', 'Payer has no outstanding debt');
    }

    if (receiverBalance <= 0) {
      throw new ApiHttpError(409, 'CONFLICT', 'Receiver is not owed any amount');
    }

    const maxAllowed = Math.min(Math.abs(payerBalance), receiverBalance);
    if (body.amount > maxAllowed + 0.001) {
      throw new ApiHttpError(409, 'CONFLICT', 'Settlement exceeds outstanding balance');
    }

    const settlement = await SplitSettlement.create({
      groupId: params.groupId,
      payerMemberId: body.payerMemberId,
      receiverMemberId: body.receiverMemberId,
      createdByUserId: session.userId,
      amount: body.amount,
      currency: body.currency,
      date: body.date ? new Date(body.date) : new Date(),
      note: body.note || '',
    });

    await logSplitActivity({
      groupId: params.groupId,
      actorUserId: session.userId,
      actorMemberId: member._id.toString(),
      type: 'SETTLEMENT_CREATED',
      payload: {
        settlementId: settlement._id.toString(),
        amount: settlement.amount,
      },
    });

    return ok({ settlement: serializeSettlement(settlement.toObject()) }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
