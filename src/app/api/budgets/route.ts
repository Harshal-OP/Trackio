import { NextRequest } from 'next/server';
import { startOfMonth, endOfMonth } from 'date-fns';
import { connectDB } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { Budget } from '@/models/Budget';
import { Transaction } from '@/models/Transaction';
import { handleApiError, ok, readJson } from '@/lib/api-response';
import { budgetCreateSchema } from '@/lib/validators';

function getMonthRange(month: string) {
  const date = new Date(`${month}-01T00:00:00.000Z`);
  return { start: startOfMonth(date), end: endOfMonth(date) };
}

export async function GET(req: NextRequest) {
  try {
    const session = await requireUser();
    await connectDB();

    const month = req.nextUrl.searchParams.get('month') || new Date().toISOString().slice(0, 7);
    const { start, end } = getMonthRange(month);

    const [budgets, expenses] = await Promise.all([
      Budget.find({ userId: session.userId, month }).lean(),
      Transaction.find({
        userId: session.userId,
        type: 'expense',
        date: { $gte: start, $lte: end },
      }).lean(),
    ]);

    const spentByCategory = expenses.reduce<Record<string, number>>((acc, transaction) => {
      acc[transaction.category] = (acc[transaction.category] || 0) + transaction.amount;
      return acc;
    }, {});

    const items = budgets.map((budget) => {
      const spent = spentByCategory[budget.category] || 0;
      return {
        id: budget._id.toString(),
        category: budget.category,
        month: budget.month,
        limit: budget.limit,
        spent,
        remaining: Math.max(0, budget.limit - spent),
        percentUsed: budget.limit > 0 ? (spent / budget.limit) * 100 : 0,
      };
    });

    return ok({ month, budgets: items });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireUser();
    await connectDB();

    const body = budgetCreateSchema.parse(await readJson(req));

    const budget = await Budget.findOneAndUpdate(
      {
        userId: session.userId,
        category: body.category,
        month: body.month,
      },
      {
        $set: {
          limit: body.limit,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean();

    return ok(
      {
        budget: {
          id: budget!._id.toString(),
          category: budget!.category,
          month: budget!.month,
          limit: budget!.limit,
        },
      },
      201
    );
  } catch (error) {
    return handleApiError(error);
  }
}
