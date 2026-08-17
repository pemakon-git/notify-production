import { z } from 'zod';
import type { EffectivePermissions } from './rbac';
import type { Profile } from './users';

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('อีเมลไม่ถูกต้อง'),
  password: z.string().min(1, 'กรุณากรอกรหัสผ่าน'),
});
export type LoginInput = z.infer<typeof loginSchema>;

/**
 * refresh token ไม่ต้องส่งมาใน body สำหรับ UI ปกติ — อยู่ใน httpOnly cookie แล้ว
 * field นี้มีไว้ให้ client ที่ไม่ใช้ cookie (integration test / เครื่องมือภายนอก)
 */
export const refreshSchema = z.object({
  refreshToken: z.string().min(1).optional(),
});
export type RefreshInput = z.infer<typeof refreshSchema>;

/**
 * ไม่คืน access/refresh token ลง body โดยเจตนา — token อยู่ใน httpOnly cookie
 * ที่ JavaScript อ่านไม่ได้ ทำให้ XSS ขโมย session ไปใช้ต่อไม่ได้
 */
export interface LoginResponse {
  user: Profile;
  permissions: EffectivePermissions;
  /** epoch seconds ที่ access token จะหมดอายุ — ให้ UI รู้ว่าควร refresh เมื่อไร */
  expiresAt: number;
}

export interface RefreshResponse {
  expiresAt: number;
}

export interface UserSessionSummary {
  id: string;
  device: string | null;
  browser: string | null;
  ip: string | null;
  lastSeenAt: string | null;
  createdAt: string;
  isCurrent: boolean;
}
