'use client';

import { useEffect } from 'react';

/**
 * ล็อกการเลื่อนพื้นหลังแบบ "กันได้จริงบน iOS" (position:fixed technique) + ref-count
 * — iOS Safari ไม่สน `overflow:hidden` บน body → พื้นหลังยัง pan/ลากได้ใต้ overlay
 * — ref-count: overlay ซ้อนกันได้ (ล็อกจริงเฉพาะตัวแรก คืนเฉพาะตัวสุดท้าย) → ปิดลำดับไหนก็ไม่ leak
 * ใช้กับ overlay ที่ครอบเต็มจอ (Modal / Lightbox / drawer / แผ่นเด้งมือถือ)
 */
let lockCount = 0;
let saved: { scrollY: number; position: string; top: string; left: string; right: string; width: string; overflow: string; paddingRight: string } | null = null;

function lock() {
  if (lockCount === 0) {
    const body = document.body;
    const scrollY = window.scrollY;
    saved = {
      scrollY,
      position: body.style.position, top: body.style.top, left: body.style.left,
      right: body.style.right, width: body.style.width,
      overflow: body.style.overflow, paddingRight: body.style.paddingRight,
    };
    const sbw = window.innerWidth - document.documentElement.clientWidth; // ชดเชย scrollbar (เดสก์ท็อป)
    body.style.position = 'fixed';
    body.style.top = `-${scrollY}px`;
    body.style.left = '0';
    body.style.right = '0';
    body.style.width = '100%';
    body.style.overflow = 'hidden';
    if (sbw > 0) body.style.paddingRight = `${sbw}px`;
  }
  lockCount += 1;
}

function unlock() {
  lockCount = Math.max(0, lockCount - 1);
  if (lockCount === 0 && saved) {
    const body = document.body;
    body.style.position = saved.position; body.style.top = saved.top; body.style.left = saved.left;
    body.style.right = saved.right; body.style.width = saved.width;
    body.style.overflow = saved.overflow; body.style.paddingRight = saved.paddingRight;
    window.scrollTo(0, saved.scrollY); // คืนตำแหน่งเดิม (การตรึง body ทำให้ scroll ไปบนสุด)
    saved = null;
  }
}

export function useScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    lock();
    return unlock;
  }, [active]);
}
