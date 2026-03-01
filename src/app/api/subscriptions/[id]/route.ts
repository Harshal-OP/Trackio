import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { Subscription } from '@/models/Subscription';
import { requireUser } from '@/lib/auth';
import { handleApiError, ok, readJson, ApiHttpError } from '@/lib/api-response';
import { subscriptionUpdateSchema } from '@/lib/validators';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    await connectDB();

    const body = subscriptionUpdateSchema.parse(await readJson(req));
    const update: Record<string, unknown> = { ...body };

    if (body.nextDueDate) {
      update.nextDueDate = new Date(body.nextDueDate);
    }

    const subscription = await Subscription.findOneAndUpdate(
      { _id: params.id, userId: user.userId },
      update,
      { new: true }
    ).lean();

    if (!subscription) {
      throw new ApiHttpError(404, 'NOT_FOUND', 'Subscription not found');
    }

    return ok({
      subscription: {
        ...subscription,
        _id: subscription._id.toString(),
        userId: subscription.userId.toString(),
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    await connectDB();

    const subscription = await Subscription.findOneAndDelete({
      _id: params.id,
      userId: user.userId,
    }).lean();

    if (!subscription) {
      throw new ApiHttpError(404, 'NOT_FOUND', 'Subscription not found');
    }

    return ok({ message: 'Deleted successfully' });
  } catch (error) {
    return handleApiError(error);
  }
}
