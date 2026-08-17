'use client';

import { useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/admin/icon';

/**
 * สลับภาษา EN ↔ TH (อังกฤษหลัก + ไทยรอง) — เก็บใน cookie `NEXT_LOCALE`
 * server (i18n/request.ts) อ่าน cookie นี้ · `router.refresh()` ให้ RSC โหลด messages ใหม่
 * ไม่แตะ URL/route → flow เดิมไม่ชน
 *
 * `compact` = ปุ่มไอคอนบน header · ค่าปกติ = แถวเมนูเต็มกว้าง
 */
export default function LanguageToggle({
  onToggle,
  compact,
}: {
  onToggle?: () => void;
  compact?: boolean;
}) {
  const locale = useLocale();
  const router = useRouter();

  function switchTo() {
    const next = locale === 'en' ? 'th' : 'en';
    document.cookie = `NEXT_LOCALE=${next};path=/;max-age=31536000;samesite=lax`;
    router.refresh();
    onToggle?.();
  }

  const label = locale === 'en' ? 'ภาษาไทย' : 'English';

  if (compact) {
    return (
      <button
        type="button"
        onClick={switchTo}
        aria-label={label}
        title={label}
        className="flex h-10 w-10 items-center justify-center rounded-lg text-ink-soft transition hover:bg-raised hover:text-ink"
      >
        <Icon name="globe" size={18} />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={switchTo}
      className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-ink-soft transition hover:bg-raised"
    >
      <Icon name="globe" size={18} className="opacity-70" />
      {label}
    </button>
  );
}
