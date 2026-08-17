import type { z } from 'zod';
import { ApiError } from './errors';

/** parse body — throw ZodError ให้ toErrorResponse จัดการต่อ */
export async function parseBody<S extends z.ZodTypeAny>(
  request: Request,
  schema: S,
): Promise<z.infer<S>> {
  let raw: unknown;

  try {
    raw = await request.json();
  } catch {
    throw new ApiError('validation_error', 'body ต้องเป็น JSON ที่ถูกต้อง');
  }

  return schema.parse(raw);
}

export function parseQuery<S extends z.ZodTypeAny>(request: Request, schema: S): z.infer<S> {
  const params = new URL(request.url).searchParams;
  const raw: Record<string, string> = {};

  for (const [key, value] of params.entries()) {
    if (value !== '') raw[key] = value;
  }

  return schema.parse(raw);
}

/** อ่าน ip/device จาก request สำหรับ audit log (spec 4.11) */
export function requestMeta(request: Request): { ip: string | null; device: string | null } {
  const forwarded = request.headers.get('x-forwarded-for');

  return {
    ip: forwarded?.split(',')[0]?.trim() ?? request.headers.get('x-real-ip') ?? null,
    device: request.headers.get('user-agent'),
  };
}
