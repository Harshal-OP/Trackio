import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { ApiHttpError } from './api-response';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback-secret');

export interface JWTPayload {
    userId: string;
    email: string;
    name: string;
}

export async function signToken(payload: JWTPayload): Promise<string> {
    return new SignJWT(payload as unknown as Record<string, unknown>)
        .setProtectedHeader({ alg: 'HS256' })
        .setExpirationTime('7d')
        .setIssuedAt()
        .sign(JWT_SECRET);
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
    try {
        const { payload } = await jwtVerify(token, JWT_SECRET);
        return payload as unknown as JWTPayload;
    } catch {
        return null;
    }
}

export async function getUser(): Promise<JWTPayload | null> {
    const cookieStore = cookies();
    const token = cookieStore.get('token')?.value;
    if (!token) return null;
    return verifyToken(token);
}

export async function requireUser(): Promise<JWTPayload> {
    const user = await getUser();
    if (!user) {
        throw new ApiHttpError(401, 'UNAUTHORIZED', 'Unauthorized');
    }
    return user;
}
