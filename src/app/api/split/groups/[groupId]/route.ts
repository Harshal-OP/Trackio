import { connectDB } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { ApiHttpError, handleApiError, ok, readJson } from '@/lib/api-response';
import { splitGroupUpdateSchema } from '@/lib/validators';
import { SplitGroup } from '@/models/SplitGroup';
import { SplitMember } from '@/models/SplitMember';
import { SplitExpense } from '@/models/SplitExpense';
import { SplitSettlement } from '@/models/SplitSettlement';
import { SplitActivity } from '@/models/SplitActivity';
import { logSplitActivity } from '@/lib/split-utils';
import { requireGroupMember, requireGroupOwner, serializeSplitGroup } from '@/lib/split-access';

export async function GET(_req: Request, { params }: { params: { groupId: string } }) {
  try {
    const session = await requireUser();
    await connectDB();

    const { group, member } = await requireGroupMember(params.groupId, session.userId);

    const [memberCount, expenseCount, settlementCount] = await Promise.all([
      SplitMember.countDocuments({ groupId: group._id, status: { $in: ['active', 'invited'] } }),
      SplitExpense.countDocuments({ groupId: group._id }),
      SplitSettlement.countDocuments({ groupId: group._id }),
    ]);

    return ok({
      group: {
        ...serializeSplitGroup(group),
        memberCount,
        membership: {
          id: member._id.toString(),
          role: member.role,
          status: member.status,
        },
      },
      stats: {
        expenseCount,
        settlementCount,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(req: Request, { params }: { params: { groupId: string } }) {
  try {
    const session = await requireUser();
    await connectDB();

    const { group, member } = await requireGroupOwner(params.groupId, session.userId);
    const body = splitGroupUpdateSchema.parse(await readJson(req));

    if (body.currency && body.currency !== group.currency) {
      const hasExpenses = await SplitExpense.exists({ groupId: group._id });
      if (hasExpenses) {
        throw new ApiHttpError(
          409,
          'CONFLICT',
          'Currency cannot be changed after expenses are added'
        );
      }
    }

    if (body.name !== undefined) group.name = body.name;
    if (body.description !== undefined) group.description = body.description;
    if (body.currency !== undefined) group.currency = body.currency;
    if (body.status !== undefined) group.status = body.status;

    await group.save();

    await logSplitActivity({
      groupId: group._id.toString(),
      actorUserId: session.userId,
      actorMemberId: member._id.toString(),
      type: 'GROUP_UPDATED',
      payload: body,
    });

    return ok({ group: serializeSplitGroup(group) });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_req: Request, { params }: { params: { groupId: string } }) {
  try {
    const session = await requireUser();
    await connectDB();

    await requireGroupOwner(params.groupId, session.userId);

    const group = await SplitGroup.findById(params.groupId);
    if (!group) {
      throw new ApiHttpError(404, 'NOT_FOUND', 'Group not found');
    }

    await Promise.all([
      SplitExpense.deleteMany({ groupId: group._id }),
      SplitSettlement.deleteMany({ groupId: group._id }),
      SplitActivity.deleteMany({ groupId: group._id }),
      SplitMember.deleteMany({ groupId: group._id }),
      SplitGroup.deleteOne({ _id: group._id }),
    ]);

    return ok({ message: 'Group deleted successfully' });
  } catch (error) {
    return handleApiError(error);
  }
}
