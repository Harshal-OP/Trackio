import bcrypt from 'bcryptjs';
import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { User } from '@/models/User';
import { signToken } from '@/lib/auth';
import { handleApiError, ok, readJson, ApiHttpError } from '@/lib/api-response';
import { registerSchema } from '@/lib/validators';
import { normalizeUserSettings } from '@/lib/user-settings';

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = registerSchema.parse(await readJson(req));

    const existingUser = await User.findOne({ email: body.email });
    if (existingUser) {
      throw new ApiHttpError(409, 'CONFLICT', 'Email already registered');
    }

    const passwordHash = await bcrypt.hash(body.password, 12);
    const user = await User.create({
      name: body.name,
      email: body.email,
      passwordHash,
    });

    const token = await signToken({
      userId: user._id.toString(),
      email: user.email,
      name: user.name,
    });

    const response = ok(
      {
        user: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          plan: user.plan,
          settings: normalizeUserSettings(user.settings),
        },
      },
      201
    );

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
