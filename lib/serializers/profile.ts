import type { Profile as ProfileDto } from '@/lib/types';
import type { AuthUser } from '@/lib/auth/session';

type ProfileRow = Pick<
  AuthUser,
  | 'id'
  | 'email'
  | 'firstName'
  | 'lastName'
  | 'phone'
  | 'role'
  | 'teamId'
  | 'status'
  | 'language'
  | 'createdAt'
>;

/** แปลง row เป็น DTO — Date → ISO string เสมอ เพื่อให้ response ทั้งระบบหน้าตาเดียวกัน */
export function serializeProfile(row: ProfileRow): ProfileDto {
  return {
    id: row.id,
    email: row.email,
    firstName: row.firstName,
    lastName: row.lastName,
    phone: row.phone,
    role: row.role,
    teamId: row.teamId,
    status: row.status,
    language: row.language,
    createdAt: row.createdAt.toISOString(),
  };
}
