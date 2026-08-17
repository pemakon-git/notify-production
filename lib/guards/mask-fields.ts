import type { Resource, Role } from '@/lib/types';
import { maskedFieldsFor } from '@/lib/policies/permissions.config';

const MASK = '••••';

/** '1234567890123' → '••••0123' */
export function maskValue(value: unknown): string {
  if (typeof value !== 'string' || value.length < 4) return MASK;
  return `${MASK}${value.slice(-4)}`;
}

export function maskFromLast4(last4: string | null): string | null {
  if (!last4) return null;
  return `${MASK}${last4}`;
}

/**
 * ตัด field ที่ role นั้นไม่ควรเห็นค่าเต็ม ออกก่อนส่ง response (spec 3.2)
 *
 * ทำที่ชั้นนี้ก่อน serialize เสมอ — ห้าม query แล้วส่งค่าดิบไปให้ frontend ซ่อนเอง
 * เพราะ payload ที่หลุดไปถึง browser แล้วถือว่ารั่วแล้ว
 */
export function applyFieldMask<T>(role: Role, resource: Resource, payload: T): T {
  const fields = maskedFieldsFor(role, resource);
  if (fields.length === 0) return payload;

  return maskRecursive(payload, fields) as T;
}

function maskRecursive(value: unknown, fields: string[]): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => maskRecursive(item, fields));
  }

  if (value === null || typeof value !== 'object') return value;

  const record = value as Record<string, unknown>;
  const masked: Record<string, unknown> = { ...record };

  for (const field of fields) {
    if (field in masked) masked[field] = maskValue(masked[field]);
  }

  return masked;
}
