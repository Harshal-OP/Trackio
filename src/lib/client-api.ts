export interface ApiEnvelope<T> {
  ok: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export class ApiClientError extends Error {
  code: string;
  status: number;
  details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

const AUTH_PAGE_PATHS = new Set(['/login', '/register']);

function shouldRedirectToLogin() {
  if (typeof window === 'undefined') return false;
  return !AUTH_PAGE_PATHS.has(window.location.pathname);
}

export async function apiRequest<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
    ...init,
  });

  const isJson = response.headers.get('content-type')?.includes('application/json');
  const payload = isJson ? ((await response.json()) as ApiEnvelope<T>) : null;

  if (!response.ok) {
    if (response.status === 401 && shouldRedirectToLogin()) {
      window.location.replace('/login');
    }
    throw new ApiClientError(
      response.status,
      payload?.error?.code || 'REQUEST_FAILED',
      payload?.error?.message || `Request failed (${response.status})`,
      payload?.error?.details
    );
  }

  if (!payload || !payload.ok || payload.data === undefined) {
    throw new ApiClientError(response.status, 'INVALID_RESPONSE', 'Invalid API response');
  }

  return payload.data;
}
