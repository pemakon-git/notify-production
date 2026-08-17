import { prisma, type Db } from '@/lib/prisma/client';
import { getEnv } from '@/lib/env';

/**
 * spec rule #8 — reset password / suspend → ต้องเด้งออกทุกเครื่องทันที
 *
 * ทำ 3 ชั้น เพราะชั้นเดียวไม่พอ:
 *   1. `profiles.status = suspended` → authenticate() ปฏิเสธทันทีแม้ access token
 *      ที่ถืออยู่ยังไม่หมดอายุ (นี่คือชั้นที่การันตีผลจริง)
 *   2. เรียก GoTrue admin logout → refresh token ทั้งหมดของ user ถูกเพิกถอน
 *      ต่ออายุ session ไม่ได้อีก
 *   3. mark `user_sessions.revoked_at` → หน้า "อุปกรณ์ที่ login" แสดงผลตรงความจริง
 */
export async function revokeAllSessions(userId: string, db: Db = prisma): Promise<void> {
  await db.userSession.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });

  await goTrueLogout(userId);
}

/**
 * เพิกถอน session เดียว
 *
 * ⚠ ข้อจำกัดที่ต้องรู้: GoTrue admin API มีแต่ logout ระดับ "ทั้ง user" ไม่มีระดับ session
 * ฟังก์ชันนี้จึงมีผลกับตาราง `user_sessions` ของเราเท่านั้น — refresh token ของอุปกรณ์นั้น
 * ยังใช้ได้จริงจนหมดอายุ ใช้กับเคส "จัดระเบียบรายการอุปกรณ์" ได้
 * แต่ถ้าเป็นเคสความปลอดภัย (เครื่องหาย / สงสัยถูกขโมย session) ต้องใช้
 * revokeAllSessions() เท่านั้น
 */
export async function revokeSession(sessionId: string, db: Db = prisma): Promise<void> {
  await db.userSession.updateMany({
    where: { id: sessionId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

/**
 * GoTrue admin endpoint — supabase-js ยัง type ไม่ครอบ `admin/users/:id/logout`
 * จึงเรียกตรงด้วย service role key
 */
async function goTrueLogout(userId: string): Promise<void> {
  const env = getEnv();

  const response = await fetch(
    `${env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users/${userId}/logout`,
    {
      method: 'POST',
      headers: {
        apikey: env.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      },
    },
  );

  if (!response.ok && response.status !== 404) {
    // ไม่ throw — ชั้นที่ 1 (status=suspended) บล็อกอยู่แล้ว แต่ต้องเห็นใน log ว่าเพิกถอนไม่สำเร็จ
    console.error(
      `[auth] GoTrue logout failed for ${userId}: ${response.status} ${await response.text()}`,
    );
  }
}
