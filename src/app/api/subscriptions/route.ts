import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { Subscription } from '@/models/Subscription';
import { requireUser } from '@/lib/auth';
import { handleApiError, ok, readJson } from '@/lib/api-response';
import { subscriptionCreateSchema } from '@/lib/validators';

export async function GET() {
  try {
    const user = await requireUser();
    await connectDB();

    const subscriptions = await Subscription.find({ userId: user.userId })
      .sort({ nextDueDate: 1 })
      .lean();

    return ok({
      subscriptions: subscriptions.map((subscription) => ({
        ...subscription,
        _id: subscription._id.toString(),
        userId: subscription.userId.toString(),
      })),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    await connectDB();

    const body = subscriptionCreateSchema.parse(await readJson(req));

    const subscription = await Subscription.create({
      ...body,
      nextDueDate: new Date(body.nextDueDate),
      userId: user.userId,
    });

    return ok(
      {
        subscription: {
          ...subscription.toObject(),
          _id: subscription._id.toString(),
          userId: subscription.userId.toString(),
        },
      },
      201
    );
  } catch (error) {
    return handleApiError(error);
  }
}
