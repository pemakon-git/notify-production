'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import type { EffectivePermissions, Role } from '@/lib/types';
import { ROLE_KEY } from '@/lib/status';
import { apiFetch } from '@/lib/api-client';
import { useFocusTrap } from '@/lib/hooks/use-focus-trap';
import { useScrollLock } from '@/lib/hooks/use-scroll-lock';
import { Icon } from '@/components/admin/icon';
import { Modal } from '@/components/admin/ui';
import { ToastProvider } from '@/components/admin/toast';
import LanguageToggle from '@/components/admin/language-toggle';
import ThemeToggle from '@/components/admin/theme-toggle';
import PullToRefresh from '@/components/admin/pull-to-refresh';
import SidebarAccount from '@/components/admin/sidebar-account';
import { bottomSlotsFor, navGroupsFor, type NavItem } from './nav';

const RAIL_STORAGE_KEY = 'notify-rail-collapsed';
/** ออกจากระบบอัตโนมัติเมื่อไม่ได้ใช้งาน — เตือนล่วงหน้า 60 วิ */
const IDLE_MS = 30 * 60 * 1000;
const WARN_MS = 60 * 1000;

interface ShellUser {
  fullName: string;
  email: string;
  role: Role;
}

/**
 * เปลือกฝั่งพนักงาน (client) — พอร์ตจาก (app)/layout.tsx ของระบบเดิม
 *
 * shell สลับด้วย variant `mouse`/`touch` ไม่ใช่ความกว้างจอ:
 *   mouse (จอกว้าง + ไม่มี touch) → sidebar ยุบ-กางได้ (232 ↔ 64) จำสถานะใน localStorage
 *   touch (มือถือ/แท็บเล็ต)        → แถบล่างลอย 5 ช่อง + drawer โปรไฟล์
 * เพราะ iPad ต่อคีย์บอร์ดกว้างพอๆ โน้ตบุ๊ก แต่ target ต้องใหญ่แบบสัมผัส
 *
 * ตัวตรวจสิทธิ์อยู่ที่ app/(admin)/layout.tsx (server) ซึ่งส่ง user/permissions ลงมาแล้ว
 */
