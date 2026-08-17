'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Icon } from '@/components/admin/icon';

/**
 * สลับธีมสว่าง/มืด — เก็บค่าใน localStorage 'notify-theme'
 * ค่าเริ่มต้น = สว่าง · no-flash จัดการที่ root layout (สคริปต์ก่อนเพนต์)
 *
 * `compact` = ปุ่มไอคอนบน header · ค่าปกติ = แถวเมนูเต็มกว้าง (drawer / SidebarAccount)
 */
export default function ThemeToggle({
  onToggle,
  compact,
}: {
  onToggle?: () => void;
  compact?: boolean;
}) {
  const t = useTranslations('shell');
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains('dark'));
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle('dark', next);

    try {
      localStorage.setItem('notify-theme', next ? 'dark' : 'light');
    } catch {
      /* โหมดส่วนตัวบางเบราว์เซอร์เขียนไม่ได้ — ไม่ใช่เรื่องคอขาดบาดตาย */
    }

    onToggle?.();
  }

  const label = dark ? t('lightMode') : t('darkMode');

  if (compact) {
    return (
      <button
        type="button"
        onClick={toggle}
        aria-label={label}
        title={label}
        className="flex h-10 w-10 items-center justify-center rounded-lg text-ink-soft transition hover:bg-raised hover:text-ink"
      >
        <Icon name={dark ? 'sun' : 'moon'} size={18} />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-ink-soft transition hover:bg-raised"
    >
      <Icon name={dark ? 'sun' : 'moon'} size={18} className="opacity-70" />
      {label}
    </button>
  );
}
