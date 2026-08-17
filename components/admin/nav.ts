import type { IconName } from '@/components/admin/icon';
import type { EffectivePermissions, Resource, Role } from '@/lib/types';

/**
 * โครงเมนูฝั่งพนักงาน — รากฐานเดียว (พอร์ตจาก lib/nav.ts ของระบบเดิม)
 *
 * หลักการ:
 *   - ลำดับกลุ่มยึดตามบทบาท: เซล = งานขายนำ · ผจก/เจ้าของ = คลังทรัพย์นำ
 *   - visibility gate ด้วย permission ที่ backend คำนวณมาเสมอ
 *     (สิทธิ์เปลี่ยน → เมนูซ่อนเองอัตโนมัติ = defense-in-depth ไม่ใช่ security ชั้นเดียว)
 *   - กลุ่ม "ระบบ" ปักล่างสุด แบบ Slack/Linear
 *   - ⛔ ห้ามทำ nav item จาง (อ่านเป็น "ปิดใช้งาน") — เซลกดเข้าคลังทรัพย์ได้จริง แค่แก้ไม่ได้
 *
 * `label`/`groupLabel` = i18n key → คอมโพเนนต์แปลด้วย t()
 */

export interface NavItem {
  href: string;
  label: string;
  icon: IconName;
  resource?: Resource;
  /** เมนูเด่น (เช่น "ขอเพิ่มทรัพย์" ของเซล) — เน้นทอง ไม่ทำให้จาง */
  accent?: boolean;
  /** badge จำนวนคำขอทรัพย์ที่รอตรวจ */
  badgeKey?: 'propertyRequest';
}

export interface NavGroup {
  key: string;
  /** ป้ายกลุ่มเล็กบนราง — ใส่เฉพาะกลุ่มที่ต้องสื่อความหมาย ไม่งั้นรก */
  label?: string;
  items: NavItem[];
  /** ปักไว้ล่างสุดของราง */
  pinBottom?: boolean;
}

const ITEM = {
  dashboard: { href: '/admin/dashboard', label: 'nav.dashboard', icon: 'home', resource: 'dashboard' },
  properties: {
    href: '/admin/properties',
    label: 'nav.properties',
    icon: 'building',
    resource: 'property',
  },
  owners: { href: '/admin/owners', label: 'nav.owners', icon: 'key', resource: 'owner' },
  propertyRequests: {
    href: '/admin/property-requests',
    label: 'nav.propertyRequests',
    icon: 'inbox',
    resource: 'property_request',
    badgeKey: 'propertyRequest',
  },
  /** เซล: route เดียวกัน แต่ป้าย/โทนเป็นเชิงรุก */
  requestAdd: {
    href: '/admin/property-requests',
    label: 'nav.requestProperty',
    icon: 'plus',
    resource: 'property_request',
    accent: true,
  },
  leads: { href: '/admin/leads', label: 'nav.leads', icon: 'user-plus', resource: 'lead' },
  appointments: {
    href: '/admin/appointments',
    label: 'nav.appointments',
    icon: 'clock',
    resource: 'appointment',
  },
  calendar: {
    href: '/admin/calendar',
    label: 'nav.calendar',
    icon: 'calendar',
    resource: 'appointment',
  },
  customers: { href: '/admin/customers', label: 'nav.customers', icon: 'users', resource: 'customer' },
  contracts: {
    href: '/admin/contracts',
    label: 'nav.contracts',
    icon: 'file-text',
    resource: 'contract',
  },
  users: { href: '/admin/users', label: 'nav.users', icon: 'user', resource: 'user' },
  activity: { href: '/admin/audit', label: 'nav.activity', icon: 'clock', resource: 'activity' },
  settings: { href: '/admin/settings', label: 'nav.settings', icon: 'menu', resource: 'setting' },
  community: { href: '/admin/community', label: 'nav.community', icon: 'users', resource: 'community' },
} satisfies Record<string, NavItem>;

const SALES_WORK: NavGroup = {
  key: 'sales',
  label: 'navGroup.sales',
  items: [ITEM.leads, ITEM.appointments, ITEM.calendar, ITEM.customers, ITEM.contracts],
};

const INVENTORY: NavGroup = {
  key: 'inventory',
  label: 'navGroup.inventory',
  items: [ITEM.properties, ITEM.owners, ITEM.propertyRequests],
};

const SYSTEM: NavGroup = {
  key: 'system',
  label: 'navGroup.system',
  pinBottom: true,
  items: [ITEM.users, ITEM.activity, ITEM.settings, ITEM.community],
};

const BY_ROLE: Record<Role, NavGroup[]> = {
  // เจ้าของ/ผจก: คลังทรัพย์นำ แล้วงานขาย
  super_admin: [{ key: 'main', items: [ITEM.dashboard] }, INVENTORY, SALES_WORK, SYSTEM],
  property_manager: [{ key: 'main', items: [ITEM.dashboard] }, INVENTORY, SALES_WORK, SYSTEM],
  // เซล: งานขายนำ · คลังทรัพย์เป็นแคตตาล็อกไว้ขาย จึงตามหลังและมีป้ายกลุ่มกำกับ
  sales_agent: [
    { key: 'main', items: [ITEM.dashboard] },
    SALES_WORK,
    { key: 'browse', label: 'navGroup.browse', items: [ITEM.properties, ITEM.requestAdd] },
    SYSTEM,
  ],
};

/**
 * เมนูที่ role นี้เห็นจริง — กรองด้วย permission ที่ backend ส่งมา แล้วตัดกลุ่มว่างทิ้ง
 * (การซ่อนเมนูไม่ใช่ security — route handler ตรวจสิทธิ์ซ้ำทุกครั้งอยู่แล้ว)
 */
export function navGroupsFor(role: Role, permissions: EffectivePermissions): NavGroup[] {
  return BY_ROLE[role]
    .map((group) => ({
      ...group,
      items: group.items.filter(
        (item) => !item.resource || permissions[item.resource]?.includes('read'),
      ),
    }))
    .filter((group) => group.items.length > 0);
}

/** 5 ช่องบนแถบล่างมือถือ — ช่องกลาง = signature ของบทบาท */
export function bottomSlotsFor(role: Role, permissions: EffectivePermissions): NavItem[] {
  const signature = role === 'sales_agent' ? ITEM.appointments : ITEM.propertyRequests;

  const candidates: NavItem[] = [
    ITEM.dashboard,
    ITEM.properties,
    signature,
    ITEM.leads,
    ITEM.contracts,
  ];

  return candidates.filter(
    (item) => !item.resource || permissions[item.resource]?.includes('read'),
  );
}
