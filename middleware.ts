import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * ด่านที่ 1 — protected route (spec section 2.1)
 *
 * ทำอะไร:
 *   - `/admin/*`  → ต้องมี session ที่ Supabase ยืนยันแล้ว ไม่มี = เด้งไป /login
 *   - `/api/*`    → ต้องมี credential ติดมา (cookie session หรือ Authorization header)
 *                   ยกเว้น endpoint สาธารณะใน ALLOWLIST
 *
 * ทำอะไร "ไม่ได้" และห้ามพึ่ง:
 *   - ตรวจ role: role อยู่ในตาราง `profiles` ไม่ได้อยู่ใน JWT — middleware รัน Edge runtime
 *     ต่อ Prisma ไม่ได้ และถ้าเอา role ไปฝังใน JWT claim ก็จะกลายเป็นความจริงชุดที่ 2
 *     ที่ค้างเก่าหลังเปลี่ยน role (ขัด spec section 10)
 *   - ตรวจสิทธิ์ระดับ action/field: อยู่ที่ requirePermission() ใน route handler เท่านั้น
 *
 * ดังนั้นชั้นตรวจสิทธิ์จริงมี 3 ด่าน และ **ห้ามตัดด่านใดออก**:
 *   ด่าน 1  middleware (ไฟล์นี้)                    — กันคนไม่ login ไม่ให้เข้าถึง shell
 *   ด่าน 2  app/(admin)/layout.tsx                  — ตรวจ role จาก DB ก่อน render เมนู
 *   ด่าน 3  withPermission() ในทุก route handler    — ตรวจ action + field ก่อนแตะข้อมูล
 */

/** endpoint ที่เรียกได้โดยไม่ต้อง login (มีด่านของตัวเองในแต่ละ handler) */
const PUBLIC_API_PREFIXES = [
  '/api/public', // listing/booking ฝั่งลูกค้า — มี rate limit ใน handler
  '/api/auth/login', // ยังไม่มี session ตอนเรียก
  '/api/auth/refresh', // ใช้ refresh token ไม่ใช่ access token
  '/api/health', // health check ของ Vercel
  '/api/cron', // Vercel Cron ยิงมาโดยไม่มี session — handler ตรวจ CRON_SECRET เอง
];

/** หน้าเว็บฝั่งลูกค้า — เข้าได้โดยไม่ login */
const PUBLIC_PAGE_PREFIXES = ['/properties', '/book', '/login', '/search'];

function isPublicPath(pathname: string): boolean {
  if (pathname === '/') return true;
  if (PUBLIC_PAGE_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return true;
  if (PUBLIC_API_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return true;
  return false;
}

/**
 * เช็คแบบไม่ยิง network — ดูแค่ว่ามี credential ติดมาไหม
 * การ verify จริงเกิดที่ route handler (authenticate()) เพื่อไม่ verify ซ้ำสองรอบต่อ request
 */
function hasCredential(request: NextRequest): boolean {
  if (request.headers.get('authorization')?.toLowerCase().startsWith('bearer ')) return true;

  return request.cookies.getAll().some((cookie) => cookie.name.includes('auth-token'));
}

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;

  if (isPublicPath(pathname)) return NextResponse.next();

  // ── /api/* (ที่ไม่ใช่ public): ไม่มี credential → ตัดจบที่นี่เลย
  // ทำให้ endpoint ที่ลืมใส่ guard ยังไม่หลุดให้คนที่ไม่ login เรียกได้
  if (pathname.startsWith('/api/')) {
    if (hasCredential(request)) return NextResponse.next();

    return NextResponse.json(
      { error: { code: 'unauthorized', message: 'ต้อง login ก่อน' } },
      { status: 401, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  // ── หน้าเว็บที่ไม่ได้อยู่ใน allowlist = ถือว่าเป็นฝั่ง admin (default-deny)
  const response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          // เขียนกลับทั้ง request และ response เพื่อให้ token ที่ถูก refresh
          // ส่งต่อไปถึง server component ใน request เดียวกัน
          for (const { name, value, options } of cookiesToSet) {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  // getUser() ยิงไป GoTrue เพื่อ verify จริง — ห้ามใช้ getSession() ที่อ่านจาก cookie
  // อย่างเดียว เพราะ cookie ปลอมได้
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', `${pathname}${request.nextUrl.search}`);

    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  // ยกเว้น static asset และไฟล์ที่มีนามสกุล — ที่เหลือเข้า middleware ทั้งหมด (default-deny)
  matcher: ['/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.[\\w]+$).*)'],
};
