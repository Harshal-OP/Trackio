import { connectDB } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { User } from '@/models/User';
import { handleApiError, ok, readJson, ApiHttpError } from '@/lib/api-response';
import { updateProfileSchema } from '@/lib/validators';
import { Transaction } from '@/models/Transaction';
import { Subscription } from '@/models/Subscription';
import { Budget } from '@/models/Budget';
import { SplitGroup } from '@/models/SplitGroup';
import { SplitMember } from '@/models/SplitMember';
import { SplitExpense } from '@/models/SplitExpense';
import { SplitSettlement } from '@/models/SplitSettlement';
import { SplitActivity } from '@/models/SplitActivity';
import { normalizeUserSettings } from '@/lib/user-settings';

export async function PUT(req: Request) {
  try {
    const session = await requireUser();
    await connectDB();

    const body = updateProfileSchema.parse(await readJson(req));

    const update: Record<string, unknown> = {};
    if (body.name !== undefined) update.name = body.name;
    if (body.settings?.notifications !== undefined) {
      update['settings.notifications'] = body.settings.notifications;
    }
    if (body.settings?.currency !== undefined) {
      update['settings.currency'] = body.settings.currency;
    }

    const user = await User.findByIdAndUpdate(session.userId, update, { new: true }).lean();
    if (!user) {
      throw new ApiHttpError(404, 'NOT_FOUND', 'User not found');
    }

    return ok({
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        plan: user.plan,
        settings: normalizeUserSettings(user.settings),
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE() {
  try {
    const session = await requireUser();
    await connectDB();

    const ownedGroups = await SplitGroup.find({ ownerId: session.userId }).select('_id').lean();
    const ownedGroupIds = ownedGroups.map((group) => group._id);

    await Promise.all([
      Transaction.deleteMany({ userId: session.userId }),
      Subscription.deleteMany({ userId: session.userId }),
      Budget.deleteMany({ userId: session.userId }),
      SplitMember.deleteMany({ userId: session.userId }),
      SplitExpense.deleteMany({ createdByUserId: session.userId }),
      SplitSettlement.deleteMany({ createdByUserId: session.userId }),
      ...(ownedGroupIds.length > 0
        ? [
            SplitExpense.deleteMany({ groupId: { $in: ownedGroupIds } }),
            SplitSettlement.deleteMany({ groupId: { $in: ownedGroupIds } }),
            SplitActivity.deleteMany({ groupId: { $in: ownedGroupIds } }),
            SplitMember.deleteMany({ groupId: { $in: ownedGroupIds } }),
            SplitGroup.deleteMany({ _id: { $in: ownedGroupIds } }),
          ]
        : []),
    ]);

    const user = await User.findByIdAndDelete(session.userId);
    if (!user) {
      throw new ApiHttpError(404, 'NOT_FOUND', 'User not found');
    }

    const response = ok({ message: 'Account deleted' });
    response.cookies.set('token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    });

    return response;
  } catch (error) {
    return handleApiError(error);
  }
}
