import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * อ่านข้อมูล public ตรงจาก Supabase ด้วย anon key (spec section 1 ข้อยกเว้น)
 *
 * ปลอดภัยเพราะ RLS บังคับให้เห็นเฉพาะ `properties.status = 'available'`
 * (ดู prisma/sql/policies.sql) — anon key ไม่มีสิทธิ์แตะตารางอื่นเลย เพราะ
 * policies.sql REVOKE ทุกตารางแล้ว GRANT SELECT คืนแค่ 4 ตารางที่หน้า listing ต้องใช้
 *
 * การ "เขียน" ทุกอย่าง (ฟอร์มนัดดู) ต้องผ่าน POST /api/public/appointments เท่านั้น
 * เพราะต้องมี rate limit + สร้าง lead + appointment ใน transaction เดียว
 */
export function createPublicSupabase(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error('ต้องตั้ง NEXT_PUBLIC_SUPABASE_URL และ NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }

  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
