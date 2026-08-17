'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useDebouncedValue } from '@/lib/hooks/use-debounce';
import { useScrollLock } from '@/lib/hooks/use-scroll-lock';
import { useFocusTrap } from '@/lib/hooks/use-focus-trap';
import { badgeClass, toneDot, type StatusMeta, type Tone } from '@/lib/status';
import { formatPhone } from '@/lib/format';
import { Icon, type IconName } from '@/components/admin/icon';
import PriceRange from '@/components/admin/price-range';

/** กฎกลาง: ตารางทุกหน้าแสดงไม่เกิน 8 แถว/หน้า (Global Design Rule) */
export const PAGE_SIZE = 8;

/** หัวข้อย่อยในหน้า (uppercase จาง) — มาตรฐานเดียวทั้งระบบ แทนของเดิมที่เขียนกัน 3 แบบ */
export function SectionLabel({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <h2 className={`text-xs font-semibold uppercase tracking-wide text-muted ${className}`}>{children}</h2>;
}

/**
 * SectionNav — แถบกระโดดไปแต่ละส่วน (หน้ารายละเอียดยาว · pattern Stripe/Linear)
 * sticky ใต้ top-bar (top-16) · เลื่อนแนวนอนบนมือถือ · < 2 ส่วน = ไม่แสดง (ไม่รกโดยไม่จำเป็น)
 * ผูกกับ InfoGroup ที่ส่ง id เดียวกัน (InfoGroup มี scroll-mt กันหัวข้อโดน sticky บัง)
 */
export function SectionNav({ items }: { items: { id: string; label: string }[] }) {
  if (items.length < 2) return null;
  return (
    <nav aria-label="Jump to section"
      className="sticky top-16 z-20 mt-6 mb-4 flex gap-1 overflow-x-auto rounded-xl border border-border bg-surface/85 px-1.5 py-1.5 backdrop-blur">
      {items.map((it) => (
        <a key={it.id} href={`#${it.id}`}
          className="shrink-0 whitespace-nowrap rounded-lg px-2.5 py-1 text-[13px] font-medium text-muted transition hover:bg-raised hover:text-ink">
          {it.label}
        </a>
      ))}
    </nav>
  );
}

export function PageHeader({
  title, subtitle, count, action,
}: { title: string; subtitle?: string; count?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
      <div className="flex min-w-0 items-baseline gap-2.5">
        <h1 className="truncate text-xl font-semibold tracking-tight sm:text-2xl">{title}</h1>
        {count != null && count !== '' && (
          <span className="shrink-0 text-sm font-normal text-muted">{count}</span>
        )}
      </div>
      {action}
      {subtitle && <p className="w-full text-sm text-muted">{subtitle}</p>}
    </div>
  );
}

export function StatusBadge({ map, value, short, outline }: { map: Record<string, StatusMeta>; value: string; short?: boolean; outline?: boolean }) {
  const t = useTranslations();
  const s = map[value];
  const full = s ? t(s.labelKey) : value; // ไม่มี entry → โชว์ค่าดิบ
  const label = short ? full.split(' · ')[0] : full; // มือถือ: ตัดส่วนหลัง " · " ออก
  return <span className={badgeClass(s?.tone ?? 'neutral', outline)}>{label}</span>;
}

/** Spinner — "กำลังทำงานอยู่" (รอสั้น ๆ เช่น กดส่ง) */
export function Spinner({ className = 'h-4 w-4' }: { className?: string }) {
  return <span role="status" aria-label="Working" className={`inline-block animate-spin rounded-full border-2 border-current border-t-transparent ${className}`} />;
}

/** ProgressBar — "เหลืออีกเท่าไหร่" (งานยาว เช่น อัปโหลด) */
export function ProgressBar({ value }: { value: number }) {
  const w = Math.min(100, Math.max(0, value));
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-border/60" role="progressbar" aria-valuenow={w}>
      <div className="h-full rounded-full bg-gold transition-[width] duration-200" style={{ width: `${w}%` }} />
    </div>
  );
}

export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2 p-4">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-14 animate-pulse rounded-lg bg-canvas" />
      ))}
    </div>
  );
}

export function EmptyState({ text, action, icon = 'search' }: { text: string; action?: React.ReactNode; icon?: IconName }) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
      {/* icon ทองจาง — โทนแบรนด์เดียวกับ empty state หน้า public (คงกระชับ เหมาะ dense tool) */}
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-gold/10 text-gold-dark"><Icon name={icon} size={22} /></span>
      <p className="text-sm text-muted">{text}</p>
      {action}
    </div>
  );
}

/** สถานะโหลดไม่สำเร็จ + ปุ่มลองใหม่ (MR-26) — ใช้ในหน้าที่ fetch เอง (ไม่ใช่ useList) */
export function ErrorState({ onRetry, text }: { onRetry?: () => void; text?: string }) {
  const t = useTranslations();
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-danger/10 text-danger"><Icon name="alert-triangle" size={22} /></span>
      <p className="text-sm text-muted">{text ?? t('common.loadFailed')}</p>
      {onRetry && <button className="btn-ghost btn-sm" onClick={onRetry}>{t('common.retry')}</button>}
    </div>
  );
}

/**
 * InfoRow — กฎกลาง "1 บรรทัด = 1 ข้อมูล" (R1): label ซ้าย(จาง) / value ขวา(เข้ม) คั่นด้วย divide-y
 * ใช้แทน grid หลายคอลัมน์ในหน้ารายละเอียด/modal (ที่กวาดตาซ้าย-ขวาแล้วลายตา)
 *  - href / onClick → ทั้งแถวกดได้ + chevron ขวา (ให้ affordance ว่าคลิกได้)
 *  - action        → element เล็กชิดขวา (เช่น ปุ่มคัดลอก) แสดงคู่กับ value
 *  - hideEmpty     → ค่าว่าง/undefined → ไม่ render แถว (แทนโชว์ "—" เรียงยาวรก)
 *  - stack         → ค่ายาว (โน้ต/ที่อยู่): label บน / value ล่าง เต็มกว้าง อ่านง่ายบนมือถือ
 *  - strong/mono   → value เด่น (เงิน) / mono+tabular (code, ตัวเลข)
 * touch: แถวสูงขึ้น (py-3) ให้ hit-area ≥44px
 */
