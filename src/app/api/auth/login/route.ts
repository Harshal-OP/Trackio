import bcrypt from 'bcryptjs';
import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { User } from '@/models/User';
import { signToken } from '@/lib/auth';
import { handleApiError, ok, readJson, ApiHttpError } from '@/lib/api-response';
import { loginSchema } from '@/lib/validators';
import { normalizeUserSettings } from '@/lib/user-settings';

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = loginSchema.parse(await readJson(req));

    const user = await User.findOne({ email: body.email });
    if (!user) {
      throw new ApiHttpError(401, 'UNAUTHORIZED', 'Invalid credentials');
    }

    const isValid = await bcrypt.compare(body.password, user.passwordHash);
    if (!isValid) {
      throw new ApiHttpError(401, 'UNAUTHORIZED', 'Invalid credentials');
    }

    const token = await signToken({
      userId: user._id.toString(),
      email: user.email,
      name: user.name,
    });

    const response = ok({
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        plan: user.plan,
        settings: normalizeUserSettings(user.settings),
      },
    });

    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });

    return response;
  } catch (error) {
    return handleApiError(error);
  }
}
