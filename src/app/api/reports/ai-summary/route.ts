import { NextRequest } from 'next/server';
import { requireUser } from '@/lib/auth';
import { handleApiError, ok } from '@/lib/api-response';
import { reportQuerySchema } from '@/lib/validators';
import { buildReportSummary, buildAiSummaryText } from '@/lib/reports';

export async function GET(req: NextRequest) {
  try {
    const session = await requireUser();

    const parsed = reportQuerySchema.parse({
      month: req.nextUrl.searchParams.get('month') || undefined,
    });

    const summary = await buildReportSummary(session.userId, parsed.month);
    return ok(buildAiSummaryText(summary));
  } catch (error) {
    return handleApiError(error);
  }
}
