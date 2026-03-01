import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

export type ApiErrorCode =
  | 'BAD_REQUEST'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'CONFLICT'
  | 'INTERNAL_ERROR';

export interface ApiError {
  code: ApiErrorCode;
  message: string;
  details?: unknown;
}

export interface ApiSuccess<T> {
  ok: true;
  data: T;
}

export interface ApiFailure {
  ok: false;
  error: ApiError;
}

export class ApiHttpError extends Error {
  status: number;
  code: ApiErrorCode;
  details?: unknown;

  constructor(status: number, code: ApiErrorCode, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function ok<T>(data: T, status = 200) {
  return NextResponse.json<ApiSuccess<T>>({ ok: true, data }, { status });
}

export function fail(status: number, code: ApiErrorCode, message: string, details?: unknown) {
  return NextResponse.json<ApiFailure>(
    {
      ok: false,
      error: {
        code,
        message,
        ...(details !== undefined ? { details } : {}),
      },
    },
    { status }
  );
}

export async function readJson<T>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    throw new ApiHttpError(400, 'BAD_REQUEST', 'Invalid JSON body');
  }
}

export function handleApiError(error: unknown) {
  if (error instanceof ApiHttpError) {
    return fail(error.status, error.code, error.message, error.details);
  }

  if (error instanceof ZodError) {
    return fail(422, 'VALIDATION_ERROR', 'Validation failed', error.flatten());
  }

  const mongoError = error as { code?: number; keyValue?: Record<string, unknown> };
  if (mongoError?.code === 11000) {
    return fail(409, 'CONFLICT', 'Resource already exists', mongoError.keyValue);
  }

  console.error('Unhandled API error:', error);
  return fail(500, 'INTERNAL_ERROR', 'Internal server error');
}
