import { prisma } from '@/lib/prisma/client';
import { withPermission } from '@/lib/guards/require-permission';
import { revokeSession } from '@/lib/auth/revoke-sessions';
import { writeAuditLog } from '@/lib/audit/write-audit-log';
import { notFound } from '@/lib/http/errors';
import { noContent } from '@/lib/http/response';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** ถอนอุปกรณ์ทีละเครื่อง (spec 6: DELETE /users/:id/sessions/:sessionId) */
export const DELETE = withPermission<{ id: string; sessionId: string }>(
  'user',
  'update',
  async (_request, { auth, params }) => {
    const session = await prisma.userSession.findFirst({
      where: { id: params.sessionId, userId: params.id },
      select: { id: true, device: true, browser: true },
    });
    if (!session) throw notFound('ไม่พบ session นี้');

    await revokeSession(session.id);

    await writeAuditLog(auth, {
      action: 'user.session.revoke',
      entityType: 'user',
      entityId: params.id,
      newValue: { sessionId: session.id, device: session.device, browser: session.browser },
    });

    return noContent();
  },
);
