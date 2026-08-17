import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { getServerSession } from '@/lib/auth/session';
import { getEffectivePermissions } from '@/lib/policies/permissions.config';
import { AdminNav } from '@/components/admin/admin-nav';

/** spec section 9 — SEO isolation ของทั้ง route group */
export const metadata: Metadata = {
  title: { default: 'จัดการระบบ', template: '%s — จัดการระบบ' },
  robots: { index: false, follow: false, nocache: true },
};

/**
 * ด่านที่ 2 (spec section 2.1)
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
    <div className="flex min-h-dvh bg-slate-50">
      <AdminNav
        permissions={getEffectivePermissions(user.role)}
        user={{ firstName: user.firstName, lastName: user.lastName, role: user.role }}
      />
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
