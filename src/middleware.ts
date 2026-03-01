import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const AUTH_PAGES = ['/login', '/register'];
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback-secret');

function isPublicPath(pathname: string) {
  if (pathname.startsWith('/api/auth/login') || pathname.startsWith('/api/auth/register')) return true;
  if (pathname.startsWith('/_next') || pathname.startsWith('/favicon.ico')) return true;
  if (pathname.startsWith('/api')) return true;
  return AUTH_PAGES.includes(pathname);
}

async function hasValidToken(token?: string) {
  if (!token) return false;
  try {
    await jwtVerify(token, JWT_SECRET);
    return true;
  } catch {
    return false;
  }
}

function clearTokenCookie(response: NextResponse) {
  response.cookies.set('token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  });
  return response;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get('token')?.value;
  const isAuthenticated = await hasValidToken(token);

  if (!isAuthenticated && !isPublicPath(pathname)) {
    const response = NextResponse.redirect(new URL('/login', req.url));
    return token ? clearTokenCookie(response) : response;
  }

  if (isAuthenticated && AUTH_PAGES.includes(pathname)) {
    return NextResponse.redirect(new URL('/', req.url));
  }

  const response = NextResponse.next();
  return token && !isAuthenticated && AUTH_PAGES.includes(pathname)
    ? clearTokenCookie(response)
    : response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\..*).*)',
  ],
};
