import { z } from 'zod';
import { languageSchema, userStatusSchema } from './enums';
import { roleSchema, type EffectivePermissions } from './rbac';

/** เบอร์ไทย: 0xxxxxxxxx หรือ +66xxxxxxxxx */
export const thaiPhoneSchema = z
  .string()
  .trim()
  .regex(/^(0\d{8,9}|\+66\d{8,9})$/, 'รูปแบบเบอร์โทรไม่ถูกต้อง');

/** เลขบัตรประชาชน 13 หลัก + ตรวจ checksum หลักสุดท้าย */
export const nationalIdSchema = z
  .string()
  .trim()
  .regex(/^\d{13}$/, 'เลขบัตรประชาชนต้องเป็นตัวเลข 13 หลัก')
  .refine((value) => {
    let sum = 0;
    for (let i = 0; i < 12; i += 1) {
      sum += Number(value[i]) * (13 - i);
    }
    return (11 - (sum % 11)) % 10 === Number(value[12]);
  }, 'เลขบัตรประชาชนไม่ถูกต้อง (checksum ไม่ผ่าน)');

export const profileSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  firstName: z.string(),
  lastName: z.string(),
  phone: z.string().nullable(),
  role: roleSchema,
  teamId: z.string().uuid().nullable(),
  status: userStatusSchema,
  language: languageSchema,
  createdAt: z.string(),
});
export type Profile = z.infer<typeof profileSchema>;

export const createUserSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(12, 'รหัสผ่านต้องยาวอย่างน้อย 12 ตัวอักษร'),
  firstName: z.string().trim().min(1),
  lastName: z.string().trim().min(1),
  phone: thaiPhoneSchema.optional(),
  role: roleSchema,
  teamId: z.string().uuid().optional(),
  language: languageSchema.default('th'),
});
export type CreateUserInput = z.infer<typeof createUserSchema>;

export const updateUserSchema = z
  .object({
    firstName: z.string().trim().min(1).optional(),
    lastName: z.string().trim().min(1).optional(),
    phone: thaiPhoneSchema.nullable().optional(),
    role: roleSchema.optional(),
    teamId: z.string().uuid().nullable().optional(),
    status: userStatusSchema.optional(),
    language: languageSchema.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, 'ต้องส่งอย่างน้อย 1 field');
export type UpdateUserInput = z.infer<typeof updateUserSchema>;

export const listUsersQuerySchema = z.object({
  role: roleSchema.optional(),
  status: userStatusSchema.optional(),
  search: z.string().trim().min(1).optional(),
});

/** response ของ GET /api/auth/me */
export interface MeResponse {
  user: Profile;
  permissions: EffectivePermissions;
}
