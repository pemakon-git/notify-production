import { join } from 'node:path';
import { defineConfig } from 'prisma/config';

// prisma.config.ts ปิดการโหลด .env อัตโนมัติ — โหลดเองตรงนี้
try {
  process.loadEnvFile(join(import.meta.dirname, '.env'));
} catch {
  // env มาจาก shell / Vercel แล้ว
}

// schema อยู่ที่ lib/prisma ตาม spec section 7 — migrations/sql/seed วางไว้ที่เดียวกันทั้งหมด
export default defineConfig({
  schema: join('lib', 'prisma', 'schema.prisma'),
  migrations: {
    path: join('lib', 'prisma', 'migrations'),
    seed: 'tsx lib/prisma/seed.ts',
  },
});
