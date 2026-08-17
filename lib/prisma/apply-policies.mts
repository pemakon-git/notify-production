/**
 * รัน prisma/sql/policies.sql ผ่าน DIRECT_URL (port 5432)
 *
 * ทำไมไม่ใช้ `prisma db execute`: มันใช้ `url` จาก datasource ซึ่งชี้ไป pooler
 * (transaction mode) ที่รัน DDL หลาย statement + CREATE EXTENSION ไม่ได้เสถียร
 * และไม่ใช้ Prisma $executeRaw เพราะ Prisma ส่งเป็น prepared statement
 * ซึ่งรับ multi-statement script ไม่ได้ — pg client ใช้ simple query protocol ได้
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Client } from 'pg';

try {
  process.loadEnvFile(join(process.cwd(), '.env'));
} catch {
  // ไม่มี .env ในเครื่อง (เช่นบน CI ที่ inject env มาแล้ว) — ข้ามได้
}

const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;

if (!url) {
  console.error('✗ ต้องตั้ง DIRECT_URL (หรือ DATABASE_URL) ก่อน');
  process.exit(1);
}

if (url.includes(':6543') || url.includes('pgbouncer=true')) {
  console.error(
    '✗ DIRECT_URL ชี้ไป pooler (6543) — policies.sql ต้องรันผ่าน direct connection (5432)',
  );
  process.exit(1);
}

const sql = readFileSync(join(import.meta.dirname, 'sql', 'policies.sql'), 'utf8');
const client = new Client({ connectionString: url });

client.on('notice', (n) => console.log(`  ℹ ${n.message}`));

try {
  await client.connect();
  await client.query(sql);
  console.log('✓ policies.sql applied (RLS, constraints, triggers, buckets)');
} catch (error) {
  console.error('✗ policies.sql failed:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await client.end();
}
