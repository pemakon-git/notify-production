'use client';

import { useCallback, useEffect, useState } from 'react';
import type { ApiList, ApiListMeta } from '@/lib/types';
import { apiFetch } from '@/lib/api-client';

/**
 * โหลด list พร้อม pagination/filter — ใช้ซ้ำทุกโมดูล (พอร์ตจาก lib/useList.ts ของระบบเดิม)
 *
 * ต่างจากของเดิมตรงเดียว: เรียกผ่าน `apiFetch` (same-origin cookie) แทน `useAuth().api`
 * เพราะรวมเป็นแอปเดียวแล้ว ไม่ต้องแนบ token เอง
 *
 * - `pollMs > 0` → รีเฟรชเงียบๆ ตามรอบ (near-realtime ไม่กระพริบ skeleton)
 * - ฟัง event `app:refresh` → รองรับ pull-to-refresh บนมือถือ
 * - `mutate` → แก้แถวในเครื่องทันที (optimistic) แล้วค่อย `reload()` sync ความจริงทีหลัง
 */
export interface UseListResult<T> {
  rows: T[];
  meta: ApiListMeta | Record<string, never>;
  loading: boolean;
  error: string;
  reload: () => void;
  mutate: (fn: (rows: T[]) => T[]) => void;
}

export function useList<T>(path: string, opts?: { pollMs?: number }): UseListResult<T> {
  const [rows, setRows] = useState<T[]>([]);
  const [meta, setMeta] = useState<ApiListMeta | Record<string, never>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchOnce = useCallback(
    async (silent?: boolean) => {
      if (!silent) setLoading(true);
      setError('');

      try {
        const result = await apiFetch<ApiList<T>>(path);
        setRows(result.data ?? []);
        setMeta(result.meta ?? {});
      } catch (caught) {
        // โหลดเงียบล้มเหลว = ไม่รบกวนผู้ใช้ (ข้อมูลเดิมยังอยู่บนจอ)
        if (!silent) setError(caught instanceof Error ? caught.message : 'โหลดข้อมูลไม่สำเร็จ');
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [path],
  );

  const reload = useCallback(() => void fetchOnce(false), [fetchOnce]);
  const mutate = useCallback((fn: (current: T[]) => T[]) => setRows((current) => fn(current)), []);

  useEffect(() => {
    void fetchOnce(false);
  }, [fetchOnce]);

  useEffect(() => {
    const ms = opts?.pollMs;
    if (!ms) return;

    const id = setInterval(() => void fetchOnce(true), ms);
    return () => clearInterval(id);
  }, [fetchOnce, opts?.pollMs]);

  useEffect(() => {
    const handler = () => reload();
    window.addEventListener('app:refresh', handler);
    return () => window.removeEventListener('app:refresh', handler);
  }, [reload]);

  return { rows, meta, loading, error, reload, mutate };
}
