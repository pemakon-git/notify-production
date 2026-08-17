'use client';

import { useEffect, useState } from 'react';

/** คืนค่า value ที่หน่วงเวลา (debounce) — ใช้ลดการยิง API ทุกตัวอักษร (MR-24) */
export function useDebouncedValue<T>(value: T, delayMs = 350): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);
  return debounced;
}
