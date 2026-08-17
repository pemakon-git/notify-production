import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';

/**
 * i18n แบบ cookie-based (ไม่ใช้ URL routing = ไม่แตะ route เดิม → flow ไม่ชน)
 * อ่าน locale จาก cookie `NEXT_LOCALE` · **default = อังกฤษ** (ภาษาหลักตามที่เจ้าของเคาะ)
 * ไทย = ภาษารอง สลับได้จากปุ่มในเมนู
 *
 * catalog ยกมาจากระบบเดิมทั้งไฟล์ (959 key × 2 ภาษา ครบทุก namespace)
 * กติกาที่ต้องรักษา: en.json ต้องไม่มีอักษรไทยเลย · th.json มี latin ได้เฉพาะคำทับศัพท์ (Walk-in/BTS/MRT)
 */
export const LOCALES = ['en', 'th'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'en';

export const LOCALE_COOKIE = 'NEXT_LOCALE';

export default getRequestConfig(async () => {
  const store = await cookies();
  const raw = store.get(LOCALE_COOKIE)?.value;
  const locale: Locale = (LOCALES as readonly string[]).includes(raw ?? '')
    ? (raw as Locale)
    : DEFAULT_LOCALE;

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
