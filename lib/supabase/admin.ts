import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getEnv } from '@/lib/env';

let adminClient: SupabaseClient | null = null;

/**
 * client ที่ถือ service_role key — ข้าม RLS ทั้งหมด ใช้เฉพาะงานที่ต้องใช้จริง:
 *   - verify access token ที่มาแบบ Bearer (auth.getUser(token))
 *   - สร้าง/แก้ user ใน auth.users (admin API)
 *   - ออก signed URL ของ bucket `documents` (private)
 *
 * ห้าม import ไฟล์นี้เข้า client component เด็ดขาด — key จะถูกฝังลง bundle
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (adminClient) return adminClient;

  const env = getEnv();
  adminClient = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  return adminClient;
}
