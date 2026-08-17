import { PROPERTY_CODE_PREFIX, type PropertyType } from '@/lib/types';
import { prisma, type Db } from '@/lib/prisma/client';

/**
 * ออก running number ต่อปีผ่าน DB function `next_code_seq()` (ดู prisma/sql/policies.sql)
 *
 * ห้ามนับด้วย COUNT(*) หรือ max(code)+1 — serverless หลาย invocation ที่เข้ามาพร้อมกัน
 * จะได้เลขซ้ำ ส่วนฟังก์ชันนี้เป็น INSERT … ON CONFLICT DO UPDATE ซึ่ง atomic ระดับ row lock
 *
 * เรียกใน transaction เดียวกับการสร้าง record เสมอ (ส่ง tx เข้ามา) เพื่อให้ rollback
 * แล้วเลขไม่หลุดหาย… แม้เลขจะกระโดดได้ถ้า transaction ล้ม ซึ่งยอมรับได้
 */
export async function nextSequence(db: Db, scope: string, year: number): Promise<number> {
  const rows = await db.$queryRaw<Array<{ seq: number }>>`
    SELECT public.next_code_seq(${scope}, ${year}) AS seq
  `;

  const seq = rows[0]?.seq;
  if (seq === undefined) throw new Error(`ออกเลขลำดับไม่สำเร็จ (scope=${scope})`);

  return seq;
}

async function buildCode(db: Db, prefix: string, date: Date): Promise<string> {
  // ใช้ปี ค.ศ. — ถ้าต้องการ พ.ศ. เปลี่ยนบรรทัดนี้เป็น + 543 ที่เดียว
  const year = date.getFullYear();
  const seq = await nextSequence(db, prefix, year);

  return `${prefix}-${year}-${String(seq).padStart(4, '0')}`;
}

/** CD/HS/TH/AP-ปี-เลข (spec 4.2) */
export function generatePropertyCode(
  db: Db = prisma,
  type: PropertyType,
  date = new Date(),
): Promise<string> {
  return buildCode(db, PROPERTY_CODE_PREFIX[type], date);
}

/** LD-ปี-เลข (spec 4.5) */
export function generateLeadCode(db: Db = prisma, date = new Date()): Promise<string> {
  return buildCode(db, 'LD', date);
}

/** APT-ปี-เลข (spec 4.6) */
export function generateAppointmentCode(db: Db = prisma, date = new Date()): Promise<string> {
  return buildCode(db, 'APT', date);
}

/** CT-ปี-เลข (spec 4.8) */
export function generateContractCode(db: Db = prisma, date = new Date()): Promise<string> {
  return buildCode(db, 'CT', date);
}
