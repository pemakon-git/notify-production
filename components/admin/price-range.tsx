'use client';

import { useEffect, useRef } from 'react';

/**
 * สไลเดอร์ช่วงราคาแบบ 2 หัว — ลากต่อเนื่องลื่น ไม่หลุด (พอร์ตจาก web-public)
 * วิธี: ตอน pointerdown ผูก pointermove/up ที่ `window` ครั้งเดียว (handler ตัวเดิมตลอดการลาก)
 * ค่าล่าสุดอ่านผ่าน ref (กัน closure ค้าง) · หัวเป็น JSX inline (DOM เสถียร) · touch + คีย์บอร์ดได้
 */
export default function PriceRange({
  min, max, step, lo, hi, onChange,
}: {
  min: number; max: number; step: number; lo: number; hi: number;
  onChange: (lo: number, hi: number) => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const latest = useRef({ lo, hi, onChange, min, max, step });
  latest.current = { lo, hi, onChange, min, max, step };
  const cleanup = useRef<(() => void) | null>(null);

  const pct = (v: number) => ((v - min) / (max - min)) * 100;

  function valueAt(clientX: number): number {
    const el = trackRef.current;
    const { min, max, step } = latest.current;
    if (!el) return min;
    const rect = el.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    return Math.round((min + ratio * (max - min)) / step) * step;
  }

  function apply(which: 'lo' | 'hi', v: number) {
    const s = latest.current;
    if (which === 'lo') s.onChange(Math.min(v, s.hi - s.step), s.hi);
    else s.onChange(s.lo, Math.max(v, s.lo + s.step));
  }

  const startDrag = (which: 'lo' | 'hi') => (e: React.PointerEvent) => {
    e.preventDefault();
    const move = (ev: PointerEvent) => { ev.preventDefault(); apply(which, valueAt(ev.clientX)); };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      cleanup.current = null;
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    cleanup.current = up;
  };

  useEffect(() => () => cleanup.current?.(), []);

  function onTrackDown(e: React.PointerEvent<HTMLDivElement>) {
    if ((e.target as HTMLElement).dataset.thumb) return;
    const v = valueAt(e.clientX);
    const s = latest.current;
    apply(Math.abs(v - s.lo) <= Math.abs(v - s.hi) ? 'lo' : 'hi', v);
  }

  const onKey = (which: 'lo' | 'hi') => (e: React.KeyboardEvent) => {
    const d = (e.key === 'ArrowLeft' || e.key === 'ArrowDown') ? -step
      : (e.key === 'ArrowRight' || e.key === 'ArrowUp') ? step : 0;
    if (!d) return;
    e.preventDefault();
    apply(which, (which === 'lo' ? lo : hi) + d);
  };

  const thumbCls = 'absolute top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 cursor-grab touch-none rounded-full border-2 border-gold bg-surface shadow-[0_1px_4px_rgba(0,0,0,0.25)] outline-none transition-transform focus-visible:ring-2 focus-visible:ring-gold/40 active:cursor-grabbing active:scale-110';

  return (
    <div ref={trackRef} className="relative h-6 cursor-pointer touch-none select-none" onPointerDown={onTrackDown}>
      <div className="pointer-events-none absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-border" />
      <div
        className="pointer-events-none absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-gold"
        style={{ left: `${pct(lo)}%`, right: `${100 - pct(hi)}%` }}
      />
      <div
        data-thumb="lo" role="slider" tabIndex={0}
        aria-valuemin={min} aria-valuemax={max} aria-valuenow={lo} aria-label="ค่าเช่าต่ำสุด"
        onPointerDown={startDrag('lo')} onKeyDown={onKey('lo')}
        className={thumbCls} style={{ left: `${pct(lo)}%`, zIndex: 4 }}
      />
      <div
        data-thumb="hi" role="slider" tabIndex={0}
        aria-valuemin={min} aria-valuemax={max} aria-valuenow={hi} aria-label="ค่าเช่าสูงสุด"
        onPointerDown={startDrag('hi')} onKeyDown={onKey('hi')}
        className={thumbCls} style={{ left: `${pct(hi)}%`, zIndex: 3 }}
      />
    </div>
  );
}
