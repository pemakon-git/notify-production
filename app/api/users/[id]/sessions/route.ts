import type { UserSessionSummary } from '@/lib/types';
import { prisma } from '@/lib/prisma/client';
import { withPermission } from '@/lib/guards/require-permission';
import { readSessionId } from '@/lib/auth/user-agent';
import { revokeAllSessions } from '@/lib/auth/revoke-sessions';
import { writeAuditLog } from '@/lib/audit/write-audit-log';
import { notFound } from '@/lib/http/errors';
import { json, noContent } from '@/lib/http/response';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = withPermission<{ id: string }>(
  'users',
  'read',
  async (_request, { auth, params }) => {
    const exists = await prisma.profile.findUnique({
      where: { id: params.id },
      select: { id: true },
    });
    if (!exists) throw notFound('ไม่พบผู้ใช้นี้');

    const currentSid = auth.accessToken ? readSessionId(auth.accessToken) : null;

    const sessions = await prisma.userSession.findMany({
      where: { userId: params.id, revokedAt: null },
      orderBy: { lastSeenAt: 'desc' },
    });

    return json<UserSessionSummary[]>(
      sessions.map((session) => ({
        id: session.id,
        device: session.device,
        browser: session.browser,
        ip: session.ip,
        lastSeenAt: session.lastSeenAt?.toISOString() ?? null,
        createdAt: session.createdAt.toISOString(),
        isCurrent: Boolean(currentSid && session.supabaseSid === currentSid),
      })),
    );
  },
);

/** เพิกถอนทุก session ของ user (ปุ่ม "ออกจากระบบทุกอุปกรณ์") */
export const DELETE = withPermission<{ id: string }>(
  'users',
  'update',
  async (_request, { auth, params }) => {
    const exists = await prisma.profile.findUnique({
      where: { id: params.id },
      select: { id: true },
    });
    if (!exists) throw notFound('ไม่พบผู้ใช้นี้');

    await revokeAllSessions(params.id);

    await writeAuditLog(auth, {
      action: 'user.sessions.revoke_all',
      entityType: 'user',
      entityId: params.id,
      newValue: { reason: 'manual' },
    });

    return noContent();
  },
);
