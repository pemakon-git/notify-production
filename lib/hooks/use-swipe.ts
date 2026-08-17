'use client';

import { useRef } from 'react';

/**
 * ปัดนิ้วซ้าย/ขวา → onSwipe(dir): 1 = ปัดซ้าย (รูปถัดไป), -1 = ปัดขวา (รูปก่อนหน้า)
 * ใช้คู่กับ className `touch-pan-y` บน element เพื่อให้เบราว์เซอร์ไม่กิน gesture แนวนอน
 * (ปัดแนวตั้งยังเลื่อนหน้าได้ปกติ; กรองให้ทำงานเฉพาะปัดแนวนอนชัดเจน)
 */
export function useSwipe(onSwipe: (dir: number) => void, threshold = 40) {
  const start = useRef<{ x: number; y: number } | null>(null);

  return {
    onTouchStart: (e: React.TouchEvent) => {
      const t = e.touches[0];
      if (!t) return;
      start.current = { x: t.clientX, y: t.clientY };
    },
    onTouchEnd: (e: React.TouchEvent) => {
      if (!start.current) return;
      const t = e.changedTouches[0];
      if (!t) return;
      const dx = t.clientX - start.current.x;
      const dy = t.clientY - start.current.y;
      start.current = null;
      if (Math.abs(dx) > threshold && Math.abs(dx) > Math.abs(dy) * 1.2) {
        onSwipe(dx < 0 ? 1 : -1);
      }
    },
  };
}
