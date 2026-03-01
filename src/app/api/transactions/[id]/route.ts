import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { Transaction } from '@/models/Transaction';
import { requireUser } from '@/lib/auth';
import { handleApiError, ok, readJson, ApiHttpError } from '@/lib/api-response';
import { transactionUpdateSchema } from '@/lib/validators';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    await connectDB();

    const body = transactionUpdateSchema.parse(await readJson(req));
    const update: Record<string, unknown> = { ...body };

    if (body.date) {
      update.date = new Date(body.date);
    }

    const transaction = await Transaction.findOneAndUpdate(
      { _id: params.id, userId: user.userId },
      update,
      { new: true }
    ).lean();

    if (!transaction) {
      throw new ApiHttpError(404, 'NOT_FOUND', 'Transaction not found');
    }

    return ok({
      transaction: {
        ...transaction,
        _id: transaction._id.toString(),
        userId: transaction.userId.toString(),
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

    const transaction = await Transaction.findOneAndDelete({
      _id: params.id,
      userId: user.userId,
    }).lean();

    if (!transaction) {
      throw new ApiHttpError(404, 'NOT_FOUND', 'Transaction not found');
    }

    return ok({ message: 'Deleted successfully' });
  } catch (error) {
    return handleApiError(error);
  }
}
