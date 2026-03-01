import bcrypt from 'bcryptjs';
import { connectDB } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { handleApiError, ok } from '@/lib/api-response';
import { SplitGroup } from '@/models/SplitGroup';
import { generateInviteCode, generatePasscode, logSplitActivity } from '@/lib/split-utils';
import { requireGroupOwner } from '@/lib/split-access';

async function getUniqueInviteCode() {
  for (let i = 0; i < 10; i += 1) {
    const code = generateInviteCode();
    const exists = await SplitGroup.findOne({ inviteCode: code }).select('_id').lean();
    if (!exists) return code;
  }
  return `${generateInviteCode()}${Date.now().toString().slice(-2)}`.slice(0, 10);
}

export async function POST(_req: Request, { params }: { params: { groupId: string } }) {
  try {
    const session = await requireUser();
    await connectDB();

    const { group, member } = await requireGroupOwner(params.groupId, session.userId);

    const inviteCode = await getUniqueInviteCode();
    const passcode = generatePasscode();

    group.inviteCode = inviteCode;
    group.passcodeHash = await bcrypt.hash(passcode, 10);
    await group.save();

    await logSplitActivity({
      groupId: params.groupId,
      actorUserId: session.userId,
      actorMemberId: member._id.toString(),
      type: 'INVITE_REGENERATED',
      payload: { inviteCode },
    });

    return ok({
      invite: {
        inviteCode,
        passcode,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
