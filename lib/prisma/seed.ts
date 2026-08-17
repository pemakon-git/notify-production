/**
 * Seed สำหรับ dev/staging (spec section 10)
 *
 * สร้าง user ครบ 3 role + amenity master + เจ้าของทรัพย์และทรัพย์ตัวอย่าง
 * เพื่อทดสอบ RBAC ได้ตั้งแต่ milestone 1 โดยไม่ต้องกรอกข้อมูลเอง
 *
 * ปลอดภัยกับข้อมูลที่มีอยู่: ใช้ upsert ทั้งหมด รันซ้ำได้ ไม่ลบของเดิม
 * และจะไม่รันบน production (เช็ค NODE_ENV / ต้องส่ง --force)
 */
import { join } from 'node:path';
import { PrismaClient, type Role } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';

try {
  process.loadEnvFile(join(process.cwd(), '.env'));
} catch {
  // env มาจาก shell แล้ว
}

const force = process.argv.includes('--force');

if (process.env.NODE_ENV === 'production' && !force) {
  console.error('✗ ปฏิเสธการ seed บน production (ถ้าต้องการจริงให้ใส่ --force)');
  process.exit(1);
}

const requiredEnv = [
  'DATABASE_URL',
  'NEXT_PUBLIC_SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
] as const;
const missing = requiredEnv.filter((key) => !process.env[key]);

if (missing.length > 0) {
  console.error(`✗ ขาด env: ${missing.join(', ')}`);
  process.exit(1);
}

const prisma = new PrismaClient();
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const SEED_PASSWORD = process.env.SEED_PASSWORD ?? 'DevPassword!2026';

const SEED_USERS: Array<{
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  role: Role;
}> = [
  {
    email: 'owner@example.com',
    firstName: 'เจ้าของ',
    lastName: 'ระบบ',
    phone: '0810000001',
    role: 'super_admin',
  },
  {
    email: 'manager@example.com',
    firstName: 'ผู้จัดการ',
    lastName: 'ทรัพย์สิน',
    phone: '0810000002',
    role: 'property_manager',
  },
  {
    email: 'sales@example.com',
    firstName: 'เซล',
    lastName: 'ขายเก่ง',
    phone: '0810000003',
    role: 'sales_agent',
  },
];

const AMENITIES: Array<{
  slug: string;
  nameTh: string;
  nameEn: string;
  category: 'common' | 'security' | 'transport' | 'pet' | 'other';
}> = [
  { slug: 'pool', nameTh: 'สระว่ายน้ำ', nameEn: 'Swimming pool', category: 'common' },
  { slug: 'fitness', nameTh: 'ฟิตเนส', nameEn: 'Fitness', category: 'common' },
  { slug: 'co-working', nameTh: 'Co-working space', nameEn: 'Co-working space', category: 'common' },
  { slug: 'cctv', nameTh: 'กล้องวงจรปิด', nameEn: 'CCTV', category: 'security' },
  { slug: 'keycard', nameTh: 'คีย์การ์ด', nameEn: 'Key card access', category: 'security' },
  { slug: 'guard-24h', nameTh: 'รักษาความปลอดภัย 24 ชม.', nameEn: '24h security', category: 'security' },
  { slug: 'near-bts', nameTh: 'ใกล้ BTS', nameEn: 'Near BTS', category: 'transport' },
  { slug: 'near-mrt', nameTh: 'ใกล้ MRT', nameEn: 'Near MRT', category: 'transport' },
  { slug: 'parking', nameTh: 'ที่จอดรถ', nameEn: 'Parking', category: 'transport' },
  { slug: 'pet-friendly', nameTh: 'เลี้ยงสัตว์ได้', nameEn: 'Pet friendly', category: 'pet' },
  { slug: 'garden', nameTh: 'สวนส่วนกลาง', nameEn: 'Garden', category: 'other' },
];

async function ensureAuthUser(email: string): Promise<string> {
  const created = await supabase.auth.admin.createUser({
    email,
    password: SEED_PASSWORD,
    email_confirm: true,
  });

  if (created.data.user) return created.data.user.id;

  const alreadyExists =
    created.error?.status === 422 || /already been registered/i.test(created.error?.message ?? '');

  if (!alreadyExists) {
    throw new Error(`สร้าง auth user ${email} ไม่สำเร็จ: ${created.error?.message}`);
  }

  // มีอยู่แล้ว — หา id เพื่อ upsert profile ให้ตรงกัน
  const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 200 });
  if (error) throw new Error(`listUsers ล้มเหลว: ${error.message}`);

  const existing = data.users.find((user) => user.email?.toLowerCase() === email.toLowerCase());
  if (!existing) throw new Error(`ไม่พบ auth user ${email} ทั้งที่ระบบบอกว่ามีอยู่แล้ว`);

  return existing.id;
}