export function InfoRow({
  label, value, href, onClick, action, hideEmpty, stack, strong, mono, icon, hideChevron, className = '',
}: {
  label: React.ReactNode;
  value?: React.ReactNode;
  href?: string;
  onClick?: () => void;
  action?: React.ReactNode;
  hideEmpty?: boolean;
  stack?: boolean;
  strong?: boolean;
  mono?: boolean;
  icon?: IconName; // ไอคอนนำหน้า label (ช่วยกวาดสายตา — ใช้เสริมเฉพาะกลุ่มสเปก ไม่ใส่รก)
  hideChevron?: boolean; // ซ่อน chevron ท้ายแถวลิงก์ — ใช้ตอนอยาก minimal (นำทางบอกด้วย hover แทน สไตล์ Linear/Notion)
  className?: string;
}) {
  const isEmpty = value == null || value === '' || value === '—';
  const interactive = !!(href || onClick);
  if (hideEmpty && isEmpty && !action && !interactive) return null;

  const valueNode = (
    <span
      className={[
        'break-words text-sm',
        strong ? 'font-semibold' : '',
        mono ? 'font-mono tabular-nums' : '',
        isEmpty ? 'text-faint' : 'text-ink',
      ].filter(Boolean).join(' ')}
    >
      {isEmpty ? '—' : value}
    </span>
  );
  const chevron = interactive && !hideChevron
    ? <Icon name="chevron-right" size={16} className="shrink-0 text-faint transition group-hover:text-muted sm:ml-auto" />
    : null;
  // ไอคอนนำหน้า label (ถ้ามี) — ช่วยกวาดสายตากลุ่มสเปก
  const labelNode = icon
    ? <span className="inline-flex items-center gap-1.5"><Icon name={icon} size={14} className="shrink-0 text-faint" />{label}</span>
    : label;

  // proximity (Gestalt): label กับ value เป็นคู่กัน ต้องอยู่ใกล้กัน
  //  - มือถือ (<sm): label ซ้าย / value ขวา (justify-between) — จอแคบ ช่องเล็ก คุ้นตาแบบ iOS Settings
  //  - iPad/เดสก์ท็อป (sm+): label คอลัมน์แคบคงที่ (w-36) / value ชิด label ซ้าย เป็น "รางเดียว"
  //    → คู่อยู่ติดกัน ไม่มีช่องกลางบานเสียเปล่าบนจอกว้าง (แบบ Stripe/Linear/GitHub sidebar)
  // stack = ค่ายาว (ที่อยู่/โน้ต) → label บน / value ล่าง เต็มกว้าง (ห่อหลายบรรทัดสวย ไม่บีบ)
  const inner = stack ? (
    // มือถือ = stack (label บน / value ล่าง full-width อ่านง่าย) · sm+ = rail (label w-36 + value flex-1) ให้ค่ายาว (ที่อยู่/โน้ต/รายละเอียด) align คอลัมน์เดียวกับแถวอื่น
    <div className="py-2.5 touch:py-3 sm:flex sm:items-start sm:gap-3">
      <span className="mb-1 block text-xs text-muted sm:mb-0 sm:w-36 sm:shrink-0 sm:text-sm">{labelNode}</span>
      <span className="flex min-w-0 items-start gap-2 sm:flex-1">{valueNode}{action}{chevron}</span>
    </div>
  ) : (
    <div className="flex items-center justify-between gap-4 py-2.5 touch:py-3 sm:justify-start sm:gap-3">
      <span className="shrink-0 text-sm text-muted sm:w-36">{labelNode}</span>
      <span className="flex min-w-0 items-center justify-end gap-2 text-right sm:flex-1 sm:justify-start sm:text-left">{valueNode}{action}{chevron}</span>
    </div>
  );

  const interactiveCls = 'group block outline-none transition hover:bg-raised/60 focus-visible:bg-raised focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gold';
  if (href) return <Link href={href} className={`${interactiveCls} ${className}`}>{inner}</Link>;
  if (onClick) return <button type="button" onClick={onClick} className={`${interactiveCls} w-full text-left ${className}`}>{inner}</button>;
  return <div className={className}>{inner}</div>;
}

/**
 * RailBlock — เนื้อเต็มกว้าง (chips/ลิสต์/เอกสาร/ประวัติ) ให้ชิด "ราง value" เดียวกับ InfoRow (Tang A)
 *  - มือถือ (<sm): เต็มกว้าง (ไม่มีราง — InfoRow ก็ justify-between)
 *  - sm+: เว้นคอลัมน์ว่าง w-36 + gap-3 (เรขาคณิตตรง InfoRow) → เนื้อเริ่มที่รางเดียวกับค่าอื่น = การ์ดมีขอบเนื้อเดียว
 */
export function RailBlock({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`sm:flex sm:gap-3 ${className}`}>
      <span className="hidden sm:block sm:w-36 sm:shrink-0" aria-hidden />
      <div className="min-w-0 sm:flex-1">{children}</div>
    </div>
  );
}

/**
 * InfoGroup — กล่องเอกสารสไตล์ Claude: หัว (header) → เนื้อ (rows R1) → ท้าย (footer)
 * รวมหลายข้อมูลในกล่องเดียว ภายในไล่ลงทีละบรรทัดตามกฎ R1 (1 บรรทัด 1 ข้อมูล)
 *  - label  → หัวข้อกลุ่ม (ชิดซ้าย uppercase จาง) = "หัว"
 *  - action → element ชิดขวาของหัว (เช่น ปุ่ม "แก้ไข")
 *  - footer → "ท้าย" meta/สรุป ปิดกลุ่ม คั่นเส้นบน จาง (เช่น "อัปเดตล่าสุด…", จำนวน)
 *  - bare   → ไม่ห่อ card (ใช้เมื่อฝังในกล่องที่มีอยู่แล้ว)
 */
export function InfoGroup({
  label, action, footer, children, bare, id, className = '',
}: {
  label?: React.ReactNode;
  action?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
  bare?: boolean;
  id?: string;         // ผูกกับ SectionNav (กระโดดมาส่วนนี้) — section มี scroll-mt กัน sticky บัง
  className?: string;
}) {
  const body = (
    <>
      {(label || action) && (
        // หัว: หัวข้อชิดซ้าย + action ชิดขวา (justify-between) — ขอบเขตกลุ่มชัด สแกนง่าย (สไตล์ Claude/Linear)
        <div className="flex items-center justify-between gap-3 px-4 pb-2.5 pt-3.5 sm:px-5">
          {label ? <SectionLabel>{label}</SectionLabel> : <span />}
          {action}
        </div>
      )}
      {/* เนื้อ: แต่ละแถว label ซ้าย/value ขวา (จัดใน InfoRow) */}
      <div className="divide-y divide-border/60 px-4 sm:px-5">{children}</div>
      {footer && (
        // ท้าย: meta ปิดกลุ่ม — คั่นเส้นบน จาง อ่านเป็น "ส่วนสรุป"
        <div className="mt-0.5 border-t border-border/60 px-4 py-2.5 text-xs text-muted sm:px-5">{footer}</div>
      )}
    </>
  );
  if (bare) return <div id={id} className={id ? `scroll-mt-28 ${className}` : className}>{body}</div>;
  return <section id={id} className={`scroll-mt-28 overflow-hidden rounded-card border border-border bg-surface ${footer ? '' : 'pb-1'} ${className}`}>{body}</section>;
}

/**
 * DetailHeader — หัวหน้ารายละเอียดมาตรฐาน (Direction A "แคปชั่นเดียว" — 2 ระดับสายตา)
 * บรรทัด 1 = ชื่อ(พระเอก) + ราคา฿ ลอยขวา (คนละสี/น้ำหนัก = เด่นแต่ไม่แย่งกัน)
 * บรรทัด 2 = แคปชั่นจางเส้นเดียว: [จุดสถานะ+ข้อความ] · subtitle · รหัส(จาง) — ตาอ่านเป็นประโยคเดียว ไม่ใช่ชิปหลายชุด
 * สถานะรับเป็น statusMap+statusValue (เรนเดอร์เป็นจุดสีในตัว) แทน badge node เดิม · telemetry(ยอดวิว)ย้ายออกจากหัว
 */
