import {
  createUserSchema,
  listUsersQuerySchema,
  paginationQuerySchema,
  type Profile as ProfileDto,
} from '@/lib/types';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma/client';
import { withPermission } from '@/lib/guards/require-permission';
import { canAssignRole } from '@/lib/policies/permissions.config';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { serializeProfile } from '@/lib/serializers/profile';
import { writeAuditLog } from '@/lib/audit/write-audit-log';
import { ApiError, forbidden } from '@/lib/http/errors';
import { buildListMeta, json, listJson } from '@/lib/http/response';
import { parseBody, parseQuery } from '@/lib/http/validate';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const querySchema = paginationQuerySchema.merge(listUsersQuerySchema);

export const GET = withPermission('user', 'read', async (request) => {
  const { page, perPage, role, status, search } = parseQuery(request, querySchema);

  const where: Prisma.ProfileWhereInput = {
    ...(role ? { role } : {}),
    ...(status ? { status } : {}),
    ...(search
      ? {
          OR: [
            { fullName: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.profile.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    prisma.profile.count({ where }),
  ]);

  return listJson<ProfileDto>(rows.map(serializeProfile), buildListMeta(total, page, perPage));
});

export const POST = withPermission('user', 'create', async (request, { auth }) => {
  const input = await parseBody(request, createUserSchema);

  // spec rule #7 — ตั้ง role ได้เฉพาะที่ต่ำกว่าตัวเอง
  if (!canAssignRole(auth.user.role, input.role)) {
    throw forbidden(`ไม่สามารถตั้ง role "${input.role}" ได้ (ต้องต่ำกว่า role ของตัวเอง)`);
  }

  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
  });

  if (error || !data.user) {
    if (error?.status === 422 || /already been registered/i.test(error?.message ?? '')) {
      throw new ApiError('conflict', 'อีเมลนี้ถูกใช้งานแล้ว');
    }
    throw new ApiError('internal_error', `สร้างบัญชีใน Supabase Auth ไม่สำเร็จ: ${error?.message}`);
  }

  try {
    const profile = await prisma.$transaction(async (tx) => {
      const created = await tx.profile.create({
        data: {
          id: data.user.id,
          email: input.email,
          fullName: input.fullName,
          phone: input.phone ?? null,
          role: input.role,
          teamId: input.teamId ?? null,
          branchId: input.branchId ?? null,
          language: input.language,
        },
      });

      await writeAuditLog(auth, {
        db: tx,
        action: 'user.create',
        entityType: 'user',
        entityId: created.id,
        newValue: {
          email: created.email,
          role: created.role,
          fullName: created.fullName,
        },
      });

      return created;
    });

    return json<ProfileDto>(serializeProfile(profile), 201);
  } catch (error) {
    // profiles กับ auth.users ต้องไม่หลุดจากกัน — ถ้าเขียน profile ไม่ผ่าน ต้องลบ auth user คืน
    await supabase.auth.admin.deleteUser(data.user.id).catch((cleanupError: unknown) => {
      console.error('[users] rollback auth user failed:', data.user.id, cleanupError);
    });
    throw error;
  }
});
