import { connectDB } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { ok, handleApiError } from '@/lib/api-response';
import { Transaction } from '@/models/Transaction';
import { Subscription } from '@/models/Subscription';
import { Budget } from '@/models/Budget';
import { SplitGroup } from '@/models/SplitGroup';
import { SplitMember } from '@/models/SplitMember';
import { SplitExpense } from '@/models/SplitExpense';
import { SplitSettlement } from '@/models/SplitSettlement';
import { SplitActivity } from '@/models/SplitActivity';

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

    return ok({ message: 'All user data deleted successfully' });
  } catch (error) {
    return handleApiError(error);
  }
}