export function DetailHeader({
  backHref, backLabel, code, statusMap, statusValue, title, subtitle, price, priceSuffix, actions, className = '',
}: {
  backHref?: string;
  backLabel?: string;
  code?: React.ReactNode;
  statusMap?: Record<string, StatusMeta>;
  statusValue?: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  price?: React.ReactNode;
  priceSuffix?: React.ReactNode;
  actions?: React.ReactNode; // ปุ่ม action — เดสก์ท็อป: ชิดขวาหัว · มือถือ: stack ล่าง (ปกติ action อยู่ราง ไม่ใช้ที่นี่)
  className?: string;
}) {
  const t = useTranslations();
  const st = statusMap && statusValue != null ? statusMap[statusValue] : undefined;
  const stLabel = st ? t(st.labelKey) : (statusValue ?? null);
  const hasCaption = stLabel || subtitle || code;
  return (
    <div className={className}>
      {backHref && (
        <Link href={backHref} className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
          <Icon name="arrow-left" size={16} /> {backLabel ?? t('common.back')}
        </Link>
      )}
      <div className={`${backHref ? 'mt-3 ' : ''}sm:flex sm:items-start sm:justify-between sm:gap-4`}>
        <div className="min-w-0 flex-1">
          {/* แถวชื่อ + ราคา — คลัสเตอร์เดียวชิดซ้าย (ราคาเกาะหลังชื่อ baseline เดียว) ไม่ปักขอบขวา = ตาโฟกัสจุดเดียว ไม่ต้องกวาด */}
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-0.5">
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{title}</h1>
            {price != null && price !== '' && (
              <p className="whitespace-nowrap text-lg font-semibold tabular-nums text-gold-dark sm:text-xl">
                ฿{price}
                {priceSuffix && <span className="ml-0.5 text-xs font-normal text-muted">{priceSuffix}</span>}
              </p>
            )}
          </div>
          {/* แคปชั่นจางเส้นเดียว — สถานะ(จุด) · คำอธิบาย · รหัส */}
          {hasCaption && (
            <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
              {stLabel && (
                <span className="inline-flex items-center gap-1.5">
                  <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${toneDot(st?.tone ?? 'neutral')}`} />
                  {stLabel}
                </span>
              )}
              {st && subtitle && <span className="text-faint" aria-hidden>·</span>}
              {subtitle && <span className="min-w-0">{subtitle}</span>}
              {(st || subtitle) && code && <span className="text-faint" aria-hidden>·</span>}
              {code && <span className="font-mono text-xs text-faint">{code}</span>}
            </div>
          )}
        </div>
        {actions && <div className="mt-4 shrink-0 sm:mt-0">{actions}</div>}
      </div>
    </div>
  );
}

/** ActionBar — แถวปุ่มมาตรฐาน (R3: 1 primary gold / รอง ghost / อันตราย+รองยุบใน MoreMenu) */
export function ActionBar({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`flex flex-wrap items-center gap-2 ${className}`}>{children}</div>;
}

/**
 * MoreMenu — ปุ่ม ⋯ + เมนู action รอง/อันตราย (fixed-position + flip + portal เหมือน Combobox)
 * ไม่ใช้ scroll-lock (เป็น popover เล็ก ไม่ใช่ modal) → ไม่ชน R2; ปิดเมื่อคลิกนอก/Esc/เลื่อน-รีไซส์=ปรับตำแหน่ง
 */
export function MoreMenu({
  items, label = 'More options', align = 'end', className = '',
}: {
  items: { label: string; onClick: () => void; icon?: IconName; danger?: boolean; disabled?: boolean }[];
  label?: string;
  align?: 'start' | 'end';
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ left: number; top?: number; bottom?: number; maxH: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const MENU_W = 208;

  function place() {
    const r = btnRef.current?.getBoundingClientRect();
    if (!r) return;
    const spaceBelow = window.innerHeight - r.bottom;
    const openUp = spaceBelow < 240 && r.top > spaceBelow;
    const rawLeft = align === 'end' ? r.right - MENU_W : r.left;
    setPos({
      left: Math.max(8, Math.min(rawLeft, window.innerWidth - MENU_W - 8)),
      top: openUp ? undefined : r.bottom + 4,
      bottom: openUp ? window.innerHeight - r.top + 4 : undefined,
      maxH: Math.min(320, (openUp ? r.top : spaceBelow) - 12),
    });
  }
  function toggle() { if (open) { setOpen(false); return; } place(); setOpen(true); }

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => { if (!btnRef.current?.contains(e.target as Node) && !menuRef.current?.contains(e.target as Node)) setOpen(false); };
    // Esc: capture-phase + stopPropagation → เมื่ออยู่ใน Modal ให้เมนูปิดก่อน ไม่ทะลุไปปิด Modal (ต่างเลเยอร์)
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); setOpen(false); } };
    const onScroll = (e: Event) => { if (!menuRef.current?.contains(e.target as Node)) place(); };
    const onResize = () => place();
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey, true);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onResize);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey, true);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onResize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (items.length === 0) return null;

  return (
    <>
      <button type="button" ref={btnRef} aria-label={label} aria-haspopup="menu" aria-expanded={open} onClick={toggle}
        className={`flex h-9 w-9 touch:h-10 touch:w-10 items-center justify-center rounded-lg border border-border bg-surface text-ink-soft transition duration-150 hover:border-ink/40 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold active:scale-90 ${className}`}>
        <Icon name="more-horizontal" size={18} />
      </button>
      {open && pos && createPortal(
        <div ref={menuRef} role="menu"
          style={{ position: 'fixed', left: pos.left, width: MENU_W, top: pos.top, bottom: pos.bottom, maxHeight: pos.maxH }}
          className="z-[60] overflow-y-auto overscroll-contain rounded-xl2 border border-border bg-surface py-1 shadow-lift">
          {items.map((it, i) => (
            <button key={i} type="button" role="menuitem" disabled={it.disabled}
              onClick={() => { setOpen(false); it.onClick(); }}
              className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition hover:bg-raised disabled:pointer-events-none disabled:opacity-40 ${it.danger ? 'text-danger' : 'text-ink'}`}>
              {it.icon && <Icon name={it.icon} size={16} className="shrink-0 opacity-70" />}
              {it.label}
            </button>
          ))}
        </div>,
        document.body,
      )}
    </>
  );
}

export function Pagination({ meta, page, setPage, limit = PAGE_SIZE }: {
  meta: { page?: number; totalPages?: number; total?: number }; page: number; setPage: (p: number) => void; limit?: number;
}) {
  const totalPages = meta.totalPages ?? 1;
  if (totalPages <= 1) return null;
  const total = meta.total ?? 0;
  const start = (page - 1) * limit + 1;
  const end = Math.min(page * limit, total || page * limit);
  return (
    <div className="mt-4 flex items-center justify-between gap-2 px-1">
      <span className="text-sm tabular-nums text-muted">{total ? `${start}–${end} of ${total}` : `Page ${page} of ${totalPages}`}</span>
      <div className="flex items-center gap-1.5">
        <button aria-label="Previous" className="flex h-9 w-9 touch:h-10 touch:w-10 items-center justify-center rounded-lg border border-border bg-surface text-ink-soft transition duration-150 enabled:hover:border-ink/40 enabled:hover:text-ink enabled:active:scale-90 disabled:opacity-40"
          disabled={page <= 1} onClick={() => setPage(page - 1)}><Icon name="chevron-left" size={18} /></button>
        <span className="min-w-[2.5rem] text-center text-sm font-medium">{page}/{totalPages}</span>
        <button aria-label="Next" className="flex h-9 w-9 touch:h-10 touch:w-10 items-center justify-center rounded-lg border border-border bg-surface text-ink-soft transition duration-150 enabled:hover:border-ink/40 enabled:hover:text-ink enabled:active:scale-90 disabled:opacity-40"
          disabled={page >= totalPages} onClick={() => setPage(page + 1)}><Icon name="chevron-right" size={18} /></button>
      </div>
    </div>
  );
}

