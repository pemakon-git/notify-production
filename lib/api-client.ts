import type { ApiErrorBody, ApiErrorCode } from '@/lib/types';

export class ApiClientError extends Error {
  readonly code: ApiErrorCode;
  readonly status: number;
  readonly details?: Record<string, string[]>;

  constructor(status: number, body: ApiErrorBody) {
    super(body.error.message);
    this.name = 'ApiClientError';
    this.status = status;
    this.code = body.error.code;
    this.details = body.error.details;
  }
}

export interface ApiRequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
}

/**
 * ทางเดียวที่ UI (ทั้ง (admin) และ (public)) คุยกับ `app/api/*`
 *
 * - path เป็น relative เพราะ app เดียว same-origin — session cookie ติดไปเอง
 * - ห้ามเรียก Supabase ตรงจาก UI เพื่ออ่าน/เขียนข้อมูลธุรกิจ (spec section 1)
 *   ยกเว้น listing ทรัพย์ที่เผยแพร่แล้ว ซึ่งใช้ lib/supabase/public-browser.ts + RLS
 */
export async function apiFetch<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const { body, headers, ...rest } = options;

  const response = await fetch(path, {
    ...rest,
    headers: {
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...headers,
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    credentials: 'same-origin',
    cache: 'no-store',
  });

  if (response.status === 204) return undefined as T;

  const payload = (await response.json()) as unknown;

  if (!response.ok) {
    throw new ApiClientError(response.status, payload as ApiErrorBody);
  }

  return payload as T;
}
