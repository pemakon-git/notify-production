import { describe, expect, it } from 'vitest';
import { applyFieldMask, maskFromLast4, maskValue } from '@/lib/guards/mask-fields';

describe('field masking (spec 3.2)', () => {
  it('mask เป็น ••••1234 โดยเหลือ 4 ตัวท้าย', () => {
    expect(maskValue('1234567890123')).toBe('••••0123');
    expect(maskFromLast4('0123')).toBe('••••0123');
  });

  it('ค่าที่สั้นเกินไปหรือไม่ใช่ string → ไม่รั่วอะไรออกไปเลย', () => {
    expect(maskValue('12')).toBe('••••');
    expect(maskValue(null)).toBe('••••');
    expect(maskValue(1234567890123)).toBe('••••');
  });

  it('property_manager / sales_agent เห็นเลขบัตรแบบ mask', () => {
    const owner = { id: 'o1', firstName: 'สมชาย', nationalId: '1234567890123' };

    expect(applyFieldMask('property_manager', 'owners', owner).nationalId).toBe('••••0123');
    expect(applyFieldMask('sales_agent', 'owners', owner).nationalId).toBe('••••0123');
  });

  it('super_admin ไม่ถูก mask (ค่าเต็มยังต้องมาจาก endpoint ที่ log audit เท่านั้น)', () => {
    const owner = { id: 'o1', nationalId: '1234567890123' };
    expect(applyFieldMask('super_admin', 'owners', owner).nationalId).toBe('1234567890123');
  });

  it('mask ใน array ได้ (list response)', () => {
    const rows = [{ nationalId: '1111111111111' }, { nationalId: '2222222222222' }];
    const masked = applyFieldMask('sales_agent', 'owners', rows);

    expect(masked.map((row) => row.nationalId)).toEqual(['••••1111', '••••2222']);
  });

  it('ไม่แก้ payload ต้นฉบับ (ไม่มี side-effect)', () => {
    const owner = { nationalId: '1234567890123' };
    applyFieldMask('sales_agent', 'owners', owner);

    expect(owner.nationalId).toBe('1234567890123');
  });

  it('resource ที่ไม่มี maskedFields ส่งกลับตามเดิม', () => {
    const lead = { name: 'สมหญิง', phone: '0812345678' };
    expect(applyFieldMask('sales_agent', 'leads', lead)).toEqual(lead);
  });
});
