import { loginSchema, type LoginResponse } from '@/lib/types';
import { prisma } from '@/lib/prisma/client';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getEffectivePermissions } from '@/lib/policies/permissions.config';
import { serializeProfile } from '@/lib/serializers/profile';
import { writeAnonymousAuditLog } from '@/lib/audit/write-audit-log';
import { parseUserAgent, readSessionId } from '@/lib/auth/user-agent';
import { ApiError } from '@/lib/http/errors';
import { json, toErrorResponse } from '@/lib/http/response';
import { parseBody, requestMeta } from '@/lib/http/validate';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * login ที่ server เพื่อให้ระบบได้บันทึก session + audit เอง
 * (ถ้าให้ UI คุย GoTrue ตรง api จะไม่รู้ว่าใครเข้าจากเครื่องไหนเมื่อไร)
 *
 * session ถูกเขียนเป็น httpOnly cookie โดย @supabase/ssr — ไม่มี token กลับไปใน body
 */
export async function POST(request: Request): Promise<Response> {
  const meta = requestMeta(request);

  try {
    const { email, password } = await parseBody(request, loginSchema);
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error || !data.session || !data.user) {
      await writeAnonymousAuditLog({
        action: 'auth.login.failed',
        entityType: 'user',
        newValue: { email },
        ip: meta.ip,
        device: meta.device,
      });

      // ข้อความเดียวกันทั้งกรณีอีเมลไม่มีและรหัสผิด — ไม่บอกใบ้ว่าอีเมลนี้มีในระบบ
      throw new ApiError('unauthorized', 'อีเมลหรือรหัสผ่านไม่ถูกต้อง');
    }

    const profile = await prisma.profile.findUnique({ where: { id: data.user.id } });

    if (!profile) {
      await supabase.auth.signOut();
      throw new ApiError('forbidden', 'บัญชีนี้ยังไม่ได้ตั้งค่าโปรไฟล์ในระบบ');
    }

    if (profile.status !== 'active') {
      await supabase.auth.signOut();
      await writeAnonymousAuditLog({
        action: 'auth.login.blocked_suspended',
        entityType: 'user',
        entityId: profile.id,
        actorId: profile.id,
        actorRole: profile.role,
        ip: meta.ip,
        device: meta.device,
      });
      throw new ApiError('forbidden', 'บัญชีนี้ถูกระงับการใช้งาน');
    }

    const agent = parseUserAgent(meta.device);
    const supabaseSid = readSessionId(data.session.access_token);

    // upsert เพราะ login ซ้ำใน session เดิมไม่ควรสร้างแถวใหม่
    await prisma.userSession.upsert({
      where: { supabaseSid: supabaseSid ?? `no-sid:${data.session.access_token.slice(-24)}` },
      create: {
        userId: profile.id,
        supabaseSid,
        device: agent.device,
        browser: agent.browser,
        ip: meta.ip,
        lastSeenAt: new Date(),
      },
      update: { lastSeenAt: new Date(), ip: meta.ip, revokedAt: null },
    });

    await writeAnonymousAuditLog({
      action: 'auth.login.success',
      entityType: 'user',
      entityId: profile.id,
      actorId: profile.id,
      actorRole: profile.role,
      ip: meta.ip,
      device: meta.device,
    });

    return json<LoginResponse>({
      user: serializeProfile(profile),
      permissions: getEffectivePermissions(profile.role),
      expiresAt: data.session.expires_at ?? 0,
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
