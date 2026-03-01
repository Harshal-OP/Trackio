import { connectDB } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { handleApiError, ok } from '@/lib/api-response';
import { SplitActivity } from '@/models/SplitActivity';
import { requireGroupMember } from '@/lib/split-access';

export async function GET(req: Request, { params }: { params: { groupId: string } }) {
  try {
    const session = await requireUser();
    await connectDB();

    await requireGroupMember(params.groupId, session.userId);

    const url = new URL(req.url);
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '100', 10), 200);

    const activities = await SplitActivity.find({ groupId: params.groupId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return ok({
      activity: activities.map((item) => ({
        id: item._id.toString(),
        groupId: item.groupId.toString(),
        actorUserId: item.actorUserId ? item.actorUserId.toString() : undefined,
        actorMemberId: item.actorMemberId ? item.actorMemberId.toString() : undefined,
        type: item.type,
        payload: item.payload,
        createdAt: item.createdAt,
      })),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
