import type { Metadata } from 'next';
import { getServerSession } from '@/lib/auth/session';
import { getEffectivePermissions } from '@/lib/policies/permissions.config';
import { InfoGroup, InfoRow, PageHeader } from '@/components/admin/ui';

export const metadata: Metadata = { title: 'แดชบอร์ด' };

/**
 * placeholder ของ milestone 3 — ยังไม่มีตัวเลขสรุป (รอ GET /api/dashboard/summary)
 * ตอนนี้แสดงสิทธิ์ที่ backend คำนวณให้ role ที่ login อยู่ เพื่อตรวจ RBAC ด้วยตาได้
 */
export default async function DashboardPage() {
  const user = await getServerSession();
  if (!user) return null; // layout redirect ไปแล้ว — กันไว้ให้ type แคบลง

  const permissions = getEffectivePermissions(user.role);

  return (
    <>
      <PageHeader
        title="แดชบอร์ด"
        subtitle="ตัวเลขสรุปตามบทบาทอยู่ใน milestone 3 — ตอนนี้แสดงสิทธิ์ที่ระบบคำนวณให้บัญชีนี้"
      />

      <InfoGroup label="สิทธิ์ของบัญชีนี้" footer={`ทั้งหมด ${Object.keys(permissions).length} หมวด`}>
        {Object.entries(permissions).map(([resource, actions]) => (
          <InfoRow key={resource} label={resource} value={actions?.join(' · ')} mono />
        ))}
      </InfoGroup>
    </>
  );
}
