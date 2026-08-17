import {
  ACTIONS,
  RESOURCES,
  ROLE_RANK,
  type Action,
  type EffectivePermissions,
  type Resource,
  type Role,
} from '@/lib/types';

const ALL_ROLES: Role[] = ['super_admin', 'property_manager', 'sales_agent'];
/** operation ทั่วไป — ทุก role ที่ login แล้ว */
const OPERATION: Role[] = ALL_ROLES;
/** งานที่ผู้จัดการทำได้ แต่เซลทำไม่ได้ */
const MANAGER_UP: Role[] = ['super_admin', 'property_manager'];
/** งานปลายทางที่เจ้าของเท่านั้น: อนุมัติ / เซ็น / ออกใบเสร็จ / ลบ / ตั้งค่า / ดูเลขบัตรเต็ม */
const OWNER_ONLY: Role[] = ['super_admin'];

export interface ResourcePolicy extends Partial<Record<Action, Role[]>> {
  /** field ที่ role นั้นต้องเห็นแบบ mask (ชื่อ field ตามที่ส่งออกใน response) */
  maskedFields?: Partial<Record<Role, string[]>>;
}

/**
 * ตารางสิทธิ์เดียวของระบบ (spec 3.2)
 *
 * กติกาอ่านตาราง:
 *   - action ที่ไม่ได้ระบุ = ไม่มี role ใดทำได้ (default deny)
 *   - ห้ามเพิ่มการตรวจสิทธิ์กระจายในแต่ละ handler — ให้แก้ที่นี่ที่เดียว
 */
export const POLICIES: Record<Resource, ResourcePolicy> = {
  users: {
    read: OWNER_ONLY,
    create: OWNER_ONLY,
    update: OWNER_ONLY,
    delete: OWNER_ONLY,
  },

  settings: {
    read: OWNER_ONLY,
    update: OWNER_ONLY,
  },

  dashboard: {
    // ตัวเลขที่เห็นต่างกันตาม role — คุมที่ query ไม่ใช่ที่สิทธิ์เข้าถึง
    read: OPERATION,
  },

  properties: {
    read: OPERATION, // sales_agent = ดูอย่างเดียว
    create: MANAGER_UP,
    update: MANAGER_UP,
    delete: OWNER_ONLY,
    approve: OWNER_ONLY, // อนุมัติ/ปฏิเสธการเผยแพร่
  },

  property_requests: {
    read: OPERATION,
    create: OPERATION, // sales_agent เป็นคนเสนอทรัพย์เข้ามา
    update: MANAGER_UP,
    review: MANAGER_UP,
    delete: OWNER_ONLY,
  },

  owners: {
    read: OPERATION, // เห็น record ได้ แต่เลขบัตรถูก mask
    create: MANAGER_UP,
    update: MANAGER_UP,
    delete: OWNER_ONLY, // และต้องไม่มี property/contract ผูกอยู่ (rule #10)
    readSensitive: OWNER_ONLY, // GET /owners/:id/national-id — log audit ทุกครั้ง
    maskedFields: {
      property_manager: ['nationalId'],
      sales_agent: ['nationalId'],
    },
  },

  leads: {
    read: OPERATION,
    create: OPERATION,
    update: OPERATION,
  },

  appointments: {
    read: OPERATION,
    create: OPERATION,
    update: OPERATION,
    delete: OWNER_ONLY,
  },

  customers: {
    read: OPERATION,
    create: OPERATION,
    update: OPERATION,
    delete: OWNER_ONLY,
    readSensitive: OWNER_ONLY,
    maskedFields: {
      property_manager: ['nationalId'],
      sales_agent: ['nationalId'],
    },
  },

  contracts: {
    read: OPERATION,
    create: OPERATION, // ร่างสัญญาได้ทุก role
    update: MANAGER_UP,
    sign: OWNER_ONLY, // rule #5 — และต้องมีเอกสาร verified ครบ (rule #6)
    issueReceipt: OWNER_ONLY,
    delete: OWNER_ONLY,
  },

  documents: {
    read: OPERATION,
    create: OPERATION,
    update: MANAGER_UP,
    verify: MANAGER_UP,
    delete: OWNER_ONLY,
  },

  notifications: {
    read: OPERATION,
    update: OPERATION, // mark read / แก้ preference ของตัวเอง
  },

  audit: {
    read: MANAGER_UP, // property_manager เห็นจำกัด scope (คุมที่ query)
    export: OWNER_ONLY,
  },
};

/** เช็คสิทธิ์ระดับ action — ใช้ที่ guard เท่านั้น ห้ามเรียกจาก frontend logic */
export function can(role: Role, resource: Resource, action: Action): boolean {
  return POLICIES[resource][action]?.includes(role) ?? false;
}

/** field ที่ role นี้ต้องเห็นแบบ mask ของ resource นั้น */
export function maskedFieldsFor(role: Role, resource: Resource): string[] {
  return POLICIES[resource].maskedFields?.[role] ?? [];
}

/** สรุปสิทธิ์ทั้งหมดของ role ส่งให้ UI ใช้ซ่อนปุ่ม (GET /api/auth/me) */
export function getEffectivePermissions(role: Role): EffectivePermissions {
  const result: EffectivePermissions = {};

  for (const resource of RESOURCES) {
    const allowed = ACTIONS.filter((action) => can(role, resource, action));
    if (allowed.length > 0) result[resource] = allowed;
  }

  return result;
}

/**
 * spec rule #7 — ตั้ง role ให้คนอื่นได้เฉพาะ role ที่ "ต่ำกว่า" ตัวเอง
 * (super_admin ตั้ง super_admin คนใหม่ไม่ได้จากตารางนี้ ตามกติกา "ต่ำกว่าตัวเอง")
 */
export function canAssignRole(actorRole: Role, targetRole: Role): boolean {
  return ROLE_RANK[targetRole] < ROLE_RANK[actorRole];
}