/** Avatar วงกลมตัวอักษรย่อ — ใช้ในฟีดกิจกรรม/หัวข้อ (ไม่มีรูปจริงก็ใช้อักษรตัวแรก)
 *  v2 a11y: bg-ink-soft (warm gray) แทน bg-ink — มีน้ำหนักทั้ง light (วงเข้ม) และ dark (เทา muted ไม่ขาวจ้า) */
export function Avatar({ name, size = 38 }: { name?: string; size?: number }) {
  const initial = (name?.trim()?.[0] ?? '?').toUpperCase();
  return (
    <span className="flex shrink-0 items-center justify-center rounded-full bg-ink-soft font-semibold text-canvas"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.4) }}>{initial}</span>
  );
}

export function Modal({ open, onClose, title, children, footer, size = 'lg', confirmOnClose = false }: {
  open: boolean; onClose: () => void; title: string; children: React.ReactNode;
  footer?: React.ReactNode; // ปุ่ม action — ตรึงไว้ล่างกล่อง (ไม่เลื่อนหาย/ไม่โดนแป้นพิมพ์กิน)
  size?: 'lg' | 'xl'; // xl = ฟอร์มยาว/หลายคอลัมน์ (เช่น เพิ่มทรัพย์)
  // BUG-L2: ฟอร์มที่ "มีข้อมูลค้าง" ส่ง confirmOnClose=true → ปิดผ่าน backdrop/Esc/ปุ่ม × จะถามยืนยันก่อน
  // (ปุ่มในฟอร์ม เช่น "ยกเลิก/บันทึก" ยังควบคุมเองในหน้า) · read-only modal ไม่ต้องส่ง = ปิดได้เลย
  confirmOnClose?: boolean;
}) {
  // render ผ่าน portal ไป <body> เพื่อ "หนี" ancestor ใด ๆ ที่มี transform/filter
  // (เช่น .animate-fade-rise ที่ครอบ children) — ancestor พวกนี้ทำให้ position:fixed
  // ยึดกับมันแทน viewport → backdrop ไม่เต็มจอ + กล่องขยับ/เลื่อนตามได้ (มือถือ/iPad)
  // mount guard กัน SSR (document ยังไม่มีตอน render ฝั่งเซิร์ฟเวอร์)
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  // สถานะ "กำลังถามละทิ้งข้อมูล" — เมื่อ true จะซ้อน ConfirmDialog ทับ
  const [askDiscard, setAskDiscard] = useState(false);
  useEffect(() => { if (!open) setAskDiscard(false); }, [open]); // reset เมื่อกล่องปิด

  // ล็อกพื้นหลังแบบกันได้จริงบน iOS (position:fixed) — กันหน้า/กล่อง "ขยับ/เลื่อนได้" ใต้กล่อง
  // (ref-count → ตอนซ้อน ConfirmDialog ล็อก 2 ชั้นไม่ leak)
  useScrollLock(open);

  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId(); // ผูก aria-labelledby → screen reader อ่านหัวข้อกล่อง
  const t = useTranslations();

  // ปิดผ่าน gesture ที่ "พลาดได้" (backdrop/Esc/×): มีข้อมูลค้าง → ถามก่อน, ไม่งั้นปิดเลย
  const requestClose = () => { if (confirmOnClose) setAskDiscard(true); else onClose(); };

  // a11y dialog มาตรฐาน (Esc ปิด · focus trap · โฟกัสเริ่มที่กล่อง · คืนโฟกัสให้ตัวที่เปิดตอนปิด)
  // gate ด้วย mounted → effect รันหลัง portal พร้อม (panelRef ถูกเซ็ต) แม้กรณี modal เปิดมาตั้งแต่แรก
  // gate ด้วย !askDiscard → ตอนถามยืนยัน "ปิด trap ฟอร์มชั่วคราว" ให้ ConfirmDialog เป็นเจ้าของ Esc/Tab
  //   คนเดียว (กัน keydown listener 2 ตัวรับ Esc พร้อมกัน → เปิด-ปิดกันเอง)
  useFocusTrap(open && mounted && !askDiscard, panelRef, requestClose);

  if (!open || !mounted) return null;
  return createPortal(
    <>
    {/* จัดกึ่งกลางจอทุกขนาด (ตามที่ผู้ใช้ขอ) — ไม่ใช่แผ่นเด้งล่างที่โดนแป้นพิมพ์กิน
        ใช้ 100dvh กัน address-bar/คีย์บอร์ดมือถือ; กล่องเป็น flex-col → body เลื่อนได้ หัว/ท้ายตรึง
        backdrop = scrim เทาเนียนสม่ำเสมอ (ink/55, dark:black/55) ให้โฟกัสที่กล่อง ไม่เห็น "รอยต่อ"
        overscroll-contain = กัน scroll ลามไปหน้าพื้นหลัง */}
    <div className="fixed inset-0 z-50 flex animate-fade-in items-center justify-center overflow-y-auto overscroll-contain bg-ink/55 p-4 backdrop-blur-sm dark:bg-black/55"
      style={{ minHeight: '100dvh' }} onClick={requestClose}>
      <div ref={panelRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby={titleId}
        className={`flex max-h-[90dvh] w-full animate-modal-in flex-col overflow-hidden rounded-xl2 border border-border bg-surface shadow-lift outline-none ${size === 'xl' ? 'max-w-2xl' : 'max-w-lg'}`} onClick={(e) => e.stopPropagation()}>
        <div className="flex shrink-0 items-center justify-between border-b border-border px-5 py-4">
          <h2 id={titleId} className="font-semibold">{title}</h2>
          <button onClick={requestClose} aria-label={t('common.close')} className="-mr-1 rounded-lg p-1.5 text-muted hover:bg-raised hover:text-ink"><Icon name="x" size={20} /></button>
        </div>
        <div className="flex-1 overflow-y-auto overscroll-contain p-5">{children}</div>
        {footer && <div className="shrink-0 border-t border-border bg-surface p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">{footer}</div>}
      </div>
    </div>
    {/* ถามก่อนทิ้งข้อมูล — ซ้อนบนฟอร์ม (BUG-L2) */}
    <ConfirmDialog open={askDiscard} onClose={() => setAskDiscard(false)}
      title={t('common.discardTitle')} tone="danger" confirmLabel={t('common.discard')}
      message={t('common.discardMsg')}
      onConfirm={() => { setAskDiscard(false); onClose(); }} />
    </>,
    document.body,
  );
}

/**
 * ConfirmDialog — กล่องยืนยันมาตรฐาน (แทน window.confirm/prompt)
 * - destructive: tone="danger" → ปุ่มแดงเต็ม
 * - ขอเหตุผล: withReason → มี textarea, ส่งค่าผ่าน onConfirm(reason)
 */
export function ConfirmDialog({
  open, onClose, title, message, confirmLabel, tone = 'default',
  withReason, reasonRequired, reasonLabel, reasonPlaceholder, busy, onConfirm,
}: {
  open: boolean; onClose: () => void; title: string; message?: React.ReactNode;
  confirmLabel?: string; tone?: 'default' | 'danger'; withReason?: boolean;
  reasonRequired?: boolean; reasonLabel?: string; reasonPlaceholder?: string; busy?: boolean;
  onConfirm: (reason?: string) => void;
}) {
  const t = useTranslations();
  const [reason, setReason] = useState('');
  useEffect(() => { if (open) setReason(''); }, [open]);
  const reasonMissing = !!(withReason && reasonRequired && !reason.trim());
  return (
    <Modal open={open} onClose={onClose} title={title}
      footer={
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-ghost" onClick={onClose} disabled={busy}>{t('common.cancel')}</button>
          <button type="button" disabled={busy || reasonMissing} className={tone === 'danger' ? 'btn-danger' : 'btn-gold'}
            onClick={() => onConfirm(withReason ? (reason.trim() || undefined) : undefined)}>
            {busy ? t('common.working') : (confirmLabel ?? t('common.confirm'))}
          </button>
        </div>
      }>
      {message && <p className="text-sm leading-relaxed text-ink-soft">{message}</p>}
      {withReason && (
        <label className={`block ${message ? 'mt-4' : ''}`}>
          <span className="mb-1.5 block text-sm font-medium text-ink-soft">{reasonLabel ?? t('common.reasonOptional')}</span>
          <textarea className="field h-auto py-2.5" rows={3} placeholder={reasonPlaceholder}
            value={reason} onChange={(e) => setReason(e.target.value)} />
        </label>
      )}
    </Modal>
  );
}

export function Field({ label, error, hint, ...props }: {
  label: string; error?: string; hint?: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block min-w-0">
      <span className="mb-1.5 block text-sm font-medium text-ink-soft">{label}</span>
      <input className={`field ${error ? 'border-danger focus:border-danger focus:ring-danger/20' : ''}`} {...props} />
      {error ? (
        <span className="mt-1 block text-xs text-danger">{error}</span>
      ) : hint ? (
        <span className="mt-1 block text-xs text-muted">{hint}</span>
      ) : null}
    </label>
  );
}

// MR-38: ลบ SelectField (dead export — ไม่มีผู้ใช้; ใช้ Combobox แทนทั้งหมด)

/**
 * Combobox — ช่องเลือกที่ "พิมพ์ค้นหา + เลื่อน" ได้ (สำหรับลิสต์ยาว เช่น ทรัพย์/เจ้าของ/จังหวัด)
 * หน้าตา error/hint รูปแบบเดียวกับ Field
 */
export function Combobox({ label, error, hint, value, onChange, options, placeholder, disabled, searchable = true, size, onSearch, loading, loadError, onRetry }: {
  label: string; error?: string; hint?: string;
  value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string; disabled?: boolean;
  searchable?: boolean;   // false = ใช้เป็น select พรีเมียม (ไม่มีช่องค้นหา) สำหรับลิสต์สั้น
  size?: 'sm';            // sm = สูง 36px สำหรับแถบเครื่องมือ
  onSearch?: (q: string) => void;  // MR-24: ตั้ง = ค้นหาฝั่ง server (รองรับ >100 รายการ)
  loading?: boolean;
  loadError?: boolean;             // โหลดตัวเลือกล้มเหลว → โชว์ "ลองใหม่" แทน "ไม่พบรายการ"
  onRetry?: () => void;            // คู่กับ loadError
}) {
  const t = useTranslations();
  const ph = placeholder ?? t('common.selectPlaceholder');
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const labelId = useId(); // a11y: ผูก label (span) กับปุ่ม combobox → screen reader อ่านชื่อช่อง
  // จำ label ของ option ที่เคยเห็น (MR-24) — กันป้ายหายเมื่อ server-search เปลี่ยนชุด options หลังเลือก
  const labelCache = useRef(new Map<string, string>());
  useEffect(() => { options.forEach((o) => labelCache.current.set(o.value, o.label)); }, [options]);
  // ตำแหน่งเมนูแบบ fixed (อ้างอิง viewport) → ไม่โดน overflow ของ modal/การ์ดตัดทิ้ง + พลิกขึ้นถ้าที่ด้านล่างไม่พอ
  const [pos, setPos] = useState<{ left: number; width: number; top?: number; bottom?: number; maxH: number } | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const cachedLabel = value ? labelCache.current.get(value) : undefined;
  const selected = options.find((o) => o.value === value)
    ?? (cachedLabel ? { value, label: cachedLabel } : undefined);
  // server-search (onSearch) → ใช้ options ที่ server กรองมาแล้ว; ไม่งั้นกรองฝั่ง client
  const filtered = onSearch
    ? options
    : searchable && q.trim()
      ? options.filter((o) => o.label.toLowerCase().includes(q.trim().toLowerCase()))
      : options;

  function place() {
    const r = btnRef.current?.getBoundingClientRect();
    if (!r) return;
    const spaceBelow = window.innerHeight - r.bottom;
    const openUp = spaceBelow < 300 && r.top > spaceBelow;
    setPos({
      left: r.left, width: r.width,
      top: openUp ? undefined : r.bottom + 4,
      bottom: openUp ? window.innerHeight - r.top + 4 : undefined,
      maxH: Math.min(320, (openUp ? r.top : spaceBelow) - 12),
    });
  }
  function toggle() { if (open) { setOpen(false); return; } setQ(''); onSearch?.(''); place(); setOpen(true); }

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node) && !menuRef.current?.contains(e.target as Node)) setOpen(false); };
    // เลื่อน/รีไซส์ (รวมคีย์บอร์ดมือถือเด้ง = window resize + iOS เลื่อนจอหาช่อง) → ปรับตำแหน่งเมนูให้ยังชิด trigger
    // เดิมสั่งปิด → บนมือถือ autoFocus ช่องค้นหาทำคีย์บอร์ดขึ้น → เด้งปิดทันที เปิดใช้ไม่ได้ · ตอนนี้ = popover เลื่อนตาม
    const onScroll = (e: Event) => { if (!menuRef.current?.contains(e.target as Node)) place(); };
    const onResize = () => place();
    document.addEventListener('mousedown', onDoc);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onResize);
    return () => { document.removeEventListener('mousedown', onDoc); window.removeEventListener('scroll', onScroll, true); window.removeEventListener('resize', onResize); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      {label && <span id={labelId} className="mb-1.5 block text-sm font-medium text-ink-soft">{label}</span>}
      <button type="button" disabled={disabled} ref={btnRef} aria-labelledby={label ? labelId : undefined}
        aria-haspopup="listbox" aria-expanded={open}
        onClick={toggle}
        className={`field flex items-center justify-between text-left ${size === 'sm' ? 'h-9 text-sm' : ''} ${error ? 'border-danger focus:border-danger focus:ring-danger/20' : ''} ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}>
        <span className={`truncate ${selected ? '' : 'text-faint'}`}>{selected ? selected.label : ph}</span>
        <Icon name="chevron-down" size={16} className={`ml-2 shrink-0 text-faint transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && !disabled && pos && (
        <div ref={menuRef} style={{ position: 'fixed', left: pos.left, width: pos.width, top: pos.top, bottom: pos.bottom, maxHeight: pos.maxH }}
          className="z-[60] flex flex-col overflow-hidden rounded-xl2 border border-border bg-surface shadow-lift">
          {searchable && (
            <div className="shrink-0 border-b border-border p-2">
              {/* autoFocus เฉพาะเมาส์ (เดสก์ท็อป) — มือถือไม่เด้งคีย์บอร์ดบังเมนูตอนเปิด (แตะช่องเองถ้าจะกรอง) */}
              <input autoFocus={typeof window !== 'undefined' && !window.matchMedia?.('(any-pointer: coarse)').matches}
                className="field h-9" placeholder={t('common.typeToSearch')} value={q}
                onChange={(e) => { setQ(e.target.value); onSearch?.(e.target.value); }} />
            </div>
          )}
          <ul className="min-h-0 flex-1 overflow-y-auto overscroll-contain py-1">
            {loading ? (
              <li className="px-3 py-2 text-sm text-muted">{t('common.searching')}</li>
            ) : loadError ? (
              <li className="flex items-center justify-between gap-2 px-3 py-2 text-sm text-warning">
                <span>{t('common.loadFailed')}</span>
                {onRetry && <button type="button" onClick={onRetry} className="font-medium underline">{t('common.retry')}</button>}
              </li>
            ) : filtered.length === 0 ? (
              <li className="px-3 py-2 text-sm text-muted">{t('common.noResults')}</li>
            ) : filtered.map((o) => (
              <li key={o.value || '__empty'}>
                <button type="button" onClick={() => { onChange(o.value); setOpen(false); }}
                  className={`block w-full px-3 py-2 text-left text-sm hover:bg-raised ${o.value === value ? 'font-medium text-gold-dark' : ''}`}>
                  {o.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      {error ? (
        <span className="mt-1 block text-xs text-danger">{error}</span>
      ) : hint ? (
        <span className="mt-1 block text-xs text-muted">{hint}</span>
      ) : null}
    </div>
  );
}

/** เบอร์โทรที่ "แตะแล้วโทรเลย" — หยุด event ไม่ให้ไปชนการแตะแถว (เปิด detail) */
// ไม่มีไอคอน ☎ (owner precedent: ไอคอนทำข้อความเคลื่อน) + จัดรูปเบอร์ในตัวเอง → ทุกหน้าตรงกันถาวร
export function PhoneLink({ phone, className = '' }: { phone?: string | null; className?: string }) {
  if (!phone) return <span className={className}>—</span>;
  return (
    <a href={`tel:${phone.replace(/[^0-9+]/g, '')}`} onClick={(e) => e.stopPropagation()}
      className={`inline-flex items-center transition hover:text-gold-dark ${className}`}>
      {formatPhone(phone)}
    </a>
  );
}

/** ตัวกรองแบบ segmented (เลือกทีละอัน) — แทน FilterChips เดิม ดูสะอาดกว่า
 *  มือถือ: พิลล์แคบลง (css) ให้ 5 ตัวเลือกพอดี 375px + ซ่อน scrollbar + scroll-snap · เลื่อน active เข้าจอ (กรณี ?status=…)
 *  label ยาว (เช่น EN "Converted to property") → เลื่อนได้ + เงาไล่สีขอบบอกว่ามีต่อ (edge-fade) แทน scrollbar — เนียนทุกภาษา/ทุกหน้า */
export function Segmented({ options, value, onChange }: {
  options: { value: string; label: string }[]; value: string; onChange: (v: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [edge, setEdge] = useState({ l: false, r: false });
  const update = useCallback(() => {
    const el = ref.current; if (!el) return;
    setEdge({ l: el.scrollLeft > 2, r: el.scrollLeft + el.clientWidth < el.scrollWidth - 2 });
  }, []);
  useEffect(() => {
    update();
    const el = ref.current;
    el?.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => { el?.removeEventListener('scroll', update); window.removeEventListener('resize', update); };
  }, [update, options.length]);
  // เลื่อน active เข้าจอเมื่อค่าเปลี่ยน (เฉพาะตอนหลุดขอบ — ไม่กวนถ้าเห็นอยู่แล้ว)
  useEffect(() => {
    const el = ref.current;
    const on = el?.querySelector<HTMLElement>('[data-on="true"]');
    if (!el || !on) return;
    const cr = el.getBoundingClientRect(), br = on.getBoundingClientRect();
    if (br.left < cr.left || br.right > cr.right) { el.scrollLeft += br.left - cr.left - 8; update(); }
  }, [value, update]);
  return (
    <div className="relative inline-block max-w-full">
      <div ref={ref}
        className="seg flex snap-x overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {options.map((o) => (
          <button key={o.value || 'all'} data-on={value === o.value} onClick={() => onChange(o.value)}
            className={`seg-item snap-start whitespace-nowrap ${value === o.value ? 'seg-item-on' : 'hover:text-ink'}`}>
            {o.label}
          </button>
        ))}
      </div>
      {edge.l && <span aria-hidden className="pointer-events-none absolute inset-y-0.5 left-0.5 w-6 rounded-l-md bg-gradient-to-r from-canvas to-transparent" />}
      {edge.r && <span aria-hidden className="pointer-events-none absolute inset-y-0.5 right-0.5 w-6 rounded-r-md bg-gradient-to-l from-canvas to-transparent" />}
    </div>
  );
}

// MR-38: ลบ FilterChips (dead export — ใช้ Segmented แทนทั้งหมด)

// ---------------------------------------------------------------------------
// FilterBar — แถบค้นหา+ตัวกรองมาตรฐานเดียวทั้งระบบ
//   ช่องค้นหาอยู่นอก (ใช้บ่อย) · ตัวกรอง+เรียงลำดับซ่อนหลังปุ่มเดียว
//   มือถือ: แผ่นเด้งจากล่าง · จอ ≥sm: ป็อปโอเวอร์ใต้ปุ่ม
//   ทุกตัวกรองแสดงเป็น dropdown รูปแบบเดียวกัน — เรียบ ไม่รก
// ---------------------------------------------------------------------------
export interface FilterDef {
  key: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  options?: { value: string; label: string }[]; // ไม่ต้องมีถ้า type='date'
  searchable?: boolean; // ลิสต์ยาว (เช่น จังหวัด) → พิมพ์ค้นหาได้
  type?: 'date';        // 'date' = ใช้ตัวเลือกวันที่ (native date picker) แทน dropdown
}

export interface RangeDef {
  label: string;
  lo: number; hi: number; min: number; max: number; step: number;
  display: string;       // ป้ายช่วงปัจจุบัน (เช่น "฿5,000 – ฿20,000")
  active: boolean;       // กำลังกรองอยู่ → นับ badge
  onChange: (lo: number, hi: number) => void;
  onClear: () => void;
}

// ช่วงราคาแบบ popover สำหรับแถบ inline (จอกว้าง) — ปุ่มเล็กในแถบ กดแล้วเด้งสไลเดอร์ ไม่บังลิสต์
function InlineRange({ range }: { range: RangeDef }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);
  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open}
        className={`field flex h-9 items-center gap-2 text-sm ${range.active ? 'border-gold text-gold-dark' : ''}`}>
        <span className="truncate">{range.active ? range.display : range.label}</span>
        <Icon name="chevron-down" size={16} className={`shrink-0 text-faint transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-[60] mt-1 w-72 rounded-xl2 border border-border bg-surface p-4 shadow-lift">
          <div className="mb-2 flex items-baseline justify-between">
            <span className="text-sm font-medium text-ink-soft">{range.label}</span>
            <span className="text-sm tabular-nums text-muted">{range.display}</span>
          </div>
          <PriceRange min={range.min} max={range.max} step={range.step} lo={range.lo} hi={range.hi} onChange={range.onChange} />
          {range.active && <button type="button" onClick={() => range.onClear()} className="mt-3 text-xs text-muted hover:text-ink">Clear price range</button>}
        </div>
      )}
    </div>
  );
}

export function FilterBar({ search, sort, filters = [], range, searchWide }: {
  search?: { value: string; onChange: (v: string) => void; placeholder?: string };
  sort?: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[] };
  filters?: FilterDef[];
  range?: RangeDef;       // ตัวกรองช่วงค่า (สไลเดอร์ 2 หัว) — ออปชัน ไม่ส่ง = ไม่มี
  searchWide?: boolean;   // หน้าที่ค้นหาเป็นพระเอก (ทรัพย์) → คอมปล่อยกว้างเต็ม (ไม่ cap 280)
}) {
  const [open, setOpen] = useState(false);

  // MR-24: debounce ช่องค้นหาลิสต์ → ยิง API ครั้งเดียวหลังหยุดพิมพ์ (ไม่ยิงทุกตัวอักษร)
  const [localSearch, setLocalSearch] = useState(search?.value ?? '');
  useEffect(() => { setLocalSearch(search?.value ?? ''); }, [search?.value]);
  const debouncedSearch = useDebouncedValue(localSearch, 350);
  useEffect(() => {
    if (search && debouncedSearch !== search.value) search.onChange(debouncedSearch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  const t = useTranslations();
  const defOf = (f: FilterDef) => f.options?.[0]?.value ?? ''; // date filter (ไม่มี options) → ค่าว่าง = ไม่กรอง
  const activeCount = filters.filter((f) => f.value !== defOf(f)).length + (range?.active ? 1 : 0);
  const clearAll = () => { filters.forEach((f) => f.onChange(defOf(f))); range?.onClear(); };
  const hasPanel = filters.length > 0 || !!sort || !!range;

  return (
    <div className="mt-4 flex flex-wrap items-center gap-2">
      {search && (
        <input className={`field min-w-0 flex-1 sm:max-w-[280px] ${searchWide ? 'lg:max-w-none' : ''}`} placeholder={search.placeholder ?? t('common.searchDots')}
          value={localSearch} onChange={(e) => setLocalSearch(e.target.value)} />
      )}

      {/* จอกว้าง (iPad-นอน/คอม ≥lg): ตัวกรอง inline ในแถบ — เห็นลิสต์อัปเดตสด ไม่ต้องเปิด modal (ตามหลัก desktop≠mobile) */}
      {hasPanel && (
        <div className="hidden items-center gap-2 lg:flex">
          {filters.map((f) => (
            f.type === 'date' ? (
              <input key={f.key} type="date" className="field h-9 w-auto text-sm" value={f.value} onChange={(e) => f.onChange(e.target.value)} />
            ) : (
              <div key={f.key} className="w-40">
                <Combobox label="" size="sm" searchable={f.searchable ?? false} value={f.value} onChange={f.onChange} options={f.options ?? []} placeholder={f.label} />
              </div>
            )
          ))}
          {range && <InlineRange range={range} />}
          {sort && (
            <div className="w-44">
              <Combobox label="" size="sm" searchable={false} value={sort.value} onChange={sort.onChange} options={sort.options} placeholder={t('common.sort')} />
            </div>
          )}
          {activeCount > 0 && (
            <button type="button" onClick={clearAll} className="btn-ghost btn-sm shrink-0 text-muted">{t('common.clear')} ({activeCount})</button>
          )}
        </div>
      )}

      {/* จอแคบ/สัมผัส (มือถือ/iPad-ตั้ง <lg): ปุ่ม → sheet โฟกัส (ไม่มีที่ inline) */}
      {hasPanel && (
        <div className="shrink-0 sm:ml-auto lg:hidden">
          <button type="button" onClick={() => setOpen(true)} aria-expanded={open}
            className={`btn-ghost btn-sm ${activeCount ? 'border-gold text-gold-dark' : ''}`}>
            <Icon name="menu" size={16} /> {t('common.filters')}
            {activeCount > 0 && (
              <span className="ml-1 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-gold px-1 text-2xs font-medium text-[#1c1b18]">{activeCount}</span>
            )}
          </button>
          {/* แผ่นตัวกรองลอยกลางจอ (Modal มาตรฐานเดียวกับฟอร์ม) — ไม่เด้งล่าง ไม่ล้น เหมือนกันทุกหมวด */}
          <Modal open={open} onClose={() => setOpen(false)} title={t('common.filters')}
            footer={
              <div className="flex items-center justify-between gap-2">
                <button type="button" onClick={clearAll} disabled={activeCount === 0}
                  className="text-sm text-muted enabled:hover:text-ink disabled:opacity-40">
                  {t('common.clearFilters')}{activeCount > 0 ? ` (${activeCount})` : ''}
                </button>
                <button type="button" className="btn-gold" onClick={() => setOpen(false)}>{t('common.done')}</button>
              </div>
            }>
            <div className="space-y-4">
              {range && (
                <div>
                  <div className="mb-2 flex items-baseline justify-between">
                    <span className="text-sm font-medium text-ink-soft">{range.label}</span>
                    <span className="text-sm tabular-nums text-muted">{range.display}</span>
                  </div>
                  <PriceRange min={range.min} max={range.max} step={range.step} lo={range.lo} hi={range.hi} onChange={range.onChange} />
                </div>
              )}
              {filters.map((f) => (
                f.type === 'date' ? (
                  <label key={f.key} className="block">
                    <span className="mb-1.5 block text-sm font-medium text-ink-soft">{f.label}</span>
                    <input type="date" className="field" value={f.value} onChange={(e) => f.onChange(e.target.value)} />
                  </label>
                ) : (
                  <Combobox key={f.key} label={f.label} value={f.value} onChange={f.onChange}
                    options={f.options ?? []} searchable={f.searchable ?? false} />
                )
              ))}
              {sort && (
                <Combobox label={t('common.sort')} searchable={false} value={sort.value} onChange={sort.onChange} options={sort.options} />
              )}
            </div>
          </Modal>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ListView — รายการ responsive: ตารางบนจอใหญ่ / การ์ดบนมือถือ (อัตโนมัติ)
//   คอลัมน์ที่ flag primary/sub/right จะปรากฏบนการ์ดมือถือ
//   คอลัมน์ปกติจะแสดงเฉพาะตาราง desktop
// ---------------------------------------------------------------------------
export interface Col<T> {
  header: string;
  cell: (it: T) => React.ReactNode;
  primary?: boolean; // มือถือ: หัวการ์ด (ตัวหนา)
  sub?: boolean;     // มือถือ: บรรทัดรอง (เล็ก/จาง)
  right?: boolean;   // desktop ชิดขวา + มือถือไปอยู่มุมขวาบน
  width?: string;    // desktop: คุมความกว้างคอลัมน์ (เช่น 'w-48') → คอลัมน์ยาวตัด "…" พอดี ไม่ถ่าง
  grow?: boolean;    // desktop: คอลัมน์ "ดูดพื้นที่เหลือ" เพียงตัวเดียว (default = primary) — กัน 2 คอลัมน์ flex แย่งกันจนห่าง/ตกกรอบ
  twoLine?: boolean; // primary 2 บรรทัด (เช่น ลูกค้า/ทรัพย์ ซ้อน · minimal template) → grow col ไม่ truncate · การ์ดไม่ห่อ truncate
}

export function ListView<T>({
  items, cols, keyOf, onRow, loading, empty, emptyIcon, emptyAction, leading,
}: {
  items: T[];
  cols: Col<T>[];
  keyOf: (it: T) => string;
  onRow?: (it: T) => void;
  loading?: boolean;
  empty?: string;
  emptyIcon?: IconName;
  emptyAction?: React.ReactNode; // ปุ่มชวนทำต่อตอนว่าง (เช่น "เพิ่ม…" เมื่อยังไม่มีข้อมูล / "ล้างตัวกรอง" เมื่อกรองแล้วไม่เจอ)
  leading?: (it: T) => React.ReactNode; // ภาพ/ไอคอนนำหน้า — จัดให้ข้อความ (หัว+รอง) เรียงขอบเดียวกันถัดจากภาพ
}) {
  const t = useTranslations();
  // โหลดครั้งแรก (ยังไม่มีข้อมูล) → skeleton เต็มหน้า (PAGE_SIZE แถว) เพื่อสำรองความสูง = หน้าจริง
  if (loading && items.length === 0) return <ListSkeleton rows={PAGE_SIZE} />;
  if (!loading && items.length === 0) return <EmptyState text={empty ?? t('common.noData')} icon={emptyIcon} action={emptyAction} />;

  const primary = cols.find((c) => c.primary);
  const subs = cols.filter((c) => c.sub);
  const rights = cols.filter((c) => c.right);
  // owner: ช่องไฟเฉลี่ยเท่ากันทุกหน้า — เลิก "คอลัมน์เดียวยืดกินที่เหลือ" (เดิม gap กระจุกหลังชื่อ, ต่างกันทุก list)
  //   → ไม่มีคอลัมน์ยืด · primary cap+truncate · table w-full auto = กระจายช่องไฟเต็มกว้าง สม่ำเสมอ

  // เปลี่ยนหน้า: คงแถวเดิมไว้ (จางลง) จนข้อมูลใหม่มา → ความสูงไม่หด/กระโดด → ปุ่มลูกศรอยู่จุดเดิม
  return (
    <div className={loading ? 'pointer-events-none opacity-50 transition-opacity duration-150' : 'transition-opacity duration-150'}>
      {/* เดสก์ท็อป: grid เดียว + subgrid ต่อแถว + justify-between →
          คอลัมน์กว้างตามเนื้อหา (ยาว=กว้าง) · ช่องไฟระหว่างคอลัมน์เท่ากันทุกช่อง · เต็มความกว้าง (คอลัมน์แรกชิดซ้าย/ท้ายสุดชิดขวา) · เหมือนกันทุกหน้า
          leading (รูป) = อยู่ในเซลล์ primary (รูปติดรหัส/ชื่อ เป็นชุดเดียว) ไม่ใช่คอลัมน์แยก → space-between ไม่ดันรูปออกห่าง */}
      <div className="hidden overflow-x-auto mouse:block">
        <div className="grid px-5"
          style={{ gridTemplateColumns: `repeat(${cols.length}, minmax(0, max-content))`, justifyContent: 'space-between', columnGap: '1.5rem' }}>
          {/* หัวตาราง */}
          <div className="col-span-full grid grid-cols-subgrid items-end border-b border-border text-xs uppercase tracking-wide text-muted">
            {cols.map((c, i) => (
              <div key={i} className={`whitespace-nowrap py-3 font-medium ${c.right ? 'text-center' : ''}`}>{c.header}</div>
            ))}
          </div>
          {/* แถว */}
          {items.map((it) => (
            <div key={keyOf(it)}
              className={`col-span-full grid grid-cols-subgrid items-center border-b border-border text-sm last:border-0 ${onRow ? 'cursor-pointer transition hover:bg-raised' : ''}`}
              onClick={onRow ? () => onRow(it) : undefined}>
              {cols.map((c, i) => (
                // primary = cap 22rem + ตัด … (รูปพ่วงหน้าถ้ามี leading) · right = กึ่งกลาง · อื่น = nowrap · min-w-0 ให้ตัดได้
                <div key={i} className={`min-w-0 py-3.5 ${c.right ? 'text-center' : c === primary ? `max-w-[22rem]${c.twoLine ? '' : ' truncate'}` : 'whitespace-nowrap'}`}>
                  {c === primary && leading
                    ? <span className="flex items-center gap-3"><span className="shrink-0">{leading(it)}</span><span className="min-w-0 flex-1">{c.cell(it)}</span></span>
                    : c.cell(it)}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* สัมผัส (มือถือ/แท็บเล็ต): การ์ด — กริด 1 คอลัมน์ (มือถือ) → 2 คอลัมน์ (จอกว้าง/ไอแพด)
          ใช้พื้นที่คุ้ม ไม่ยืด UI มือถือ · การ์ดยืนเดี่ยว (page wrapper เป็น card เฉพาะ mouse → ไม่ซ้อน card) */}
      <ul className="grid grid-cols-1 gap-3 p-3 sm:grid-cols-2 sm:gap-3.5 sm:p-4 lg:grid-cols-3 mouse:hidden">
        {items.map((it) => (
          <li key={keyOf(it)}
            className={`card flex items-start gap-3 p-4 ${onRow ? 'cursor-pointer transition duration-200 ease-standard hover:border-gold/40 hover:bg-raised active:scale-[0.99]' : ''}`}
            onClick={onRow ? () => onRow(it) : undefined}>
            {leading && <div className="shrink-0">{leading(it)}</div>}
            <div className="min-w-0 flex-1">
              {primary && <div className={primary.twoLine ? 'min-w-0' : 'truncate font-medium'}>{primary.cell(it)}</div>}
              {subs.map((c, i) => (
                <div key={i} className="truncate text-xs text-muted">{c.cell(it)}</div>
              ))}
            </div>
            {rights.length > 0 && (
              <div className="flex shrink-0 flex-col items-end gap-1 text-right text-sm">
                {rights.map((c, i) => <div key={i}>{c.cell(it)}</div>)}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
