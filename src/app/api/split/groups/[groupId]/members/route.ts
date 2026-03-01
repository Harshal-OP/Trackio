import { Types } from 'mongoose';
import { connectDB } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { ApiHttpError, handleApiError, ok, readJson } from '@/lib/api-response';
import { splitMemberCreateSchema } from '@/lib/validators';
import { SplitMember } from '@/models/SplitMember';
import { User } from '@/models/User';
import { logSplitActivity } from '@/lib/split-utils';
import { requireGroupMember, requireGroupOwner, serializeSplitMember } from '@/lib/split-access';

export async function GET(_req: Request, { params }: { params: { groupId: string } }) {
  try {
    const session = await requireUser();
    await connectDB();

    await requireGroupMember(params.groupId, session.userId);

    const members = await SplitMember.find({ groupId: params.groupId })
      .sort({ createdAt: 1 })
      .lean();

    return ok({ members: members.map((member) => serializeSplitMember(member)) });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: Request, { params }: { params: { groupId: string } }) {
  try {
    const session = await requireUser();
    await connectDB();

    const { member: actorMember } = await requireGroupOwner(params.groupId, session.userId);
    const body = splitMemberCreateSchema.parse(await readJson(req));

    const groupId = new Types.ObjectId(params.groupId);

    let userId: Types.ObjectId | undefined;
    let email = body.email?.toLowerCase();
    let guestName = body.guestName;

    if (body.userId) {
      const user = await User.findById(body.userId).lean();
      if (!user) {
        throw new ApiHttpError(404, 'NOT_FOUND', 'User not found');
      }
      userId = new Types.ObjectId(body.userId);
      email = user.email;
      guestName = user.name;
    }

    if (!userId && email) {
      const linkedUser = await User.findOne({ email }).lean();
      if (linkedUser) {
        userId = linkedUser._id;
        guestName = linkedUser.name;
      }
    }

    const existing = userId
      ? await SplitMember.findOne({ groupId, userId })
      : email
        ? await SplitMember.findOne({ groupId, email })
        : null;

    if (existing) {
      existing.status = 'invited';
      if (guestName) existing.guestName = guestName;
      if (email) existing.email = email;
      await existing.save();

      return ok({ member: serializeSplitMember(existing) });
    }

    const status = body.status || (userId ? 'active' : 'invited');

    const member = await SplitMember.create({
      groupId,
      userId,
      guestName,
      email,
      role: body.role || 'member',
      status,
    });

    await logSplitActivity({
      groupId: params.groupId,
      actorUserId: session.userId,
      actorMemberId: actorMember._id.toString(),
      type: 'MEMBER_ADDED',
      payload: {
        memberId: member._id.toString(),
        email: member.email,
        guestName: member.guestName,
      },
    });

    return ok({ member: serializeSplitMember(member) }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
