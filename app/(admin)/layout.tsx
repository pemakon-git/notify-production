import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { getServerSession } from '@/lib/auth/session';
import { getEffectivePermissions } from '@/lib/policies/permissions.config';
import { AdminShell } from '@/components/admin/admin-shell';

/** SEO isolation ของทั้ง route group */
export const metadata: Metadata = {
  title: { default: 'Notify', template: '%s — Notify' },
  robots: { index: false, follow: false, nocache: true },
};

/**
 * ด่านที่ 2
 *
 * middleware กันคนที่ไม่มี session ไว้แล้ว แต่ยังไม่ได้ตรวจ:
 *   - โปรไฟล์นี้มีอยู่ในตาราง `profiles` จริงไหม (auth user ที่ไม่มี profile = เข้าไม่ได้)
 *   - ถูก suspend หรือยัง
 *   - role คืออะไร (ใช้ตัดสินว่าเมนูไหนแสดง)
 * ทั้งสามข้อต้องอ่านจาก DB จึงทำที่นี่ไม่ได้ที่ middleware (Edge runtime)
 *
 * และ layout นี้ยังไม่ใช่ด่านสุดท้าย — ทุก route handler ยังต้องเรียก withPermission() เอง
 */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await getServerSession();

  if (!user) redirect('/login?next=/admin/dashboard');

  return (
    <AdminShell
      user={{ fullName: user.fullName, email: user.email, role: user.role }}
      permissions={getEffectivePermissions(user.role)}
    >
      {children}
    </AdminShell>
  );
}
