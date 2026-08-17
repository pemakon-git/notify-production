import { prisma } from '@/lib/prisma/client';
import { withAuth } from '@/lib/guards/require-permission';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { readSessionId } from '@/lib/auth/user-agent';
import { writeAuditLog } from '@/lib/audit/write-audit-log';
import { noContent } from '@/lib/http/response';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const POST = withAuth(async (_request, { auth }) => {
  const supabaseSid = auth.accessToken ? readSessionId(auth.accessToken) : null;

  if (supabaseSid) {
    await prisma.userSession.updateMany({
      where: { supabaseSid, userId: auth.user.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  await writeAuditLog(auth, {
    action: 'auth.logout',
    entityType: 'user',
    entityId: auth.user.id,
  });

  // ล้าง httpOnly cookie ทิ้ง — ต้องทำหลังเขียน audit log เสร็จ
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();

  return noContent();
});
