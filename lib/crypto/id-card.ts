import { createCipheriv, createDecipheriv, randomBytes, timingSafeEqual } from 'node:crypto';
import { getEnv } from '@/lib/env';

/**
 * เข้ารหัสเลขบัตรประชาชนที่ app layer ด้วย AES-256-GCM (spec section 9)
 *
 * ทำไมไม่ใช้ pgcrypto: ถ้าเข้ารหัสใน DB ตัว key จะไปโผล่ใน SQL statement/log ของ DB
 * และ rotate key ยากกว่า — ทำที่ app layer ทำให้ DB dump ที่หลุดไปยังอ่านไม่ออก
 *
 * รูปแบบที่เก็บ: `v1:<base64(iv[12] | authTag[16] | ciphertext)>`
 * มี version prefix เพื่อรองรับการ rotate key ในอนาคตแบบไม่ต้อง migrate ทีเดียวทั้งตาราง
 */
const VERSION = 'v1';
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

function getKey(): Buffer {
  const key = Buffer.from(getEnv().NATIONAL_ID_ENC_KEY, 'base64');

  if (key.length !== 32) {
    throw new Error('NATIONAL_ID_ENC_KEY ต้องเป็น base64 ของ key ขนาด 32 bytes (AES-256)');
  }

  return key;
}

export interface EncryptedIdCard {
  idCardNo: string;
  idCardLast4: string;
}

export function encryptIdCard(plaintext: string): EncryptedIdCard {
  const normalized = plaintext.replace(/\D/g, '');

  if (normalized.length !== 13) {
    throw new Error('เลขบัตรประชาชนต้องเป็นตัวเลข 13 หลัก');
  }

  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv('aes-256-gcm', getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(normalized, 'utf8'), cipher.final()]);
  const payload = Buffer.concat([iv, cipher.getAuthTag(), ciphertext]);

  return {
    idCardNo: `${VERSION}:${payload.toString('base64')}`,
    idCardLast4: normalized.slice(-4),
  };
}

export function decryptIdCard(stored: string): string {
  const [version, encoded] = stored.split(':', 2);

  if (version !== VERSION || !encoded) {
    throw new Error(`รูปแบบข้อมูลที่เข้ารหัสไม่รองรับ (version=${version})`);
  }

  const payload = Buffer.from(encoded, 'base64');
  const iv = payload.subarray(0, IV_LENGTH);
  const tag = payload.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const ciphertext = payload.subarray(IV_LENGTH + TAG_LENGTH);

  const decipher = createDecipheriv('aes-256-gcm', getKey(), iv);
  decipher.setAuthTag(tag);

  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
}

/** เทียบ secret แบบไม่รั่วเวลา — ใช้กับ CRON_SECRET */
export function safeCompare(a: string, b: string): boolean {
  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);

  if (bufferA.length !== bufferB.length) return false;
  return timingSafeEqual(bufferA, bufferB);
}
