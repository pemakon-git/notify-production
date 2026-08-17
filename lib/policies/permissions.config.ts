import {
  ACTIONS,
  RESOURCES,
  ROLE_RANK,
  type Action,
  type EffectivePermissions,
  type Resource,
  type Role,
} from '@/lib/types';

const ALL: Role[] = ['super_admin', 'property_manager', 'sales_agent'];
/** งานที่ผู้จัดการทำได้ แต่เซลทำไม่ได้ */
const MANAGER_UP: Role[] = ['super_admin', 'property_manager'];
/** งานปลายทางที่เจ้าของเท่านั้น: อนุมัติ / เซ็น / ใบเสร็จ / ลบ / ตั้งค่า / เปิดเลขบัตร */
const OWNER_ONLY: Role[] = ['super_admin'];

export interface ResourcePolicy extends Partial<Record<Action, Role[]>> {
  /** field ที่ role นั้นต้องเห็นแบบ mask (ชื่อ field ตามที่ส่งออกใน response) */
  maskedFields?: Partial<Record<Role, string[]>>;
}

/**
 * ตารางสิทธิ์เดียวของระบบ
 *
 * ยึดหลักที่เจ้าของล็อกไว้ในระบบเดิม:
 *   - money-gate      — เซ็นสัญญา/ออกใบเสร็จ = เจ้าของเท่านั้น
 *   - maker-checker   — เซลขอ → ผู้จัดการลง → เจ้าของอนุมัติ
 *   - เซล: ทรัพย์ + เจ้าของทรัพย์ = อ่านอย่างเดียว (หาทรัพย์ผ่าน "ขอเพิ่มทรัพย์")
 *   - ผู้จัดการ: operation เต็ม แต่ไม่มี approve/sign/verify/delete/ระบบ
 *
 * กติกาอ่านตาราง: action ที่ไม่ได้ระบุ = ไม่มี role ใดทำได้ (default deny)
 */
export const POLICIES: Record<Resource, ResourcePolicy> = {
  dashboard: {
    // ตัวเลขที่เห็นต่างกันตาม role — คุมที่ query ไม่ใช่ที่สิทธิ์เข้าถึง
    read: ALL,
  },

  property: {
    read: ALL, // เซล = แคตตาล็อกไว้ขาย (อ่านอย่างเดียว)
    create: MANAGER_UP,
    update: MANAGER_UP,
    delete: OWNER_ONLY,
    approve: OWNER_ONLY, // อนุมัติ/ตีกลับการเผยแพร่
    change_status: MANAGER_UP, // ว่าง ↔ ไม่ว่าง เท่านั้น (ห้ามใช้ข้ามด่านอนุมัติ)
  },

  property_request: {
    read: ALL,
    create: ALL, // เซลเป็นคนเสนอทรัพย์เข้ามา
    update: ALL, // เซลแก้/ถอนได้เฉพาะคำขอของตัวเอง (บังคับ own-scope ที่ handler)
    review: MANAGER_UP,
    convert: MANAGER_UP,
    delete: OWNER_ONLY,
  },

  owner: {
    read: ALL, // เห็น record ได้ แต่เลขบัตรถูก mask
    create: MANAGER_UP,
    update: MANAGER_UP,
    delete: OWNER_ONLY,
    reveal_pii: OWNER_ONLY,
    maskedFields: {
      property_manager: ['idCardNo'],
      sales_agent: ['idCardNo'],
    },
  },

  lead: {
    read: ALL,
    create: ALL,
    update: ALL,
    delete: OWNER_ONLY,
  },

  appointment: {
    read: ALL,
    create: ALL,
    update: ALL,
    delete: OWNER_ONLY,
  },

  customer: {
    read: ALL,
    create: ALL,
    update: ALL,
    delete: OWNER_ONLY,
    reveal_pii: OWNER_ONLY,
    maskedFields: {
      property_manager: ['idCardNo'],
      sales_agent: ['idCardNo'],
    },
  },

  contract: {
    read: ALL,
    create: ALL, // ร่างสัญญาได้ทุก role
    update: MANAGER_UP,
    sign: OWNER_ONLY, // money-gate
    issue_receipt: OWNER_ONLY, // ผูกกับสิทธิ์เซ็นสัญญา
    delete: OWNER_ONLY,
  },

  document: {
    read: ALL,
    create: ALL,
    update: MANAGER_UP,
    verify: OWNER_ONLY, // ตรวจเอกสาร = ด่านก่อนเซ็นสัญญา จึงเป็นของเจ้าของ
    delete: OWNER_ONLY,
  },

  notification: {
    read: ALL,
    update: ALL, // อ่านแล้ว / ตั้งค่าการแจ้งเตือนของตัวเอง
  },

  user: {
    read: OWNER_ONLY,
    create: OWNER_ONLY,
    update: OWNER_ONLY,
    delete: OWNER_ONLY,
  },

  activity: {
    read: MANAGER_UP, // property_manager เห็นจำกัด scope (คุมที่ query)
    export: OWNER_ONLY,
  },

  setting: {
    read: OWNER_ONLY,
    update: OWNER_ONLY,
  },

  community: {
    read: MANAGER_UP, // ผู้ดูแลกระดานชุมชน
    update: MANAGER_UP,
    review: MANAGER_UP,
    delete: OWNER_ONLY,
  },
};

/** เช็คสิทธิ์ระดับ action — ใช้ที่ guard เท่านั้น */
export function can(role: Role, resource: Resource, action: Action): boolean {
  return POLICIES[resource][action]?.includes(role) ?? false;
}

/** field ที่ role นี้ต้องเห็นแบบ mask ของ resource นั้น */
export function maskedFieldsFor(role: Role, resource: Resource): string[] {
  return POLICIES[resource].maskedFields?.[role] ?? [];
}

/** สรุปสิทธิ์ทั้งหมดของ role ส่งให้ UI ใช้ซ่อนเมนู/ปุ่ม (GET /api/auth/me) */
export function getEffectivePermissions(role: Role): EffectivePermissions {
  const result: EffectivePermissions = {};

  for (const resource of RESOURCES) {
    const allowed = ACTIONS.filter((action) => can(role, resource, action));
    if (allowed.length > 0) result[resource] = allowed;
  }

  return result;
}

/** ตั้ง role ให้คนอื่นได้เฉพาะ role ที่ "ต่ำกว่า" ตัวเอง */
export function canAssignRole(actorRole: Role, targetRole: Role): boolean {
  return ROLE_RANK[targetRole] < ROLE_RANK[actorRole];
}
