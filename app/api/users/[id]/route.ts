import { updateUserSchema, type Profile as ProfileDto } from '@/lib/types';
import { prisma } from '@/lib/prisma/client';
import { withPermission } from '@/lib/guards/require-permission';
import { canAssignRole } from '@/lib/policies/permissions.config';
import { revokeAllSessions } from '@/lib/auth/revoke-sessions';
import { serializeProfile } from '@/lib/serializers/profile';
import { diffFields, writeAuditLog } from '@/lib/audit/write-audit-log';
import { forbidden, notFound } from '@/lib/http/errors';
import { json } from '@/lib/http/response';
import { parseBody } from '@/lib/http/validate';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = withPermission<{ id: string }>('users', 'read', async (_request, { params }) => {
  const profile = await prisma.profile.findUnique({ where: { id: params.id } });
  if (!profile) throw notFound('ไม่พบผู้ใช้นี้');

  return json<ProfileDto>(serializeProfile(profile));
});

export const PATCH = withPermission<{ id: string }>(
  'users',
  'update',
  async (request, { auth, params }) => {
    const input = await parseBody(request, updateUserSchema);

    const before = await prisma.profile.findUnique({ where: { id: params.id } });
    if (!before) throw notFound('ไม่พบผู้ใช้นี้');

    const isSelf = before.id === auth.user.id;

    // spec rule #7 — ห้ามแก้ role ตัวเอง / ห้ามตั้ง role ที่ไม่ต่ำกว่าตัวเอง
    if (input.role !== undefined) {
      if (isSelf) throw forbidden('ไม่สามารถแก้ role ของตัวเองได้');
      if (!canAssignRole(auth.user.role, input.role)) {
        throw forbidden(`ไม่สามารถตั้ง role "${input.role}" ได้ (ต้องต่ำกว่า role ของตัวเอง)`);
      }
      if (!canAssignRole(auth.user.role, before.role)) {
        throw forbidden('ไม่สามารถแก้ผู้ใช้ที่มี role เท่ากับหรือสูงกว่าตัวเองได้');
      }
    }

    if (input.status === 'suspended' && isSelf) {
      throw forbidden('ไม่สามารถระงับบัญชีของตัวเองได้');
    }

    const diff = diffFields(before as unknown as Record<string, unknown>, input);
    if (!diff) return json<ProfileDto>(serializeProfile(before));

    const updated = await prisma.$transaction(async (tx) => {
      const row = await tx.profile.update({ where: { id: params.id }, data: input });

      await writeAuditLog(auth, {
        db: tx,
        action: 'user.update',
        entityType: 'user',
        entityId: row.id,
        oldValue: diff.old,
        newValue: diff.new,
      });

      return row;
    });

    // spec rule #8 — suspend หรือเปลี่ยน role → เด้งออกทุกเครื่องทันที
    // (เปลี่ยน role แล้วไม่เด้ง = user ยังถือ session ที่ UI คิดว่าตัวเองสิทธิ์เดิมอยู่)
    if (input.status === 'suspended' || input.role !== undefined) {
      await revokeAllSessions(updated.id);

      await writeAuditLog(auth, {
        action: 'user.sessions.revoke_all',
        entityType: 'user',
        entityId: updated.id,
        newValue: { reason: input.status === 'suspended' ? 'suspended' : 'role_changed' },
      });
    }

    return json<ProfileDto>(serializeProfile(updated));
  },
);
