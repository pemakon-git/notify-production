import { describe, expect, it } from 'vitest';
import { diffFields } from '@/lib/audit/write-audit-log';

describe('diffFields (spec rule #9 — แจ้งเจ้าของทรัพย์พร้อม diff)', () => {
  it('คืนเฉพาะ field ที่เปลี่ยนจริง', () => {
    const before = { firstName: 'สมชาย', lastName: 'ใจดี', phone: '0812345678' };
    const diff = diffFields(before, { firstName: 'สมชาย', phone: '0899999999' });

    expect(diff).not.toBeNull();
    expect(diff?.changedFields).toEqual(['phone']);
    expect(diff?.old).toEqual({ phone: '0812345678' });
    expect(diff?.new).toEqual({ phone: '0899999999' });
  });

  it('ไม่มีอะไรเปลี่ยน → null (จะได้ไม่เขียน audit log เปล่าๆ)', () => {
    const before = { firstName: 'สมชาย', phone: '0812345678' };
    expect(diffFields(before, { firstName: 'สมชาย' })).toBeNull();
    expect(diffFields(before, {})).toBeNull();
  });

  it('ข้าม field ที่เป็น undefined (PATCH ที่ไม่ได้ส่งมา)', () => {
    const before = { firstName: 'สมชาย', phone: '0812345678' };
    const diff = diffFields(before, { firstName: undefined, phone: '0899999999' });

    expect(diff?.changedFields).toEqual(['phone']);
  });

  it('ค่าเดิมที่เป็น null/undefined ถูกบันทึกเป็น null ไม่ใช่หายไป', () => {
    const diff = diffFields({ note: null } as Record<string, unknown>, { note: 'เพิ่มโน้ต' });

    expect(diff?.old).toEqual({ note: null });
    expect(diff?.new).toEqual({ note: 'เพิ่มโน้ต' });
  });

  it('เทียบ Date ด้วยเวลาจริง ไม่ใช่ reference', () => {
    const before = { startDate: new Date('2026-01-01T00:00:00Z') };

    expect(diffFields(before, { startDate: new Date('2026-01-01T00:00:00Z') })).toBeNull();
    expect(diffFields(before, { startDate: new Date('2026-02-01T00:00:00Z') })).not.toBeNull();
  });
});
