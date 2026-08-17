import type { Prisma } from '@prisma/client';
import type { EntityType, Role } from '@/lib/types';
import { prisma, type Db } from '@/lib/prisma/client';
import type { AuthContext } from '@/lib/auth/session';

/** field ที่ห้ามโผล่ใน audit log เป็นค่าดิบ (ciphertext/ความลับ) */
const REDACTED_KEYS = new Set(['nationalIdEncrypted', 'password', 'passwordHash', 'token']);

export interface AuditInput {
  action: string; // เช่น 'owner.update', 'owner.national_id.view'
  entityType: EntityType;
  entityId?: string | null;
  oldValue?: unknown;
  newValue?: unknown;
  /** ส่ง tx เข้ามาเมื่อต้องการให้ log อยู่ใน transaction เดียวกับการเขียนข้อมูล */
  db?: Db;
}

/**
 * เขียน audit log (spec 4.11, section 5 rule #11 — insert-only)
 *
 * ใช้กับทุก write endpoint ที่แตะข้อมูลอ่อนไหว และกับ "การอ่าน" เลขบัตรประชาชน
 * (spec 3.3 — แม้แค่ดูก็ต้อง log)
 */
export async function writeAuditLog(auth: AuthContext, input: AuditInput): Promise<void> {
  const db = input.db ?? prisma;

  await db.auditLog.create({
    data: {
      actorId: auth.user.id,
      actorRole: auth.user.role as Role,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      oldValue: redact(input.oldValue),
      newValue: redact(input.newValue),
      ip: auth.ip,
      device: auth.device,
    },
  });
}

/**
 * audit log ที่ยังไม่มี AuthContext — ใช้กับ login สำเร็จ/ล้มเหลว และ endpoint สาธารณะ
 * (login ที่ล้มเหลวต้อง log ด้วย ไม่งั้นสืบเคสพยายาม brute-force ไม่ได้)
 */
export async function writeAnonymousAuditLog(
  input: AuditInput & {
    actorId?: string | null;
    actorRole?: Role | null;
    ip: string | null;
    device: string | null;
  },
): Promise<void> {
  const db = input.db ?? prisma;

  await db.auditLog.create({
    data: {
      actorId: input.actorId ?? null,
      actorRole: input.actorRole ?? null,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      oldValue: redact(input.oldValue),
      newValue: redact(input.newValue),
      ip: input.ip,
      device: input.device,
    },
  });
}

export interface ActivityInput {
  entityType: EntityType;
  entityId: string;
  action: string;
  summary: string;
  db?: Db;
}

/** timeline เชิงธุรกิจที่ผู้ใช้เห็นได้ (spec 4.12) — ต่างจาก audit log ที่เป็นหลักฐาน */
export async function writeActivityLog(
  auth: AuthContext | null,
  input: ActivityInput,
): Promise<void> {
  const db = input.db ?? prisma;

  await db.activityLog.create({
    data: {
      entityType: input.entityType,
      entityId: input.entityId,
      action: input.action,
      actorId: auth?.user.id ?? null,
      summary: input.summary,
    },
  });
}

export interface FieldDiff {
  old: Record<string, unknown>;
  new: Record<string, unknown>;
  changedFields: string[];
}

/**
 * diff เฉพาะ field ที่เปลี่ยนจริง — ใช้ทั้งใน audit log และใน notification
 * แจ้งเจ้าของทรัพย์ตอนผู้จัดการแก้ข้อมูล (spec rule #9)
 */
export function diffFields<T extends Record<string, unknown>>(
  before: T,
  after: Partial<T>,
): FieldDiff | null {
  const oldValue: Record<string, unknown> = {};
  const newValue: Record<string, unknown> = {};

  for (const [key, next] of Object.entries(after)) {
    if (next === undefined) continue;

    const previous = before[key];
    if (isEqual(previous, next)) continue;

    oldValue[key] = previous ?? null;
    newValue[key] = next;
  }

  const changedFields = Object.keys(newValue);
  if (changedFields.length === 0) return null;

  return { old: oldValue, new: newValue, changedFields };
}

function isEqual(a: unknown, b: unknown): boolean {
  if (a instanceof Date && b instanceof Date) return a.getTime() === b.getTime();
  if (a instanceof Date || b instanceof Date) return String(a) === String(b);
  if (typeof a === 'object' || typeof b === 'object') {
    return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
  }
  return a === b;
}

function redact(value: unknown): Prisma.InputJsonObject | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'object') return { value: String(value) };

  const out: Record<string, Prisma.InputJsonValue | null> = {};

  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    out[key] = REDACTED_KEYS.has(key) ? '[redacted]' : normalize(item);
  }

  return out;
}

function normalize(value: unknown): Prisma.InputJsonValue | null {
  if (value === undefined || value === null) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'bigint') return value.toString();
  // Prisma.Decimal และ object อื่นๆ ที่มี toString ที่มีความหมาย
  if (typeof value === 'object' && 'toFixed' in value) return String(value);
  return value as Prisma.InputJsonValue;
}
