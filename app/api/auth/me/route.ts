import type { MeResponse } from '@/lib/types';
import { withAuth } from '@/lib/guards/require-permission';
import { getEffectivePermissions } from '@/lib/policies/permissions.config';
import { serializeProfile } from '@/lib/serializers/profile';
import { json } from '@/lib/http/response';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * แหล่งเดียวที่ UI ควรใช้ตัดสินว่าจะแสดงเมนู/ปุ่มอะไร
 * — permissions มาจากตารางสิทธิ์ฝั่ง server ทำให้ UI ไม่ต้องมีตารางสิทธิ์ของตัวเอง
 */
export const GET = withAuth(async (_request, { auth }) =>
  json<MeResponse>({
    user: serializeProfile(auth.user),
    permissions: getEffectivePermissions(auth.user.role),
  }),
);