async function main(): Promise<void> {
  console.log('▸ seed amenities');
  for (const amenity of AMENITIES) {
    await prisma.amenity.upsert({
      where: { slug: amenity.slug },
      create: amenity,
      update: { nameTh: amenity.nameTh, nameEn: amenity.nameEn, category: amenity.category },
    });
  }

  console.log('▸ seed team');
  const team = await prisma.team.upsert({
    where: { id: '00000000-0000-4000-8000-000000000001' },
    create: { id: '00000000-0000-4000-8000-000000000001', name: 'ทีมกรุงเทพ' },
    update: {},
  });

  console.log('▸ seed users (3 roles)');
  const profiles: Record<Role, string> = {} as Record<Role, string>;

  for (const user of SEED_USERS) {
    const id = await ensureAuthUser(user.email);

    await prisma.profile.upsert({
      where: { id },
      create: { id, ...user, teamId: team.id, language: 'th' },
      update: { ...user, teamId: team.id },
    });

    profiles[user.role] = id;
    console.log(`  ✓ ${user.role.padEnd(17)} ${user.email}`);
  }

  console.log('▸ seed owner + properties');
  const owner = await prisma.owner.upsert({
    where: { id: '00000000-0000-4000-8000-000000000101' },
    create: {
      id: '00000000-0000-4000-8000-000000000101',
      firstName: 'สมชาย',
      lastName: 'เจ้าของห้อง',
      phone: '0899999999',
      email: 'somchai@example.com',
      address: '123 ถนนสุขุมวิท กรุงเทพฯ',
      // ตั้งใจไม่ seed เลขบัตรจริง — ให้ทดสอบผ่าน endpoint ที่เข้ารหัสเองเท่านั้น
    },
    update: {},
  });

  const poolAmenity = await prisma.amenity.findUniqueOrThrow({ where: { slug: 'pool' } });
  const btsAmenity = await prisma.amenity.findUniqueOrThrow({ where: { slug: 'near-bts' } });

  const properties = [
    {
      id: '00000000-0000-4000-8000-000000000201',
      code: 'CD-2026-0001',
      status: 'available' as const,
      titleTh: 'คอนโดใกล้ BTS อโศก 1 ห้องนอน',
      titleEn: 'Condo near BTS Asok, 1 bedroom',
      rentPrice: 25000,
    },
    {
      id: '00000000-0000-4000-8000-000000000202',
      code: 'CD-2026-0002',
      status: 'draft' as const,
      titleTh: 'คอนโด (ร่าง — ยังไม่เผยแพร่)',
      titleEn: 'Condo (draft, not published)',
      rentPrice: 18000,
    },
  ];

  for (const property of properties) {
    await prisma.property.upsert({
      where: { id: property.id },
      create: {
        ...property,
        type: 'condo',
        ownerId: owner.id,
        province: 'กรุงเทพมหานคร',
        district: 'วัฒนา',
        subDistrict: 'คลองเตยเหนือ',
        depositMonths: 2,
        bedrooms: 1,
        bathrooms: 1,
        areaSqm: 35,
        floor: 12,
        furnishing: 'fully_furnished',
        managedById: profiles.property_manager,
        sourcedById: profiles.sales_agent,
        amenities: {
          create: [{ amenityId: poolAmenity.id }, { amenityId: btsAmenity.id }],
        },
      },
      update: { status: property.status },
    });
  }

  // reset running number ให้ตรงกับ code ที่ seed ไป ไม่ให้ออกเลขซ้ำของจริง
  await prisma.codeSequence.upsert({
    where: { scope_year: { scope: 'CD', year: 2026 } },
    create: { scope: 'CD', year: 2026, lastValue: properties.length },
    update: { lastValue: properties.length },
  });

  console.log('\n✓ seed เสร็จแล้ว');
  console.log(`  รหัสผ่านทุกบัญชี: ${SEED_PASSWORD}`);
  console.log('  ทรัพย์ available 1 รายการ / draft 1 รายการ (ใช้ทดสอบ RLS ของ web-public)');
}

main()
  .catch((error: unknown) => {
    console.error('✗ seed ล้มเหลว:', error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
