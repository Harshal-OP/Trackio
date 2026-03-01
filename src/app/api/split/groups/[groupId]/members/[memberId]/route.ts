import { connectDB } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { ApiHttpError, handleApiError, ok, readJson } from '@/lib/api-response';
import { splitMemberUpdateSchema } from '@/lib/validators';
import { SplitMember } from '@/models/SplitMember';
import { logSplitActivity } from '@/lib/split-utils';
import { requireGroupOwner, serializeSplitMember } from '@/lib/split-access';

export async function PATCH(
  req: Request,
  { params }: { params: { groupId: string; memberId: string } }
) {
  try {
    const session = await requireUser();
    await connectDB();

    const { member: actorMember } = await requireGroupOwner(params.groupId, session.userId);
    const body = splitMemberUpdateSchema.parse(await readJson(req));

    const member = await SplitMember.findOne({ _id: params.memberId, groupId: params.groupId });
    if (!member) {
      throw new ApiHttpError(404, 'NOT_FOUND', 'Member not found');
    }

    if (member.role === 'owner' && body.role && body.role !== 'owner') {
      throw new ApiHttpError(409, 'CONFLICT', 'Owner role cannot be removed');
    }

    if (body.guestName !== undefined) member.guestName = body.guestName;
    if (body.email !== undefined) member.email = body.email;
    if (body.role !== undefined) member.role = body.role;
    if (body.status !== undefined) member.status = body.status;

    await member.save();

    await logSplitActivity({
      groupId: params.groupId,
      actorUserId: session.userId,
      actorMemberId: actorMember._id.toString(),
      type: 'MEMBER_UPDATED',
      payload: {
        memberId: member._id.toString(),
        updates: body,
      },
    });

    return ok({ member: serializeSplitMember(member) });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: { groupId: string; memberId: string } }
) {
  try {
    const session = await requireUser();
    await connectDB();

    const { member: actorMember } = await requireGroupOwner(params.groupId, session.userId);

    const member = await SplitMember.findOne({ _id: params.memberId, groupId: params.groupId });
    if (!member) {
      throw new ApiHttpError(404, 'NOT_FOUND', 'Member not found');
    }

    if (member.role === 'owner') {
      throw new ApiHttpError(409, 'CONFLICT', 'Owner cannot be removed');
    }

    member.status = 'left';
    await member.save();

    await logSplitActivity({
      groupId: params.groupId,
      actorUserId: session.userId,
      actorMemberId: actorMember._id.toString(),
      type: 'MEMBER_REMOVED',
      payload: {
        memberId: member._id.toString(),
      },
    });

    return ok({ message: 'Member removed successfully' });
  } catch (error) {
    return handleApiError(error);
  }
}
