import type { Profile as ProfileDto } from '@/lib/types';
import type { AuthUser } from '@/lib/auth/session';

type ProfileRow = Pick<
  AuthUser,
  'id' | 'email' | 'fullName' | 'phone' | 'role' | 'status' | 'language' | 'teamId' | 'branchId'
> & { createdAt: Date };

/** แปลง row เป็น DTO — Date → ISO string เสมอ เพื่อให้ response ทั้งระบบหน้าตาเดียวกัน */
export function serializeProfile(row: ProfileRow): ProfileDto {
  return {
    id: row.id,
    email: row.email,
    fullName: row.fullName,
    phone: row.phone,
    role: row.role,
    status: row.status,
    language: row.language,
    teamId: row.teamId,
    branchId: row.branchId,
    createdAt: row.createdAt.toISOString(),
  };
}
