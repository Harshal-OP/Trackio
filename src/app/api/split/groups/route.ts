import bcrypt from 'bcryptjs';
import { Types } from 'mongoose';
import { connectDB } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { handleApiError, ok } from '@/lib/api-response';
import { splitGroupCreateSchema } from '@/lib/validators';
import { readJson } from '@/lib/api-response';
import { SplitGroup } from '@/models/SplitGroup';
import { SplitMember } from '@/models/SplitMember';
import { generateInviteCode, logSplitActivity } from '@/lib/split-utils';
import { serializeSplitGroup, serializeSplitMember } from '@/lib/split-access';

async function getUniqueInviteCode() {
  for (let i = 0; i < 10; i += 1) {
    const code = generateInviteCode();
    const exists = await SplitGroup.findOne({ inviteCode: code }).select('_id').lean();
    if (!exists) return code;
  }
  return `${generateInviteCode()}${Date.now().toString().slice(-2)}`.slice(0, 10);
}

export async function GET() {
  try {
    const session = await requireUser();
    await connectDB();

    const memberships = await SplitMember.find({
      userId: new Types.ObjectId(session.userId),
      status: { $in: ['active', 'invited'] },
    })
      .sort({ updatedAt: -1 })
      .lean();

    const groupIds = memberships.map((membership) => membership.groupId);

    const [groups, memberCounts] = await Promise.all([
      SplitGroup.find({ _id: { $in: groupIds } }).sort({ updatedAt: -1 }).lean(),
      SplitMember.aggregate<{ _id: Types.ObjectId; count: number }>([
        { $match: { groupId: { $in: groupIds }, status: { $in: ['active', 'invited'] } } },
        { $group: { _id: '$groupId', count: { $sum: 1 } } },
      ]),
    ]);

    const membershipMap = new Map(memberships.map((m) => [m.groupId.toString(), m]));
    const memberCountMap = new Map(memberCounts.map((item) => [item._id.toString(), item.count]));

    return ok({
      groups: groups.map((group) => ({
        ...serializeSplitGroup(group),
        memberCount: memberCountMap.get(group._id.toString()) || 0,
        membership: serializeSplitMember(membershipMap.get(group._id.toString())!),
      })),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireUser();
    await connectDB();

    const body = splitGroupCreateSchema.parse(await readJson(req));
    const inviteCode = await getUniqueInviteCode();
    const passcodeHash = await bcrypt.hash(body.passcode, 10);

    const group = await SplitGroup.create({
      ownerId: session.userId,
      name: body.name,
      description: body.description || '',
      currency: body.currency,
      inviteCode,
      passcodeHash,
      status: 'active',
    });

    const ownerMember = await SplitMember.create({
      groupId: group._id,
      userId: session.userId,
      email: session.email,
      role: 'owner',
      status: 'active',
    });

    await logSplitActivity({
      groupId: group._id.toString(),
      actorUserId: session.userId,
      actorMemberId: ownerMember._id.toString(),
      type: 'GROUP_CREATED',
      payload: { name: group.name, currency: group.currency },
    });

    return ok(
      {
        group: {
          ...serializeSplitGroup(group),
          memberCount: 1,
          membership: serializeSplitMember(ownerMember),
        },
        invite: {
          inviteCode,
          passcode: body.passcode,
        },
      },
      201
    );
  } catch (error) {
    return handleApiError(error);
  }
}
