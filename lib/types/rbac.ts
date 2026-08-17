import { z } from 'zod';

/** 3 บทบาทที่ใช้งานจริง — ลำดับสิทธิ์: super_admin > property_manager > sales_agent */
export const roleSchema = z.enum(['super_admin', 'property_manager', 'sales_agent']);
export type Role = z.infer<typeof roleSchema>;

/** ยิ่งเลขสูง = สิทธิ์สูง ใช้เทียบกติกา "ตั้ง role สูงกว่าตัวเองไม่ได้" */
export const ROLE_RANK: Record<Role, number> = {
  sales_agent: 1,
  property_manager: 2,
  super_admin: 3,
};

/**
 * ชื่อ resource — **เอกพจน์ ตรงกับระบบเดิม** (`can('property','read')`)
 * เพื่อให้ UI/nav ที่พอร์ตมาใช้ได้โดยไม่ต้องแก้
 */
export const RESOURCES = [
  'dashboard',
  'property',
  'property_request',
  'owner',
  'lead',
  'appointment',
  'customer',
  'contract',
  'document',
  'user',
  'activity', // ประวัติการใช้งาน (audit)
  'setting',
  'community', // กระดานชุมชน
  'notification',
] as const;
export type Resource = (typeof RESOURCES)[number];

export const ACTIONS = [
  'create',
  'read',
  'update',
  'delete',
  'approve', // อนุมัติเผยแพร่ทรัพย์
  'change_status', // เปลี่ยนสถานะเชิงปฏิบัติการ (ว่าง ↔ ไม่ว่าง) — แยกจาก approve โดยเจตนา
  'sign', // เซ็นสัญญา
  'issue_receipt',
  'verify', // ตรวจเอกสาร
  'review', // ตรวจคำขอเสนอทรัพย์
  'convert', // แปลงคำขอ → ทรัพย์ (ร่าง)
  'export',
  'reveal_pii', // เปิดดูเลขบัตรเต็ม (log audit ทุกครั้ง)
] as const;
export type Action = (typeof ACTIONS)[number];

/**
 * สิทธิ์ที่ backend คำนวณแล้วส่งให้ UI ใช้ซ่อน/แสดงปุ่ม
 * — UI ห้าม hardcode policy เอง (ตารางสิทธิ์ 2 ชุดจะค่อยๆ ไม่ตรงกัน)
 * — และการซ่อนปุ่มไม่ใช่ security: route handler ตรวจซ้ำทุก request เสมอ
 */
export type EffectivePermissions = Partial<Record<Resource, Action[]>>;
