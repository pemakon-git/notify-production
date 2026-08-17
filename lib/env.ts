import { z } from 'zod';

/**
 * validate env แบบ lazy — ไม่ validate ตอน import module
 * เพราะ `next build` รันโดยไม่มี secret ครบ (build ไม่ควรล้มเพราะ runtime secret)
 *
 * กติกาการตั้งชื่อ (spec section 10):
 *   NEXT_PUBLIC_*  = ถูกฝังลง client bundle → ใส่ได้แค่ URL กับ anon key ที่ RLS คุมอยู่
 *   ที่เหลือทั้งหมด = server-only ห้ามมี prefix NEXT_PUBLIC_ เด็ดขาด
 */
const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  DIRECT_URL: z.string().url().optional(),

  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  /** server-only — ข้ามด่าน RLS ได้ทั้งหมด ห้ามหลุดไป client */
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

  /** base64 ของ key 32 bytes */
  NATIONAL_ID_ENC_KEY: z.string().min(1),

  CRON_SECRET: z.string().min(16),

  UPSTASH_REDIS_REST_URL: z.string().url().optional().or(z.literal('')),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),

  RESEND_API_KEY: z.string().optional(),
  NOTIFICATION_EMAIL_FROM: z.string().optional(),
  LINE_CHANNEL_ACCESS_TOKEN: z.string().optional(),
  LINE_CHANNEL_SECRET: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | null = null;

export function getEnv(): Env {
  if (cached) return cached;

  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const missing = Object.entries(parsed.error.flatten().fieldErrors)
      .map(([key, errors]) => `${key}: ${errors?.join(', ')}`)
      .join('\n  ');
    throw new Error(`environment ไม่ครบ/ไม่ถูกต้อง:\n  ${missing}`);
  }

  cached = parsed.data;
  return cached;
}
