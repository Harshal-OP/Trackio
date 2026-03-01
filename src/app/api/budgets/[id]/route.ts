import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { Budget } from '@/models/Budget';
import { handleApiError, ok, readJson, ApiHttpError } from '@/lib/api-response';
import { budgetUpdateSchema } from '@/lib/validators';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireUser();
    await connectDB();

    const body = budgetUpdateSchema.parse(await readJson(req));
    const update: Record<string, unknown> = {};

    if (body.category !== undefined) update.category = body.category;
    if (body.month !== undefined) update.month = body.month;
    if (body.limit !== undefined) update.limit = body.limit;

    const budget = await Budget.findOneAndUpdate(
      { _id: params.id, userId: session.userId },
      update,
      { new: true }
    ).lean();

    if (!budget) {
      throw new ApiHttpError(404, 'NOT_FOUND', 'Budget not found');
    }

    return ok({
      budget: {
        id: budget._id.toString(),
        category: budget.category,
        month: budget.month,
        limit: budget.limit,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireUser();
    await connectDB();

    const budget = await Budget.findOneAndDelete({ _id: params.id, userId: session.userId }).lean();
    if (!budget) {
      throw new ApiHttpError(404, 'NOT_FOUND', 'Budget not found');
    }

    return ok({ message: 'Budget deleted' });
  } catch (error) {
    return handleApiError(error);
  }
}
