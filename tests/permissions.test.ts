import { describe, expect, it } from 'vitest';
import { ROLE_RANK, type Role } from '@/lib/types';
import {
  can,
  canAssignRole,
  getEffectivePermissions,
  maskedFieldsFor,
} from '@/lib/policies/permissions.config';

const ROLES: Role[] = ['super_admin', 'property_manager', 'sales_agent'];

describe('ตารางสิทธิ์ (spec 3.1–3.2)', () => {
  it('default deny — action ที่ไม่ได้ระบุในตาราง ทุก role ทำไม่ได้', () => {
    for (const role of ROLES) {
      expect(can(role, 'dashboard', 'delete')).toBe(false);
      expect(can(role, 'leads', 'sign')).toBe(false);
      expect(can(role, 'notifications', 'delete')).toBe(false);
    }
  });

  it('เฉพาะ super_admin เท่านั้นที่ อนุมัติ/เซ็น/ออกใบเสร็จ/ลบ ได้ (rule #5)', () => {
    expect(can('super_admin', 'properties', 'approve')).toBe(true);
    expect(can('super_admin', 'contracts', 'sign')).toBe(true);
    expect(can('super_admin', 'contracts', 'issueReceipt')).toBe(true);

    for (const role of ['property_manager', 'sales_agent'] as Role[]) {
      expect(can(role, 'properties', 'approve')).toBe(false);
      expect(can(role, 'contracts', 'sign')).toBe(false);
      expect(can(role, 'contracts', 'issueReceipt')).toBe(false);
      expect(can(role, 'properties', 'delete')).toBe(false);
      expect(can(role, 'owners', 'delete')).toBe(false);
      expect(can(role, 'customers', 'delete')).toBe(false);
    }
  });

  it('sales_agent: ทรัพย์และเจ้าของทรัพย์ = ดูอย่างเดียว', () => {
    expect(can('sales_agent', 'properties', 'read')).toBe(true);
    expect(can('sales_agent', 'properties', 'create')).toBe(false);
    expect(can('sales_agent', 'properties', 'update')).toBe(false);

    expect(can('sales_agent', 'owners', 'read')).toBe(true);
    expect(can('sales_agent', 'owners', 'create')).toBe(false);
    expect(can('sales_agent', 'owners', 'update')).toBe(false);
  });

  it('sales_agent: สายขายทำได้เต็ม (lead / นัด / ลูกค้า / ร่างสัญญา)', () => {
    for (const resource of ['leads', 'appointments', 'customers', 'contracts'] as const) {
      expect(can('sales_agent', resource, 'create')).toBe(true);
      expect(can('sales_agent', resource, 'read')).toBe(true);
    }
    expect(can('sales_agent', 'contracts', 'update')).toBe(false);
  });

  it('users / settings เข้าถึงได้เฉพาะ super_admin', () => {
    for (const resource of ['users', 'settings'] as const) {
      expect(can('super_admin', resource, 'read')).toBe(true);
      expect(can('property_manager', resource, 'read')).toBe(false);
      expect(can('sales_agent', resource, 'read')).toBe(false);
    }
  });

  it('เลขบัตร ปชช. ต้องถูก mask สำหรับ property_manager และ sales_agent', () => {
    expect(maskedFieldsFor('property_manager', 'owners')).toContain('nationalId');
    expect(maskedFieldsFor('sales_agent', 'owners')).toContain('nationalId');
    expect(maskedFieldsFor('super_admin', 'owners')).toEqual([]);

    expect(can('super_admin', 'owners', 'readSensitive')).toBe(true);
    expect(can('property_manager', 'owners', 'readSensitive')).toBe(false);
  });

  it('ยิ่ง role สูง สิทธิ์ต้องไม่น้อยกว่า role ที่ต่ำกว่า (ไม่มีช่องโหว่ในตาราง)', () => {
    const permissions = {
      super_admin: getEffectivePermissions('super_admin'),
      property_manager: getEffectivePermissions('property_manager'),
      sales_agent: getEffectivePermissions('sales_agent'),
    };

    for (const [resource, actions] of Object.entries(permissions.sales_agent)) {
      // ข้อยกเว้นตามสเปค: sales_agent สร้าง/แก้ property_request ได้ในสายงานตัวเอง
      // แต่ทุก action อื่นต้องเป็น subset ของ role ที่สูงกว่า
      if (resource === 'property_requests') continue;
      for (const action of actions ?? []) {
        expect(
          permissions.property_manager[resource as keyof typeof permissions.property_manager],
          `${resource}.${action} ควรทำได้ด้วยใน property_manager`,
        ).toContain(action);
      }
    }

    expect(ROLE_RANK.super_admin).toBeGreaterThan(ROLE_RANK.property_manager);
    expect(ROLE_RANK.property_manager).toBeGreaterThan(ROLE_RANK.sales_agent);
  });
});

describe('canAssignRole (spec rule #7)', () => {
  it('ตั้งได้เฉพาะ role ที่ต่ำกว่าตัวเอง', () => {
    expect(canAssignRole('super_admin', 'property_manager')).toBe(true);
    expect(canAssignRole('super_admin', 'sales_agent')).toBe(true);
    expect(canAssignRole('property_manager', 'sales_agent')).toBe(true);
  });

  it('ตั้ง role เท่ากับหรือสูงกว่าตัวเองไม่ได้', () => {
    for (const role of ROLES) {
      expect(canAssignRole(role, role)).toBe(false);
    }
    expect(canAssignRole('property_manager', 'super_admin')).toBe(false);
    expect(canAssignRole('sales_agent', 'property_manager')).toBe(false);
    expect(canAssignRole('sales_agent', 'super_admin')).toBe(false);
  });
});
