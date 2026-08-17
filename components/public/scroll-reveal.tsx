'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

// ScrollReveal — appear-on-scroll แบบ Framer · auto-detect target (ไม่ต้องแก้ markup ทุกหน้า)
// ใส่ .reveal เฉพาะ element ใต้ fold (กัน FOUC) แล้ว observe → .reveal-in เมื่อเข้า viewport
// mount ครั้งเดียวใน layout · re-scan ตอนเปลี่ยนหน้า · reduced-motion จัดการที่ CSS
export function ScrollReveal() {
  const pathname = usePathname();
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const main = document.querySelector('main');
    if (!main) return;

    // เก็บ target = section ระดับบน + (หน้าที่ห่อด้วย div เดียว) ลูกตรงของ div นั้น
    const targets: HTMLElement[] = [];
    main.querySelectorAll<HTMLElement>(':scope > section').forEach((el) => targets.push(el));
    main.querySelectorAll<HTMLElement>(':scope > div').forEach((div) => {
      div.querySelectorAll<HTMLElement>(':scope > *').forEach((el) => {
        if (!(el instanceof HTMLElement)) return;
        if (el.offsetHeight > 0) targets.push(el);
      });
    });
    if (targets.length === 0) return;

    const vh = window.innerHeight;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add('reveal-in');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -8% 0px' });

    targets.forEach((el) => {
      // above/near fold → ปล่อยโชว์ปกติ (กัน flash) · ใต้ fold → hide + observe
      if (el.getBoundingClientRect().top < vh * 0.85) return;
      el.classList.add('reveal');
      io.observe(el);
    });
    return () => io.disconnect();
  }, [pathname]);

  return null;
}