export function AdminShell({
  user,
  permissions,
  children,
}: {
  user: ShellUser;
  permissions: EffectivePermissions;
  children: ReactNode;
}) {
  const t = useTranslations();
  const router = useRouter();
  const pathname = usePathname();

  const [railCollapsed, setRailCollapsed] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [navCollapsed, setNavCollapsed] = useState(false);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [idleWarn, setIdleWarn] = useState(false);
  const [idleLeft, setIdleLeft] = useState(60);
  const resetIdleRef = useRef<() => void>(() => {});

  const groups = navGroupsFor(user.role, permissions);
  const slots = bottomSlotsFor(user.role, permissions);
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  const signOut = useCallback(async () => {
    try {
      await apiFetch<void>('/api/auth/logout', { method: 'POST' });
    } catch {
      // ถึง logout ที่ server จะพลาด ก็ยังต้องพาผู้ใช้ออกจากหน้าจอ
    }
    router.replace('/login');
    router.refresh();
  }, [router]);

  // จำสถานะ ยุบ/กาง sidebar — เริ่มที่ false เสมอกัน hydration mismatch แล้วค่อยอ่านตอน mount
  useEffect(() => {
    if (localStorage.getItem(RAIL_STORAGE_KEY) === '1') setRailCollapsed(true);
  }, []);

  const toggleRail = () =>
    setRailCollapsed((value) => {
      const next = !value;
      try {
        localStorage.setItem(RAIL_STORAGE_KEY, next ? '1' : '0');
      } catch {
        /* โหมดส่วนตัวบางเบราว์เซอร์เขียนไม่ได้ */
      }
      return next;
    });

  useEffect(() => setDrawer(false), [pathname]);

  useScrollLock(drawer);
  const drawerRef = useRef<HTMLElement>(null);
  useFocusTrap(drawer, drawerRef, () => setDrawer(false));

  /**
   * ซ่อนแถบล่างตอนคีย์บอร์ดเด้ง — แก้บั๊ก iOS ที่ `fixed bottom-0` ลอยขึ้นกลางจอ
   * เมื่อ visual viewport หด · พิมพ์เสร็จ (blur) แถบกลับมา
   */
  useEffect(() => {
    const isField = (target: EventTarget | null): boolean => {
      const node = target as HTMLElement | null;
      if (!node) return false;
      if (node.isContentEditable) return true;

      const tag = node.tagName;
      if (tag === 'TEXTAREA' || tag === 'SELECT') return true;
      if (tag === 'INPUT') {
        const type = (node as HTMLInputElement).type;
        return !['checkbox', 'radio', 'button', 'submit', 'reset', 'range', 'file', 'color'].includes(
          type,
        );
      }
      return false;
    };

    const onIn = (event: FocusEvent) => {
      if (isField(event.target)) setKeyboardOpen(true);
    };
    const onOut = () => setKeyboardOpen(false);

    document.addEventListener('focusin', onIn);
    document.addEventListener('focusout', onOut);
    return () => {
      document.removeEventListener('focusin', onIn);
      document.removeEventListener('focusout', onOut);
    };
  }, []);

  /** แถบล่างแบบ IG: เลื่อนลง → หุบ · เลื่อนขึ้น/ใกล้บนสุด → ขยาย (rAF throttle ให้ลื่น) */
  useEffect(() => {
    let last = window.scrollY;
    let ticking = false;

    const update = () => {
      const y = window.scrollY;
      if (y < 12) setNavCollapsed(false);
      else if (y - last > 6) setNavCollapsed(true);
      else if (last - y > 6) setNavCollapsed(false);
      last = y;
      ticking = false;
    };

    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  /** auto-logout เมื่อไม่ได้ใช้งานนาน — เตือนล่วงหน้าพร้อมนับถอยหลัง กันงานหายแบบเงียบๆ */
  useEffect(() => {
    let warnTimer: ReturnType<typeof setTimeout>;
    let outTimer: ReturnType<typeof setTimeout>;
    let countdown: ReturnType<typeof setInterval> | undefined;

    const clearAll = () => {
      clearTimeout(warnTimer);
      clearTimeout(outTimer);
      if (countdown) clearInterval(countdown);
    };

    const reset = () => {
      clearAll();
      setIdleWarn(false);

      warnTimer = setTimeout(() => {
        setIdleLeft(Math.round(WARN_MS / 1000));
        setIdleWarn(true);
        countdown = setInterval(() => setIdleLeft((s) => (s > 0 ? s - 1 : 0)), 1000);
      }, IDLE_MS - WARN_MS);

      outTimer = setTimeout(() => void signOut(), IDLE_MS);
    };

    resetIdleRef.current = reset;
    const events: (keyof WindowEventMap)[] = [
      'mousemove',
      'keydown',
      'click',
      'scroll',
      'touchstart',
    ];
    events.forEach((event) => window.addEventListener(event, reset, { passive: true }));
    reset();

    return () => {
      clearAll();
      events.forEach((event) => window.removeEventListener(event, reset));
    };
  }, [signOut]);

  const bottomHrefs = new Set(slots.map((slot) => slot.href));
  const drawerGroups = groups
    .map((group) => ({ ...group, items: group.items.filter((it) => !bottomHrefs.has(it.href)) }))
    .filter((group) => group.items.length > 0);

  return (
    <ToastProvider>
      {/* a11y: ข้ามไปเนื้อหาด้วยคีย์บอร์ด (ซ่อนจนกว่าจะโฟกัส) */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-ink focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-canvas"
      >
        {t('shell.skipToMain')}
      </a>

      <div
        className={`min-h-dvh bg-canvas mouse:grid ${
          railCollapsed ? 'mouse:grid-cols-[64px_1fr]' : 'mouse:grid-cols-[232px_1fr]'
        }`}
      >
        {/* ── Sidebar (เฉพาะอุปกรณ์ที่มีเมาส์) ── */}
        <aside className="hidden border-r border-border bg-surface mouse:block">
          <div className="sticky top-0 flex h-screen flex-col">
            {/* แบรนด์ = wordmark ล้วน ไม่มีโลโก้กล่อง · ยุบ = ตัวย่อ */}
            <div
              className={`flex h-16 shrink-0 items-center ${railCollapsed ? 'justify-center' : 'px-4'}`}
            >
              <span className="text-lg font-semibold tracking-tight">
                {railCollapsed ? 'N' : 'Notify'}
              </span>
            </div>

            <div className="flex flex-1 flex-col overflow-y-auto">
              <nav className="flex flex-1 flex-col gap-0.5 px-2 py-2" aria-label="Main">
                {groups.map((group, index) => (
                  <div
                    key={group.key}
                    className={`${group.pinBottom ? 'mt-auto' : ''} ${
                      index > 0 ? 'mt-2 border-t border-border pt-2' : ''
                    }`}
                  >
                    {group.label && !railCollapsed ? (
                      <p className="px-3 pb-1 pt-1 text-2xs font-medium uppercase tracking-wider text-muted">
                        {t(group.label)}
                      </p>
                    ) : null}

                    <div className="space-y-0.5">
                      {group.items.map((item) => (
                        <RailLink
                          key={`${item.href}-${item.label}`}
                          item={item}
                          collapsed={railCollapsed}
                          active={isActive(item.href)}
                          label={t(item.label)}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </nav>
            </div>

            <SidebarAccount user={user} collapsed={railCollapsed} onSignOut={() => void signOut()} />

            <button
              type="button"
              onClick={toggleRail}
              title={railCollapsed ? t('shell.expandSidebar') : t('shell.collapseSidebar')}
              aria-label={railCollapsed ? t('shell.expandSidebar') : t('shell.collapseSidebar')}
              className={`flex shrink-0 items-center border-t border-border py-3 text-2xs font-medium uppercase tracking-wider text-muted transition hover:bg-raised hover:text-ink ${
                railCollapsed ? 'justify-center' : 'gap-2 px-4'
              }`}
            >
              <Icon name={railCollapsed ? 'chevron-right' : 'chevron-left'} size={18} />
              {!railCollapsed && <span>{t('shell.collapse')}</span>}
            </button>
          </div>
        </aside>

        {/* ── Drawer โปรไฟล์ (มือถือ) ── */}
        {drawer && (
          <>
            <div
              className="fixed inset-0 z-40 bg-ink/40 mouse:hidden dark:bg-black/50"
              onClick={() => setDrawer(false)}
            />
            <aside
              ref={drawerRef}
              tabIndex={-1}
              role="dialog"
              aria-modal="true"
              aria-label={t('shell.menuAndProfile')}
              className="fixed inset-y-0 right-0 z-50 flex w-[280px] flex-col overflow-y-auto border-l border-border bg-surface outline-none mouse:hidden"
            >
              <div className="flex items-center gap-3 border-b border-border px-5 py-4">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-ink text-base font-medium text-canvas">
                  {user.fullName.charAt(0)}
                </span>
                <div className="min-w-0">
                  <p className="truncate font-medium">{user.fullName}</p>
                  <p className="truncate text-xs text-muted">{user.email}</p>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-3 py-3">
                {drawerGroups.map((group) => (
                  <div key={group.key} className="mb-4">
                    <p className="px-3 pb-1.5 text-2xs font-medium uppercase tracking-wider text-muted">
                      {t(group.label ?? 'shell.menu')}
                    </p>
                    {group.items.map((item) => (
                      <Link
                        key={`${item.href}-${item.label}`}
                        href={item.href}
                        onClick={() => setDrawer(false)}
                        aria-current={isActive(item.href) ? 'page' : undefined}
                        className={`mb-0.5 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${
                          isActive(item.href)
                            ? 'bg-raised text-gold-dark'
                            : item.accent
                              ? 'text-gold-dark hover:bg-raised'
                              : 'text-ink-soft hover:bg-raised'
                        }`}
                      >
                        <Icon
                          name={item.icon}
                          size={18}
                          className={isActive(item.href) || item.accent ? '' : 'opacity-70'}
                        />
                        {t(item.label)}
                      </Link>
                    ))}
                  </div>
                ))}
              </div>

              <div className="border-t border-border">
                <LanguageToggle onToggle={() => setDrawer(false)} />
                <ThemeToggle />
              </div>

              <button
                type="button"
                onClick={() => {
                  setDrawer(false);
                  void signOut();
                }}
                className="border-t border-border px-5 py-3.5 text-left text-sm font-medium text-danger hover:bg-raised"
              >
                {t('shell.signOut')}
              </button>
            </aside>
          </>
        )}

        {/* ── Main ── */}
        <div className="flex min-h-dvh flex-col">
          <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b border-border bg-surface/80 px-4 backdrop-blur mouse:px-8">
            <div className="min-w-0 mouse:hidden">
              <p className="truncate text-sm font-medium text-ink">{user.fullName}</p>
              <p className="text-2xs text-muted">{t(ROLE_KEY[user.role])}</p>
            </div>

            <div className="flex-1" />

            <div className="flex items-center gap-1">
              <LanguageToggle compact />
              <ThemeToggle compact />
            </div>
          </header>

          {/* pb-24 = เว้นที่ให้แถบล่างลอยบนมือถือ */}
          <main
            id="main-content"
            tabIndex={-1}
            className="flex-1 px-4 pb-24 pt-6 outline-none sm:touch:px-6 mouse:px-8 mouse:pb-10 mouse:pt-8"
          >
            <PullToRefresh>
              {/* key=pathname → เนื้อหา fade เข้าใหม่ทุกครั้งที่เปลี่ยนหน้า
                  ความกว้างคุมที่ shell เดียว (max-w-5xl) — หน้าใหม่ห้ามตั้งเอง */}
              <div key={pathname} className="mx-auto w-full max-w-5xl animate-fade-rise">
                {children}
              </div>
            </PullToRefresh>
          </main>
        </div>

        {/* ── แถบล่าง (มือถือ/แท็บเล็ต) ──
            z-40: เหนือ overlay ของ header (z-30) แต่ต่ำกว่า modal (z-50) */}
        <nav
          className={`pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-[max(0.875rem,env(safe-area-inset-bottom))] mouse:hidden ${
            drawer || keyboardOpen ? 'hidden' : ''
          }`}
          aria-label="Main"
        >
          <div
            className={`pointer-events-auto flex w-full max-w-md origin-bottom items-center justify-between rounded-xl2 border border-border bg-surface/95 px-2 py-1.5 shadow-card backdrop-blur transition-[transform,opacity] duration-slow ease-standard ${
              navCollapsed ? 'translate-y-1 scale-[0.86] opacity-80' : 'scale-100'
            }`}
          >
            {slots.map((item) => (
              <Link
                key={`${item.href}-${item.label}`}
                href={item.href}
                aria-current={isActive(item.href) ? 'page' : undefined}
                aria-label={t(item.label)}
                title={t(item.label)}
                className={`flex h-11 w-11 items-center justify-center rounded-full transition ${
                  isActive(item.href)
                    ? 'bg-raised text-gold-dark'
                    : item.accent
                      ? 'text-gold-dark'
                      : 'text-muted hover:bg-raised hover:text-ink'
                }`}
              >
                {/* §5: แถบล่าง = ไอคอนล้วน 24 ไม่มีข้อความ (ไม่งั้นแคบเกินบน 375px) */}
                <Icon name={item.icon} size={24} />
              </Link>
            ))}

            <button
              type="button"
              onClick={() => setDrawer((value) => !value)}
              aria-label={t('shell.menuAndProfile')}
              aria-expanded={drawer}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-muted transition hover:bg-raised hover:text-ink"
            >
              <Icon name="menu" size={20} />
            </button>
          </div>
        </nav>
      </div>

      {/* เตือนก่อนออกจากระบบอัตโนมัติ */}
      <Modal
        open={idleWarn}
        onClose={() => resetIdleRef.current()}
        title={t('shell.stillThere')}
        footer={
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="btn-ghost text-danger"
              onClick={() => {
                setIdleWarn(false);
                void signOut();
              }}
            >
              {t('shell.signOut')}
            </button>
            <button type="button" className="btn-gold" onClick={() => resetIdleRef.current()}>
              {t('shell.stayIn')}
            </button>
          </div>
        }
      >
        <p className="text-sm leading-relaxed text-ink-soft">
          {t.rich('shell.idleBody', {
            seconds: idleLeft,
            b: (chunks) => <b className="tabular-nums text-ink">{chunks}</b>,
          })}
        </p>
      </Modal>
    </ToastProvider>
  );
}

function RailLink({
  item,
  collapsed,
  active,
  label,
}: {
  item: NavItem;
  collapsed: boolean;
  active: boolean;
  label: string;
}) {
  const tone = active
    ? 'bg-raised text-gold-dark'
    : item.accent
      ? 'text-gold-dark hover:bg-raised'
      : 'text-ink-soft hover:bg-raised';

  return (
    <Link
      href={item.href}
      aria-current={active ? 'page' : undefined}
      title={collapsed ? label : undefined}
      className={`flex items-center rounded-lg transition ${tone} ${
        collapsed ? 'justify-center py-2.5' : 'gap-3 px-3 py-2 text-sm'
      }`}
    >
      <span className="relative flex shrink-0 items-center">
        {/* §5 icon size: ราง 19 (กาง) · 22 (ยุบ — ไม่มีข้อความจึงต้องใหญ่ขึ้น) */}
        <Icon
          name={item.icon}
          size={collapsed ? 22 : 19}
          className={active || item.accent ? '' : 'opacity-80'}
        />
      </span>
      {!collapsed && <span className="min-w-0 flex-1 truncate">{label}</span>}
    </Link>
  );
}
