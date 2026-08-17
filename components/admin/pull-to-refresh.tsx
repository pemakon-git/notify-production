'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Spinner } from './ui';

const THRESHOLD = 70;

/**
 * ดึงหน้าจอลง (มือถือ/แท็บเล็ต) เพื่อรีเฟรช — ยิง event 'app:refresh' ให้ useList โหลดใหม่
 * เดสก์ท็อป (เมาส์) ไม่ทำงาน + ตัวบ่งชี้ซ่อน (lg:hidden)
 */
export default function PullToRefresh({ children }: { children: React.ReactNode }) {
  const t = useTranslations("shell");
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef<number | null>(null);

  useEffect(() => {
    const prev = document.body.style.overscrollBehaviorY;
    document.body.style.overscrollBehaviorY = 'contain';
    return () => { document.body.style.overscrollBehaviorY = prev; };
  }, []);

  function onTouchStart(e: React.TouchEvent) {
    startY.current = window.scrollY <= 0 && !refreshing ? (e.touches[0]?.clientY ?? null) : null;
  }
  function onTouchMove(e: React.TouchEvent) {
    if (startY.current === null) return;
    const touch = e.touches[0];
    if (!touch) return;
    const dy = touch.clientY - startY.current;
    if (dy > 0 && window.scrollY <= 0) setPull(Math.min(dy * 0.5, THRESHOLD + 24));
    else setPull(0);
  }
  function onTouchEnd() {
    if (startY.current === null) return;
    const reached = pull >= THRESHOLD;
    startY.current = null;
    if (reached) {
      setRefreshing(true);
      setPull(THRESHOLD);
      window.dispatchEvent(new Event('app:refresh'));
      setTimeout(() => { setRefreshing(false); setPull(0); }, 900);
    } else {
      setPull(0);
    }
  }

  return (
    <div onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
      <div className="flex items-center justify-center overflow-hidden text-muted transition-[height] duration-200 lg:hidden"
        style={{ height: refreshing ? 44 : pull }}>
        {refreshing ? (
          <Spinner className="h-5 w-5 text-gold-dark" />
        ) : pull > 0 ? (
          <span className="text-xs" style={{ opacity: Math.min(1, pull / THRESHOLD) }}>
            {pull >= THRESHOLD ? t('releaseToRefresh') : t('pullToRefresh')}
          </span>
        ) : null}
      </div>
      {children}
    </div>
  );
}
