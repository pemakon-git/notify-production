import type { Language, Role, UserStatus } from '@/lib/types';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma/client';
import { forbidden, unauthorized } from '@/lib/http/errors';

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  role: Role;
  status: UserStatus;
  language: Language;
  teamId: string | null;
  branchId: string | null;
  createdAt: Date;
}

export interface AuthContext {
  user: AuthUser;
  /** access token ของ request นี้ (ใช้หา session_id เพื่อผูกกับ user_sessions) */
  accessToken: string | null;
  ip: string | null;
  device: string | null;
}

function bearerToken(request: Request): string | null {
  const header = request.headers.get('authorization');
  if (!header?.toLowerCase().startsWith('bearer ')) return null;

  const token = header.slice(7).trim();
  return token.length > 0 ? token : null;
}

/**
 * ยืนยันตัวตนของ request — รับได้ 2 ทาง:
 *   1. cookie session (ค่าปกติของ UI ทั้ง admin และ public — httpOnly ป้องกัน XSS ขโมย token)
 *   2. Authorization: Bearer <access_token> (สำหรับ integration test / เครื่องมือภายนอก)
 *
 * ทั้งสองทาง verify กับ Supabase จริงเสมอ ไม่เคยเชื่อค่าใน cookie/JWT ตรงๆ
 */
async function verifyIdentity(
  request: Request,
): Promise<{ userId: string; accessToken: string | null }> {
  const bearer = bearerToken(request);

  if (bearer) {
    const { data, error } = await getSupabaseAdmin().auth.getUser(bearer);
    if (error || !data.user) throw unauthorized('access token ไม่ถูกต้องหรือหมดอายุ');

    return { userId: data.user.id, accessToken: bearer };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw unauthorized('ยังไม่ได้ login หรือ session หมดอายุ');

  // getUser() verify แล้ว — getSession() ที่นี่ใช้แค่ดึง token string เดิมมาผูก session_id
  const { data: sessionData } = await supabase.auth.getSession();

  return { userId: data.user.id, accessToken: sessionData.session?.access_token ?? null };
}

/**
 * spec section 10: ห้าม trust `role` ที่ client ส่งมา — role มาจากตาราง `profiles`
 * ที่ผูกกับ user id ซึ่ง Supabase verify ให้แล้วเท่านั้น (ไม่อ่านจาก JWT claim
 * หรือ user_metadata ที่ผู้ใช้แก้ตัวเองได้)
 */
export async function authenticate(request: Request): Promise<AuthContext> {
  const { userId, accessToken } = await verifyIdentity(request);

  const profile = await prisma.profile.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      fullName: true,
      phone: true,
      role: true,
      status: true,
      language: true,
      teamId: true,
      branchId: true,
      createdAt: true,
    },
  });

  if (!profile) throw forbidden('บัญชีนี้ยังไม่ได้ตั้งค่าโปรไฟล์ในระบบ');
  if (profile.status !== 'active') throw forbidden('บัญชีนี้ถูกระงับการใช้งาน');

  const forwarded = request.headers.get('x-forwarded-for');

  return {
    user: profile,
    accessToken,
    ip: forwarded?.split(',')[0]?.trim() ?? request.headers.get('x-real-ip') ?? null,
    device: request.headers.get('user-agent'),
  };
}

/**
 * ใช้ใน Server Component / layout ฝั่ง admin (ด่านที่ 2)
 * คืน null แทนการ throw เพื่อให้ layout ตัดสินใจ redirect เองได้
 */
export async function getServerSession(): Promise<AuthUser | null> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();

  if (!data.user) return null;

  const profile = await prisma.profile.findUnique({
    where: { id: data.user.id },
    select: {
      id: true,
      email: true,
      fullName: true,
      phone: true,
      role: true,
      status: true,
      language: true,
      teamId: true,
      branchId: true,
      createdAt: true,
    },
  });

  if (!profile || profile.status !== 'active') return null;

  return profile;
}
