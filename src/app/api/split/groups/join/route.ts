import bcrypt from 'bcryptjs';
import { Types } from 'mongoose';
import { connectDB } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { ApiHttpError, handleApiError, ok, readJson } from '@/lib/api-response';
import { splitJoinSchema } from '@/lib/validators';
import { SplitGroup } from '@/models/SplitGroup';
import { SplitMember } from '@/models/SplitMember';
import { logSplitActivity } from '@/lib/split-utils';
import { serializeSplitGroup, serializeSplitMember } from '@/lib/split-access';

export async function POST(req: Request) {
  try {
    const session = await requireUser();
    await connectDB();

    const body = splitJoinSchema.parse(await readJson(req));

    const group = await SplitGroup.findOne({ inviteCode: body.inviteCode.toUpperCase() });
    if (!group || group.status !== 'active') {
      throw new ApiHttpError(404, 'NOT_FOUND', 'Invite code is invalid or inactive');
    }

    const passcodeOk = await bcrypt.compare(body.passcode, group.passcodeHash);
    if (!passcodeOk) {
      throw new ApiHttpError(401, 'UNAUTHORIZED', 'Invalid passcode');
    }

    let member = await SplitMember.findOne({
      groupId: group._id,
      userId: new Types.ObjectId(session.userId),
    });

    if (member) {
      member.status = 'active';
      member.email = member.email || session.email;
      await member.save();
    } else {
      const guest = await SplitMember.findOne({
        groupId: group._id,
        email: session.email.toLowerCase(),
      });

      if (guest) {
        guest.userId = new Types.ObjectId(session.userId);
        guest.status = 'active';
        await guest.save();
        member = guest;
      } else {
        member = await SplitMember.create({
          groupId: group._id,
          userId: session.userId,
          email: session.email,
          role: 'member',
          status: 'active',
        });
      }

      await logSplitActivity({
        groupId: group._id.toString(),
        actorUserId: session.userId,
        actorMemberId: member._id.toString(),
        type: 'MEMBER_ADDED',
        payload: { joinedViaInvite: true, email: session.email },
      });
    }

    const memberCount = await SplitMember.countDocuments({
      groupId: group._id,
      status: { $in: ['active', 'invited'] },
    });

    return ok({
      group: {
        ...serializeSplitGroup(group),
        memberCount,
        membership: serializeSplitMember(member),
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
