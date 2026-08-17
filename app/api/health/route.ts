import { prisma } from '@/lib/prisma/client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** health check — ใช้ยืนยันว่า connection pooler ต่อติดจริงหลัง deploy */
export async function GET(): Promise<Response> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return Response.json({ status: 'ok', db: 'up' }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('[health] db check failed:', error);
    return Response.json({ status: 'degraded', db: 'down' }, { status: 503 });
  }
}
