import type { Metadata } from 'next';
import { getServerSession } from '@/lib/auth/session';
import { getEffectivePermissions } from '@/lib/policies/permissions.config';

export const metadata: Metadata = { title: 'แดชบอร์ด' };

/**
 * placeholder ของ milestone 3 — ตอนนี้แสดงผลลัพธ์ของ RBAC core ให้ตรวจได้ด้วยตา
 * ว่า role ที่ login อยู่ได้สิทธิ์อะไรจริงตามตารางใน lib/policies/permissions.config.ts
 */
export default async function DashboardPage() {
  const user = await getServerSession();
  if (!user) return null; // layout redirect ไปแล้ว — กันไว้ให้ type แคบลง

  const permissions = getEffectivePermissions(user.role);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">แดชบอร์ด</h1>
        <p className="mt-1 text-sm text-slate-600">
          ตัวเลขสรุปตาม role อยู่ใน milestone 3 (<code>GET /api/dashboard/summary</code>)
        </p>
      </div>

      <section className="rounded border border-slate-200 bg-white p-4">
        <h2 className="font-medium">สิทธิ์ที่ backend คำนวณให้ role นี้</h2>
        <table className="mt-3 w-full text-left text-sm">
          <thead className="text-slate-500">
            <tr>
              <th className="py-1 pr-4 font-medium">resource</th>
              <th className="py-1 font-medium">actions</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(permissions).map(([resource, actions]) => (
              <tr key={resource} className="border-t border-slate-100">
                <td className="py-1 pr-4 font-mono text-xs">{resource}</td>
                <td className="py-1 font-mono text-xs text-slate-600">{actions?.join(', ')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
