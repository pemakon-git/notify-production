/**
 * ทดสอบด่านที่ 1 — middleware (spec section 8 milestone 2, section 9 Testing)
 *
 * "เพิ่ม integration test ยืนยันว่า middleware บล็อกผู้ใช้ไม่ login หรือ role ไม่พอ
 *  ไม่ให้เข้า /admin/* ได้จริง"
 *
 * เทสต์ทำงานแบบ offline: request ที่ไม่มี session ทำให้ supabase-js คืน
 * AuthSessionMissingError โดยไม่ยิง network ออกไปเลย
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';

beforeAll(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL ??= 'https://example.supabase.co';
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= 'anon-key-for-test';
});

const { middleware } = await import('@/middleware');

function requestFor(
  path: string,
  init: { bearer?: string; sessionCookie?: boolean } = {},
): NextRequest {
  const request = new NextRequest(new URL(path, 'http://localhost:6001'), {
    headers: init.bearer ? { authorization: `Bearer ${init.bearer}` } : undefined,
  });

  if (init.sessionCookie) {
    request.cookies.set('sb-example-auth-token', 'fake-session-value');
  }

  return request;
}

/** NextResponse.next() ใส่ header นี้ไว้ — ใช้แยกจาก response ที่ middleware สร้างเอง */
function isPassThrough(response: Response): boolean {
  return response.headers.has('x-middleware-next') || response.status === 200;
}

describe('middleware: หน้าเว็บฝั่ง admin', () => {
  it('ไม่ login → เด้งไป /login พร้อมจำปลายทางไว้ใน ?next=', async () => {
    const response = await middleware(requestFor('/admin/dashboard'));

    expect(response.status).toBe(307);

    const location = new URL(response.headers.get('location')!);
    expect(location.pathname).toBe('/login');
    expect(location.searchParams.get('next')).toBe('/admin/dashboard');
  });

  it('จำ query string ของปลายทางไว้ด้วย', async () => {
    const response = await middleware(requestFor('/admin/properties?status=draft&page=2'));

    const location = new URL(response.headers.get('location')!);
    expect(location.searchParams.get('next')).toBe('/admin/properties?status=draft&page=2');
  });

  it('บล็อกทุกหน้าใต้ /admin ไม่ใช่เฉพาะที่ระบุไว้ (default-deny)', async () => {
    for (const path of [
      '/admin',
      '/admin/users',
      '/admin/owners/00000000-0000-4000-8000-000000000101',
      '/admin/contracts/new',
      '/admin/audit',
    ]) {
      const response = await middleware(requestFor(path));
      expect(response.status, `${path} ต้องถูกบล็อก`).toBe(307);
    }
  });

  it('หน้าใหม่ที่ไม่ได้อยู่ใน allowlist ก็ถือว่าต้อง login (ลืมประกาศก็ยังปลอดภัย)', async () => {
    const response = await middleware(requestFor('/reports-that-nobody-declared'));
    expect(response.status).toBe(307);
  });
});

describe('middleware: หน้าเว็บฝั่งลูกค้า', () => {
  it('เข้าได้โดยไม่ต้อง login', async () => {
    for (const path of ['/', '/properties', '/properties/abc', '/book', '/login']) {
      const response = await middleware(requestFor(path));
      expect(isPassThrough(response), `${path} ต้องเข้าได้`).toBe(true);
      expect(response.headers.get('location')).toBeNull();
    }
  });

  it('/login ต้องไม่ถูก redirect (ไม่งั้นวนไม่จบ)', async () => {
    const response = await middleware(requestFor('/login?next=/admin/dashboard'));
    expect(response.status).not.toBe(307);
  });
});

describe('middleware: /api/*', () => {
  it('ไม่มี credential → 401 พร้อม error code เดียวกับที่ route handler ใช้', async () => {
    const response = await middleware(requestFor('/api/users'));

    expect(response.status).toBe(401);

    const body = (await response.json()) as { error: { code: string } };
    expect(body.error.code).toBe('unauthorized');
  });

  it('บล็อกทุก endpoint ที่ไม่ได้อยู่ใน allowlist — รวมถึงที่เพิ่งเพิ่มเข้ามา', async () => {
    for (const path of [
      '/api/users',
      '/api/owners/1/national-id',
      '/api/contracts/1/sign',
      '/api/audit/logs',
      '/api/some-new-endpoint',
    ]) {
      const response = await middleware(requestFor(path));
      expect(response.status, `${path} ต้องถูกบล็อก`).toBe(401);
    }
  });

  it('มี cookie session → ปล่อยผ่านให้ route handler verify จริง', async () => {
    const response = await middleware(requestFor('/api/users', { sessionCookie: true }));
    expect(isPassThrough(response)).toBe(true);
  });

  it('มี Bearer token → ปล่อยผ่านให้ route handler verify จริง', async () => {
    const response = await middleware(requestFor('/api/users', { bearer: 'some-token' }));
    expect(isPassThrough(response)).toBe(true);
  });

  it('endpoint สาธารณะเรียกได้โดยไม่มี credential', async () => {
    for (const path of [
      '/api/public/properties',
      '/api/public/appointments',
      '/api/auth/login',
      '/api/auth/refresh',
      '/api/health',
      '/api/cron/contracts-expiring',
    ]) {
      const response = await middleware(requestFor(path));
      expect(response.status, `${path} ต้องเรียกได้`).not.toBe(401);
    }
  });
});
