'use client';

import { useEffect, useRef, type RefObject } from 'react';

/**
 * a11y dialog มาตรฐาน — ใช้กับ overlay ที่เป็นกล่องโต้ตอบ (Modal / drawer / lightbox)
 *  • Esc → เรียก onEscape (ปิด)
 *  • focus trap: Tab/Shift+Tab วนอยู่ใน container ไม่หลุดไปหลังฉาก
 *  • โฟกัสเริ่มที่ "container" (ไม่ใช่ช่องกรอก) → มือถือไม่เด้งคีย์บอร์ดตอนเปิด
 *  • คืนโฟกัสให้ element ที่โฟกัสอยู่ก่อนเปิด เมื่อปิด (คีย์บอร์ดไม่หลง)
 * container ต้องมี tabIndex={-1} จึงจะรับโฟกัสได้
 */
export function useFocusTrap(active: boolean, ref: RefObject<HTMLElement | null>, onEscape?: () => void) {
  // เก็บ onEscape ใน ref → ส่ง inline function ได้โดยไม่ทำให้ effect รันใหม่ทุก render (กันโฟกัสเด้ง)
  const escRef = useRef(onEscape);
  escRef.current = onEscape;
  useEffect(() => {
    if (!active) return;
    const prevActive = document.activeElement as HTMLElement | null;
    const el = ref.current;
    el?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { escRef.current?.(); return; }
      if (e.key !== 'Tab' || !el) return;
      const nodes = Array.from(el.querySelectorAll<HTMLElement>(
        'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])',
      )).filter((n) => n.getClientRects().length > 0); // เฉพาะที่มองเห็น (รวม fixed)
      if (nodes.length === 0) { e.preventDefault(); el.focus(); return; }
      const first = nodes[0]!, last = nodes[nodes.length - 1]!, a = document.activeElement;
      if (e.shiftKey && (a === first || a === el)) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && a === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('keydown', onKey); prevActive?.focus?.(); };
  }, [active, ref]);
}
