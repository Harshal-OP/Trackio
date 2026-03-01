import { connectDB } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { User } from '@/models/User';
import { handleApiError, ok, ApiHttpError } from '@/lib/api-response';
import { normalizeUserSettings } from '@/lib/user-settings';

export async function GET() {
  try {
    const session = await requireUser();
    await connectDB();

    const user = await User.findById(session.userId).lean();
    if (!user) {
      throw new ApiHttpError(404, 'NOT_FOUND', 'User not found');
    }

    return ok({
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        plan: user.plan,
        settings: normalizeUserSettings(user.settings),
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
