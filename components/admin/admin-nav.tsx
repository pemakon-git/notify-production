import type { EffectivePermissions, Resource, Role } from '@/lib/types';

const ROLE_LABEL: Record<Role, string> = {
  super_admin: 'เจ้าของระบบ',
  property_manager: 'ผู้จัดการ',
  sales_agent: 'เซล',
};

/** เมนูทั้งหมด + resource/action ที่ต้องมีสิทธิ์จึงจะเห็น */
const MENU: Array<{ href: string; label: string; resource: Resource }> = [
  { href: '/admin/dashboard', label: 'แดชบอร์ด', resource: 'dashboard' },
  { href: '/admin/properties', label: 'ทรัพย์', resource: 'properties' },
  { href: '/admin/property-requests', label: 'คำขอเสนอทรัพย์', resource: 'property_requests' },
  { href: '/admin/owners', label: 'เจ้าของทรัพย์', resource: 'owners' },
  { href: '/admin/leads', label: 'ผู้สนใจ', resource: 'leads' },
  { href: '/admin/appointments', label: 'นัดหมาย', resource: 'appointments' },
  { href: '/admin/customers', label: 'ลูกค้า', resource: 'customers' },
  { href: '/admin/contracts', label: 'สัญญา', resource: 'contracts' },
  { href: '/admin/documents', label: 'เอกสาร', resource: 'documents' },
  { href: '/admin/users', label: 'ผู้ใช้งาน', resource: 'users' },
  { href: '/admin/audit', label: 'ประวัติการใช้งาน', resource: 'audit' },
];

/**
 * เมนูตัดสินจาก `permissions` ที่ backend คำนวณมาให้เท่านั้น
 * — ห้าม hardcode เงื่อนไข role ที่นี่ ไม่งั้นจะมีตารางสิทธิ์ 2 ชุดที่ค่อยๆ ไม่ตรงกัน
 * — และการซ่อนเมนูไม่ใช่ security: route handler ตรวจสิทธิ์ซ้ำทุกครั้งอยู่แล้ว
 */
export function AdminNav({
  permissions,
  user,
}: {
  permissions: EffectivePermissions;
  user: { firstName: string; lastName: string; role: Role };
}) {
  const visible = MENU.filter((item) => permissions[item.resource]?.includes('read'));

  return (
    <aside className="flex w-60 shrink-0 flex-col gap-4 border-r border-slate-200 bg-white p-4">
      <div>
        <p className="font-semibold">
          {user.firstName} {user.lastName}
        </p>
        <p className="text-xs text-slate-500">{ROLE_LABEL[user.role]}</p>
      </div>

      <nav className="flex flex-col gap-1 text-sm">
        {visible.map((item) => (
          <a
            key={item.href}
            href={item.href}
            className="rounded px-2 py-1.5 text-slate-700 hover:bg-slate-100"
          >
            {item.label}
          </a>
        ))}
      </nav>
    </aside>
  );
}
