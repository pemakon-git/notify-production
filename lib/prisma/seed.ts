/**
 * Seed สำหรับ dev/staging
 *
 * สร้าง user ครบ 3 บทบาท + master data (จังหวัด/สิ่งอำนวยความสะดวก) + เจ้าของทรัพย์
 * และทรัพย์ตัวอย่าง เพื่อทดสอบ RBAC ได้ทันทีโดยไม่ต้องกรอกเอง
 *
 * ปลอดภัยกับข้อมูลเดิม: upsert ทั้งหมด รันซ้ำได้ · ไม่รันบน production (ต้องส่ง --force)
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
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

const SEED_PASSWORD = process.env.SEED_PASSWORD ?? 'DevPassword!2026';

const BRANCH_ID = '00000000-0000-4000-8000-000000000001';
const OWNER_ID = '00000000-0000-4000-8000-000000000101';

const SEED_USERS: Array<{ email: string; fullName: string; phone: string; role: Role }> = [
  { email: 'owner@example.com', fullName: 'เจ้าของ ระบบ', phone: '0810000001', role: 'super_admin' },
  {
    email: 'manager@example.com',
    fullName: 'ผู้จัดการ ทรัพย์สิน',
    phone: '0810000002',
    role: 'property_manager',
  },
  { email: 'sales@example.com', fullName: 'เซล ขายเก่ง', phone: '0810000003', role: 'sales_agent' },
];

/** master data — มี label 2 ภาษาในตัว (UI เลือกตาม locale ไม่ต้องแปลที่ catalog) */
const PROVINCES = [
  { code: 'bangkok', labelTh: 'กรุงเทพมหานคร', labelEn: 'Bangkok' },
  { code: 'nonthaburi', labelTh: 'นนทบุรี', labelEn: 'Nonthaburi' },
  { code: 'samut_prakan', labelTh: 'สมุทรปราการ', labelEn: 'Samut Prakan' },
  { code: 'chonburi', labelTh: 'ชลบุรี', labelEn: 'Chonburi' },
  { code: 'chiang_mai', labelTh: 'เชียงใหม่', labelEn: 'Chiang Mai' },
];

const AMENITIES = [
  { code: 'pool', labelTh: 'สระว่ายน้ำ', labelEn: 'Swimming pool', group: 'common' },
  { code: 'fitness', labelTh: 'ฟิตเนส', labelEn: 'Fitness', group: 'common' },
  { code: 'co_working', labelTh: 'Co-working space', labelEn: 'Co-working space', group: 'common' },
  { code: 'garden', labelTh: 'สวนส่วนกลาง', labelEn: 'Garden', group: 'common' },
  { code: 'cctv', labelTh: 'กล้องวงจรปิด', labelEn: 'CCTV', group: 'security' },
  { code: 'keycard', labelTh: 'คีย์การ์ด', labelEn: 'Key card access', group: 'security' },
  { code: 'guard_24h', labelTh: 'รปภ. 24 ชม.', labelEn: '24h security', group: 'security' },
  { code: 'near_bts', labelTh: 'ใกล้ BTS', labelEn: 'Near BTS', group: 'transport' },
  { code: 'near_mrt', labelTh: 'ใกล้ MRT', labelEn: 'Near MRT', group: 'transport' },
  { code: 'parking', labelTh: 'ที่จอดรถ', labelEn: 'Parking', group: 'transport' },
  { code: 'pet_friendly', labelTh: 'เลี้ยงสัตว์ได้', labelEn: 'Pet friendly', group: 'pet' },
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

  const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 200 });
  if (error) throw new Error(`listUsers ล้มเหลว: ${error.message}`);

  const existing = data.users.find((user) => user.email?.toLowerCase() === email.toLowerCase());
  if (!existing) throw new Error(`ไม่พบ auth user ${email} ทั้งที่ระบบบอกว่ามีอยู่แล้ว`);

  return existing.id;
}

