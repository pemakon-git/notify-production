'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import type { Role } from '@/lib/types';
import { ROLE_KEY } from '@/lib/status';
import { Icon } from '@/components/admin/icon';
import LanguageToggle from '@/components/admin/language-toggle';
import ThemeToggle from '@/components/admin/theme-toggle';

/**
 * ชิปบัญชีผู้ใช้ที่ "ล่างสุด sidebar" (มาตรฐาน Linear/Notion/Slack)
 * กด → popover เด้งขึ้นบน: อีเมล · ภาษา · ธีม · ออกจากระบบ
 * (เมนูระบบไม่อยู่ที่นี่ — มีในกลุ่ม SYSTEM ของ sidebar แล้ว)
 *
 * `translate="no"`: identity/บัญชีไม่ควรถูกเบราว์เซอร์แปลซ้ำ (แอปมี i18n เอง)
 * และกัน Google Translate แทรก <font> ดัน DOM จน popover ตกขอบ
 */
export default function SidebarAccount({
  user,
  collapsed,
  onSignOut,
}: {
  user: { fullName: string; email: string; role: Role };
  collapsed: boolean;
  onSignOut: () => void;
}) {
  const t = useTranslations();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const onClick = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    const onEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onEsc);

    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onEsc);
    };
  }, [open]);

  useEffect(() => setOpen(false), [pathname]);

  return (
    <div className="relative shrink-0 border-t border-border" ref={ref} translate="no">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t('shell.account')}
        title={collapsed ? user.fullName : undefined}
        className={`flex w-full items-center transition hover:bg-raised ${
          collapsed ? 'justify-center py-3' : 'gap-2.5 px-3 py-2.5'
        }`}
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink text-sm font-medium text-canvas">
          {user.fullName.charAt(0)}
        </span>

        {!collapsed && (
          <>
            <span className="min-w-0 flex-1 text-left leading-tight">
              <span className="block truncate text-sm font-medium">{user.fullName}</span>
              <span className="block truncate text-2xs text-muted">{t(ROLE_KEY[user.role])}</span>
            </span>
            <Icon name="chevron-down" size={16} className="shrink-0 rotate-180 text-muted" />
          </>
        )}
      </button>

      {open && (
        <div
          role="menu"
          className={`absolute bottom-full z-50 mb-2 max-h-[calc(100dvh-4rem)] overflow-y-auto rounded-xl2 border border-border bg-surface shadow-lift ${
            collapsed ? 'left-2 w-56' : 'left-2 right-2'
          }`}
        >
          <div className="border-b border-border px-4 py-3">
            <p className="truncate font-medium">{user.fullName}</p>
            <p className="truncate text-xs text-muted">{user.email}</p>
          </div>

          <div className="py-1">
            <LanguageToggle onToggle={() => setOpen(false)} />
            <ThemeToggle />
          </div>

          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onSignOut();
            }}
            className="block w-full border-t border-border px-4 py-2.5 text-left text-sm text-danger hover:bg-raised"
          >
            {t('shell.signOut')}
          </button>
        </div>
      )}
    </div>
  );
}
