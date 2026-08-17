import { PrismaClient } from '@prisma/client';

/**
 * Serverless: แต่ละ invocation อาจ reuse container เดิม จึงเก็บ client ไว้ที่ globalThis
 * ไม่ให้สร้าง connection pool ใหม่ทุกครั้ง (และต้องต่อผ่าน pooler 6543 + connection_limit=1
 * ตาม spec section 9 — ถ้าต่อ direct 5432 จะชน connection limit เร็วมาก)
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

/** transaction client — ใช้เป็น type ของ tx ที่ helper รับเข้าไป (audit/side-effect ใน tx เดียวกัน) */
export type PrismaTx = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

export type Db = PrismaClient | PrismaTx;
