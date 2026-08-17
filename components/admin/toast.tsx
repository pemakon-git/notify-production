'use client';

import { createContext, useCallback, useContext, useState } from 'react';
import { Icon } from '@/components/admin/icon';

type ToastType = 'success' | 'error' | 'info';
interface ToastItem { id: number; type: ToastType; msg: string }

interface ToastApi {
  success: (msg: string) => void;
  error: (msg: string) => void;
  info: (msg: string) => void;
}

const ToastCtx = createContext<ToastApi | null>(null);

/** แจ้งผลทุก action (กดแล้วต้องเห็นว่าเกิดอะไรขึ้น) — แสดงล่างจอ หายเองใน 3 วิ */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const show = useCallback((type: ToastType, msg: string) => {
    const id = Date.now() + Math.random();
    // dedupe: ข้อความ+ชนิดเดียวกันยัง active อยู่ → ไม่ซ้อนใบใหม่ (แก้ toast แดง ×3 ตอน error ยิงซ้ำ)
    setItems((cur) => (cur.some((x) => x.type === type && x.msg === msg) ? cur : [...cur, { id, type, msg }]));
    // ตั้ง timer เสมอ — ถ้าถูก dedupe (id ไม่อยู่ในลิสต์) filter จะเป็น no-op ปลอดภัย
    setTimeout(() => setItems((cur) => cur.filter((x) => x.id !== id)), 3200);
  }, []);

  const api: ToastApi = {
    success: (m) => show('success', m),
    error: (m) => show('error', m),
    info: (m) => show('info', m),
  };

  return (
    <ToastCtx.Provider value={api}>
      {children}
      {/* a11y: ประกาศ toast ให้ screen reader (WCAG 4.1.3) — polite = ไม่ตัดคำพูดที่กำลังอ่าน */}
      <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-5 z-[70] flex flex-col items-center gap-2 px-4">
        {/* v2 (สไตล์แอพ Claude): การ์ดดาร์ก + กรอบสีตามชนิด + ไอคอนสี — สงบ อ่านง่าย ไม่แสบตา */}
        {items.map((t) => (
          <div key={t.id}
            className={`pointer-events-auto flex max-w-sm items-center gap-2.5 rounded-xl2 border bg-surface px-4 py-3 text-sm font-medium text-ink shadow-lift ${
              t.type === 'error' ? 'border-danger/50'
              : t.type === 'success' ? 'border-success/50'
              : 'border-border'
            }`}>
            <Icon name={t.type === 'error' ? 'alert-triangle' : t.type === 'success' ? 'check' : 'info'} size={16}
              className={`shrink-0 ${t.type === 'error' ? 'text-danger' : t.type === 'success' ? 'text-success' : 'text-muted'}`} />
            <span>{t.msg}</span>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

/** ใช้ในหน้า: const toast = useToast(); toast.success('บันทึกแล้ว') */
export function useToast(): ToastApi {
  const ctx = useContext(ToastCtx);
  // fallback กัน error ถ้าเรียกนอก provider (เช่น storybook)
  return ctx ?? { success: () => {}, error: () => {}, info: () => {} };
}
