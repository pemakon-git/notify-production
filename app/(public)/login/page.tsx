import type { Metadata } from 'next';
import { LoginForm } from '@/components/public/login-form';

export const metadata: Metadata = {
  title: 'เข้าสู่ระบบ',
  robots: { index: false, follow: false },
};

/**
 * หน้า login อยู่ใน route group (public) เพราะคนที่ยังไม่ login ต้องเข้าถึงได้
 * (middleware จึงต้องมี '/login' ใน allowlist — ถ้าไม่มีจะ redirect วนไม่จบ)
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <div className="mx-auto flex max-w-sm flex-col gap-6 py-16">
      <div>
        <h1 className="text-2xl font-semibold">เข้าสู่ระบบ</h1>
        <p className="mt-1 text-sm text-slate-600">สำหรับพนักงานเท่านั้น</p>
      </div>

      <LoginForm nextPath={next} />
    </div>
  );
}
