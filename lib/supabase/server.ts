import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getEnv } from '@/lib/env';

/**
 * Supabase client ที่ผูกกับ cookie ของ request ปัจจุบัน
 *
 * ใช้ได้ทั้งใน Route Handler, Server Component และ layout
 * — ใน Route Handler / Server Action: เขียน cookie ได้ (session ที่ถูก refresh จะถูกบันทึก)
 * — ใน Server Component: เขียน cookie ไม่ได้ (Next throw) จึงกลืน error ทิ้ง
 *   ซึ่งไม่เป็นปัญหาเพราะ middleware refresh ให้แล้วก่อนถึงจุดนี้
 *
 * ใช้ anon key + RLS เสมอ ไม่ใช่ service role — client ตัวนี้ทำงาน "ในนามผู้ใช้"
 */
export async function createSupabaseServerClient(): Promise<SupabaseClient> {
  const env = getEnv();
  const cookieStore = await cookies();

  return createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server Component — เขียน cookie ไม่ได้ ปล่อยผ่าน
        }
      },
    },
  });
}
