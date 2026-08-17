import { randomBytes } from 'node:crypto';
import { beforeAll, describe, expect, it } from 'vitest';
import { idCardSchema } from '@/lib/types';
import { decryptIdCard, encryptIdCard, safeCompare } from '@/lib/crypto/id-card';

beforeAll(() => {
  process.env.NATIONAL_ID_ENC_KEY = randomBytes(32).toString('base64');
  process.env.DATABASE_URL = 'postgresql://user:pass@localhost:6543/postgres';
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service';
  process.env.CRON_SECRET = 'x'.repeat(24);
});

describe('เข้ารหัสเลขบัตรประชาชน (spec section 9)', () => {
  it('encrypt แล้ว decrypt กลับได้ค่าเดิม', () => {
    const { idCardNo, idCardLast4 } = encryptIdCard('1234567890123');

    expect(idCardLast4).toBe('0123');
    expect(idCardNo.startsWith('v1:')).toBe(true);
    expect(decryptIdCard(idCardNo)).toBe('1234567890123');
  });

  it('ciphertext ต้องไม่ซ้ำกันแม้ plaintext เดียวกัน (IV สุ่มทุกครั้ง)', () => {
    const a = encryptIdCard('1234567890123').idCardNo;
    const b = encryptIdCard('1234567890123').idCardNo;

    expect(a).not.toBe(b);
    // และห้ามมีเลขจริงโผล่ใน ciphertext
    expect(a).not.toContain('1234567890123');
  });

  it('ciphertext ที่ถูกแก้ไข → decrypt ไม่ผ่าน (GCM auth tag ทำงาน)', () => {
    const { idCardNo } = encryptIdCard('1234567890123');
    const payload = Buffer.from(idCardNo.slice(3), 'base64');
    const lastIndex = payload.length - 1;
    payload[lastIndex] = (payload[lastIndex] ?? 0) ^ 0xff;

    expect(() => decryptIdCard(`v1:${payload.toString('base64')}`)).toThrow();
  });

  it('ปฏิเสธเลขที่ไม่ครบ 13 หลัก', () => {
    expect(() => encryptIdCard('12345')).toThrow(/13 หลัก/);
  });

  it('validate checksum เลขบัตรได้', () => {
    // 1101700207030 เป็นเลขที่ checksum ถูกต้อง
    expect(idCardSchema.safeParse('1101700207030').success).toBe(true);
    expect(idCardSchema.safeParse('1101700207031').success).toBe(false);
    expect(idCardSchema.safeParse('abc').success).toBe(false);
  });

  it('safeCompare เทียบค่าถูกต้อง', () => {
    expect(safeCompare('secret-value', 'secret-value')).toBe(true);
    expect(safeCompare('secret-value', 'secret-valuf')).toBe(false);
    expect(safeCompare('short', 'longer-value')).toBe(false);
  });
});
