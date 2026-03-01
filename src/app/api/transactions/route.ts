import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { Transaction } from '@/models/Transaction';
import { requireUser } from '@/lib/auth';
import { handleApiError, ok, readJson } from '@/lib/api-response';
import { transactionCreateSchema } from '@/lib/validators';

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    await connectDB();

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    const filter: Record<string, unknown> = { userId: user.userId };

    if (type && type !== 'all') filter.type = type;
    if (category) filter.category = category;

    if (search) {
      filter.$or = [
        { description: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } },
        { notes: { $regex: search, $options: 'i' } },
      ];
    }

    if (startDate || endDate) {
      filter.date = {};
      if (startDate) (filter.date as Record<string, unknown>).$gte = new Date(startDate);
      if (endDate) (filter.date as Record<string, unknown>).$lte = new Date(endDate);
    }

    const total = await Transaction.countDocuments(filter);
    const transactions = await Transaction.find(filter)
      .sort({ date: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    return ok({
      transactions: transactions.map((transaction) => ({
        ...transaction,
        _id: transaction._id.toString(),
        userId: transaction.userId.toString(),
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    await connectDB();

    const body = transactionCreateSchema.parse(await readJson(req));

    const transaction = await Transaction.create({
      ...body,
      date: new Date(body.date),
      userId: user.userId,
    });

    return ok(
      {
        transaction: {
          ...transaction.toObject(),
          _id: transaction._id.toString(),
          userId: transaction.userId.toString(),
        },
      },
      201
    );
  } catch (error) {
    return handleApiError(error);
  }
}
