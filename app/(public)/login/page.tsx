import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { LoginForm } from '@/components/public/login-form';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('login');

  return {
    title: t('title'),
    robots: { index: false, follow: false },
  };
}

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
  const t = await getTranslations('login');

  return (
    <div className="wrap flex max-w-md flex-col gap-6 py-20">
      <div>
        <h1 className="text-3xl font-semibold tracking-tightish">{t('title')}</h1>
        <p className="mt-1 text-sm text-v2-muted">{t('subtitle')}</p>
      </div>

      <LoginForm nextPath={next} />
    </div>
  );
}