async function main(): Promise<void> {
  console.log('▸ master data (จังหวัด + สิ่งอำนวยความสะดวก)');
  for (const [index, province] of PROVINCES.entries()) {
    await prisma.masterData.upsert({
      where: { kind_code: { kind: 'province', code: province.code } },
      create: { kind: 'province', ...province, sortOrder: index },
      update: { labelTh: province.labelTh, labelEn: province.labelEn, sortOrder: index },
    });
  }
  for (const [index, amenity] of AMENITIES.entries()) {
    await prisma.masterData.upsert({
      where: { kind_code: { kind: 'amenity', code: amenity.code } },
      create: { kind: 'amenity', ...amenity, sortOrder: index },
      update: { labelTh: amenity.labelTh, labelEn: amenity.labelEn, group: amenity.group },
    });
  }

  console.log('▸ สาขา');
  const branch = await prisma.branch.upsert({
    where: { id: BRANCH_ID },
    create: { id: BRANCH_ID, name: 'สำนักงานใหญ่' },
    update: {},
  });

  console.log('▸ ผู้ใช้ 3 บทบาท');
  const profiles: Partial<Record<Role, string>> = {};

  for (const user of SEED_USERS) {
    const id = await ensureAuthUser(user.email);

    await prisma.profile.upsert({
      where: { id },
      create: { id, ...user, branchId: branch.id, language: 'en' },
      update: { ...user, branchId: branch.id },
    });

    profiles[user.role] = id;
    console.log(`  ✓ ${user.role.padEnd(17)} ${user.email}`);
  }

  console.log('▸ เจ้าของทรัพย์ + ทรัพย์ตัวอย่าง');
  const owner = await prisma.owner.upsert({
    where: { id: OWNER_ID },
    create: {
      id: OWNER_ID,
      fullName: 'สมชาย เจ้าของห้อง',
      phone: '0899999999',
      email: 'somchai@example.com',
      address: '123 ถนนสุขุมวิท กรุงเทพฯ',
      branchId: branch.id,
      // ตั้งใจไม่ seed เลขบัตรจริง — ให้ทดสอบผ่าน endpoint ที่เข้ารหัสเองเท่านั้น
    },
    update: {},
  });

  const properties = [
    {
      id: '00000000-0000-4000-8000-000000000201',
      code: 'CD-2026-0001',
      status: 'available' as const,
      titleTh: 'คอนโดใกล้ BTS อโศก 1 ห้องนอน',
      titleEn: 'Condo near BTS Asok, 1 bedroom',
      monthlyRent: 25000,
      publishedAt: new Date(),
    },
    {
      id: '00000000-0000-4000-8000-000000000202',
      code: 'CD-2026-0002',
      status: 'draft' as const,
      titleTh: 'คอนโด (ร่าง — ยังไม่เผยแพร่)',
      titleEn: 'Condo (draft, not published)',
      monthlyRent: 18000,
      publishedAt: null,
    },
  ];

  for (const property of properties) {
    await prisma.property.upsert({
      where: { id: property.id },
      create: {
        ...property,
        propertyType: 'condo',
        ownerId: owner.id,
        branchId: branch.id,
        province: 'กรุงเทพมหานคร',
        district: 'วัฒนา',
        subdistrict: 'คลองเตยเหนือ',
        depositMonths: 2,
        bedrooms: 1,
        bathrooms: 1,
        areaSqm: 35,
        floor: '12',
        furnished: 'fully',
        amenities: ['pool', 'near_bts', 'cctv'],
        assignedToId: profiles.property_manager ?? null,
        sourcedById: profiles.sales_agent ?? null,
      },
      update: { status: property.status },
    });
  }

  // ตั้ง running number ให้ตรงกับ code ที่ seed ไป ไม่ให้ออกเลขซ้ำของจริง
  await prisma.codeSequence.upsert({
    where: { scope_year: { scope: 'CD', year: 2026 } },
    create: { scope: 'CD', year: 2026, lastValue: properties.length },
    update: { lastValue: properties.length },
  });

  console.log('\n✓ seed เสร็จแล้ว');
  console.log(`  รหัสผ่านทุกบัญชี: ${SEED_PASSWORD}`);
  console.log('  ทรัพย์ available 1 รายการ / draft 1 รายการ (ใช้ทดสอบ RLS ของหน้าลูกค้า)');
}

main()
  .catch((error: unknown) => {
    console.error('✗ seed ล้มเหลว:', error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
