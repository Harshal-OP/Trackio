import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Transaction } from '@/models/Transaction';
import { requireUser } from '@/lib/auth';
import { handleApiError } from '@/lib/api-response';

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    await connectDB();

    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const filter: Record<string, unknown> = { userId: user.userId };
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) (filter.date as Record<string, unknown>).$gte = new Date(startDate);
      if (endDate) (filter.date as Record<string, unknown>).$lte = new Date(endDate);
    }

    const transactions = await Transaction.find(filter).sort({ date: -1 }).lean();

    const headers = 'Date,Description,Category,Type,Payment Method,Amount,Notes\n';
    const rows = transactions
      .map((transaction) => {
        const date = new Date(transaction.date).toISOString().split('T')[0];
        const amount = transaction.type === 'income' ? transaction.amount : -transaction.amount;
        return `${date},"${transaction.description}",${transaction.category},${transaction.type},${transaction.paymentMethod},${amount},"${transaction.notes || ''}"`;
      })
      .join('\n');

    return new NextResponse(headers + rows, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="transactions-export.csv"',
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
