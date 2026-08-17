import { refreshSchema, type RefreshResponse } from '@/lib/types';
import { prisma } from '@/lib/prisma/client';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { readSessionId } from '@/lib/auth/user-agent';
import { ApiError } from '@/lib/http/errors';
import { json, toErrorResponse } from '@/lib/http/response';
import { requestMeta } from '@/lib/http/validate';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * ต่ออายุ session
 * — ปกติใช้ refresh token จาก httpOnly cookie (ไม่ต้องส่ง body)
 * — client ที่ไม่ใช้ cookie ส่ง { refreshToken } มาได้
 *
 * cookie ชุดใหม่ถูกเขียนกลับโดย @supabase/ssr ผ่าน cookie adapter
 */
export async function POST(request: Request): Promise<Response> {
  const meta = requestMeta(request);

  try {
    // body ว่างได้ — ถ้าไม่มี refreshToken จะใช้ session ใน cookie
    let refreshToken: string | undefined;
    const raw = await request.text();

    if (raw.trim().length > 0) {
      refreshToken = refreshSchema.parse(JSON.parse(raw)).refreshToken;
    }

    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase.auth.refreshSession(
      refreshToken ? { refresh_token: refreshToken } : undefined,
    );

    if (error || !data.session || !data.user) {
      throw new ApiError('unauthorized', 'session หมดอายุหรือถูกเพิกถอนแล้ว');
    }

    // ตรวจ status ซ้ำที่นี่ด้วย — ไม่งั้น user ที่ถูก suspend ยังต่ออายุ session ได้เรื่อยๆ
    const profile = await prisma.profile.findUnique({
      where: { id: data.user.id },
      select: { status: true },
    });

    if (profile?.status !== 'active') {
      await supabase.auth.signOut();
      throw new ApiError('forbidden', 'บัญชีนี้ถูกระงับการใช้งาน');
    }

    const supabaseSid = readSessionId(data.session.access_token);

    if (supabaseSid) {
      await prisma.userSession.updateMany({
        where: { supabaseSid },
        data: { lastSeenAt: new Date(), ip: meta.ip },
      });
    }

    return json<RefreshResponse>({ expiresAt: data.session.expires_at ?? 0 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
