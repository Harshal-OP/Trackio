import { ok } from '@/lib/api-response';

export async function POST() {
  const response = ok({ message: 'Logged out successfully' });
  response.cookies.set('token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  });
  return response;
}
