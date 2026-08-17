import { z } from 'zod';

/** spec 3.1 — ลำดับสิทธิ์: super_admin > property_manager > sales_agent */
export const roleSchema = z.enum(['super_admin', 'property_manager', 'sales_agent']);
export type Role = z.infer<typeof roleSchema>;

/** ยิ่งเลขสูง = สิทธิ์สูง ใช้เทียบว่า "ตั้ง role สูงกว่าตัวเองไม่ได้" (spec rule #7) */
export const ROLE_RANK: Record<Role, number> = {
  sales_agent: 1,
  property_manager: 2,
  super_admin: 3,
};

export const RESOURCES = [
  'users',
  'dashboard',
  'properties',
  'property_requests',
  'owners',
  'leads',
  'appointments',
  'customers',
  'contracts',
  'documents',
  'notifications',
  'audit',
  'settings',
] as const;
export type Resource = (typeof RESOURCES)[number];

export const ACTIONS = [
  'create',
  'read',
  'update',
  'delete',
  'approve',
  'sign',
  'issueReceipt',
  'verify',
  'review',
  'export',
  'readSensitive',
] as const;
export type Action = (typeof ACTIONS)[number];

/**
 * สิทธิ์ที่ compute แล้วจาก backend ส่งให้ UI ใช้ซ่อน/แสดงปุ่ม
 * — UI ห้าม hardcode policy เอง เพื่อไม่ให้มีตารางสิทธิ์ 2 ชุดที่ไม่ตรงกัน
 * — และ UI ที่ซ่อนปุ่มไม่ใช่ security: api ตรวจซ้ำทุก request เสมอ
 */
export type EffectivePermissions = Partial<Record<Resource, Action[]>>;
