import { connectDB } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { handleApiError, ok } from '@/lib/api-response';
import { SplitExpense } from '@/models/SplitExpense';
import { SplitSettlement } from '@/models/SplitSettlement';
import { SplitMember } from '@/models/SplitMember';
import { calculateGroupBalances } from '@/lib/split-utils';
import { requireGroupMember } from '@/lib/split-access';

export async function GET(_req: Request, { params }: { params: { groupId: string } }) {
  try {
    const session = await requireUser();
    await connectDB();

    await requireGroupMember(params.groupId, session.userId);

    const [expenses, settlements, members] = await Promise.all([
      SplitExpense.find({ groupId: params.groupId }).lean(),
      SplitSettlement.find({ groupId: params.groupId }).lean(),
      SplitMember.find({ groupId: params.groupId }).lean(),
    ]);

    const balanceResult = calculateGroupBalances(expenses, settlements);

    const membersById = new Map(
      members.map((member) => [
        member._id.toString(),
        {
          id: member._id.toString(),
          name: member.guestName || member.email || 'Member',
          email: member.email,
          role: member.role,
          status: member.status,
        },
      ])
    );

    return ok({
      balances: Object.entries(balanceResult.balances).map(([memberId, amount]) => ({
        memberId,
        amount,
        member: membersById.get(memberId),
      })),
      transfers: balanceResult.transfers,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
