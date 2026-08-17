'use client';

import type { SVGProps } from 'react';

/**
 * ชุดไอคอนเดียวของระบบ — outline, stroke เท่ากันทุกตัว (1.75), currentColor
 * อิงหลัก "Consistency" (เทคนิค UX/UI น.75) + ไอคอนเรียบ-คุ้นเคย (น.42)
 * ใช้แทนสัญลักษณ์/อิโมจิที่เคยปนกัน (◧ ◔ ☰ × ▾ ✓ 📄 ⚠️ ฯลฯ)
 */
const ICONS = {
  home: (<><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V20a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9.5" /><path d="M9.5 21v-5.5h5V21" /></>),
  'user-plus': (<><circle cx="9" cy="8" r="3.5" /><path d="M4 20v-1a5 5 0 0 1 5-5h1.5" /><path d="M18 9v6" /><path d="M15 12h6" /></>),
  users: (<><circle cx="9" cy="8" r="3.5" /><path d="M3.5 20v-1.5A4.5 4.5 0 0 1 8 14h2a4.5 4.5 0 0 1 4.5 4.5V20" /><path d="M16 4.8a3.5 3.5 0 0 1 0 6.4" /><path d="M20.5 20v-1.5a4.5 4.5 0 0 0-3-4.2" /></>),
  user: (<><circle cx="12" cy="8" r="3.75" /><path d="M5 20v-1a6 6 0 0 1 14 0v1" /></>),
  calendar: (<><rect x="3.5" y="5" width="17" height="15.5" rx="2" /><path d="M3.5 9.5h17" /><path d="M8 3.5v3" /><path d="M16 3.5v3" /></>),
  clock: (<><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></>),
  building: (<><rect x="5" y="3" width="14" height="18" rx="1.5" /><path d="M3.5 21h17" /><path d="M9 7.5h1.5" /><path d="M13.5 7.5h1.5" /><path d="M9 11h1.5" /><path d="M13.5 11h1.5" /><path d="M10.5 21v-3h3v3" /></>),
  key: (<><circle cx="8" cy="15.5" r="3.5" /><path d="M10.5 13 20 3.5" /><path d="M16.5 7l2.5 2.5" /><path d="M18.5 5l2 2" /></>),
  'file-text': (<><path d="M14 3H7a1.5 1.5 0 0 0-1.5 1.5v15A1.5 1.5 0 0 0 7 21h10a1.5 1.5 0 0 0 1.5-1.5V7.5z" /><path d="M14 3v4.5h4.5" /><path d="M9 13h6" /><path d="M9 16.5h6" /><path d="M9 9.5h2" /></>),
  image: (<><rect x="3.5" y="3.5" width="17" height="17" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M20 14.5 15.5 10 5 20.5" /></>),
  inbox: (<><rect x="4" y="4.5" width="16" height="15" rx="2" /><path d="M4 13.5h4l1.5 2.5h5l1.5-2.5h4" /></>),
  menu: (<><path d="M4 7h16" /><path d="M4 12h16" /><path d="M4 17h16" /></>),
  x: (<><path d="M6 6 18 18" /><path d="M18 6 6 18" /></>),
  'chevron-down': (<path d="M6 9.5 12 15.5 18 9.5" />),
  'chevron-left': (<path d="M14.5 18 8.5 12 14.5 6" />),
  'chevron-right': (<path d="M9.5 6 15.5 12 9.5 18" />),
  'arrow-left': (<><path d="M19 12H5" /><path d="M11 6 5 12 11 18" /></>),
  'arrow-right': (<><path d="M5 12h14" /><path d="M13 6 19 12 13 18" /></>),
  check: (<path d="M5 12.5 9.5 17 19 7" />),
  plus: (<><path d="M12 5v14" /><path d="M5 12h14" /></>),
  bell: (<><path d="M6 9a6 6 0 0 1 12 0c0 6 2.5 7.5 2.5 7.5H3.5S6 15 6 9Z" /><path d="M10.4 20a1.8 1.8 0 0 0 3.2 0" /></>),
  star: (<><path d="M12 3.5l2.6 5.27 5.82.85-4.21 4.1.99 5.79L12 16.77l-5.2 2.74.99-5.79-4.21-4.1 5.82-.85z" /></>),
  search: (<><circle cx="10.5" cy="10.5" r="6.5" /><path d="M20 20 15.5 15.5" /></>),
  'alert-triangle': (<><path d="M12 3.5 21.5 20H2.5L12 3.5Z" /><path d="M12 10v4" /><path d="M12 17.5h.01" /></>),
  info: (<><circle cx="12" cy="12" r="8.5" /><path d="M12 11v5" /><path d="M12 8h.01" /></>),
  phone: (<path d="M6.5 4h3l1.5 4-2 1.5a11 11 0 0 0 5 5l1.5-2 4 1.5v3a1.6 1.6 0 0 1-1.7 1.6A14.5 14.5 0 0 1 5 6.2 1.6 1.6 0 0 1 6.5 4Z" />),
  moon: (<path d="M20.5 13.2A8 8 0 1 1 10.8 3.5a6.3 6.3 0 0 0 9.7 9.7Z" />),
  sun: (<><circle cx="12" cy="12" r="4" /><path d="M12 2v2.5" /><path d="M12 19.5V22" /><path d="M4.2 4.2l1.8 1.8" /><path d="M18 18l1.8 1.8" /><path d="M2 12h2.5" /><path d="M19.5 12H22" /><path d="M4.2 19.8l1.8-1.8" /><path d="M18 6l1.8-1.8" /></>),
  'more-horizontal': (<><circle cx="5" cy="12" r="1.4" /><circle cx="12" cy="12" r="1.4" /><circle cx="19" cy="12" r="1.4" /></>),
  pencil: (<><path d="M4 20h4l10.5-10.5a2 2 0 0 0-2.83-2.83L5 17v3Z" /><path d="M13.5 6.5 17.5 10.5" /></>),
  trash: (<><path d="M4 7h16" /><path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /><path d="M6 7l1 12.5a1.5 1.5 0 0 0 1.5 1.5h7a1.5 1.5 0 0 0 1.5-1.5L18.5 7" /><path d="M10 11v6" /><path d="M14 11v6" /></>),
  // spec icons (ห้อง/พื้นที่) — ชุดเดียวกับ web-public (bed/bath/area/floor) + sofa (เฟอร์นิเจอร์)
  bed: (<><path d="M3 8v11" /><path d="M3 13h16a2 2 0 0 1 2 2v4" /><path d="M3 17h18" /><path d="M6.5 13v-2a1.5 1.5 0 0 1 1.5-1.5h6a1.5 1.5 0 0 1 1.5 1.5v2" /></>),
  bath: (<><path d="M4 12V6.5A1.5 1.5 0 0 1 5.5 5h.5" /><path d="M6 5v3" /><path d="M2.5 12h19v3a4 4 0 0 1-4 4H6.5a4 4 0 0 1-4-4z" /><path d="M7 19l-1.5 2" /><path d="M17 19l1.5 2" /></>),
  area: (<><path d="M8 3H5a2 2 0 0 0-2 2v3" /><path d="M21 8V5a2 2 0 0 0-2-2h-3" /><path d="M3 16v3a2 2 0 0 0 2 2h3" /><path d="M16 21h3a2 2 0 0 0 2-2v-3" /></>),
  floor: (<><path d="M12 3 3 7.5 12 12l9-4.5L12 3Z" /><path d="M3 12l9 4.5L21 12" /><path d="M3 16.5 12 21l9-4.5" /></>),
  sofa: (<><rect x="3" y="10" width="18" height="7" rx="2" /><path d="M6 10V8a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v2" /><path d="M6 17v2" /><path d="M18 17v2" /></>),
  globe: (<><circle cx="12" cy="12" r="8.5" /><path d="M3.5 12h17" /><path d="M12 3.5c2.5 2.3 3.8 5.3 3.8 8.5S14.5 18.2 12 20.5c-2.5-2.3-3.8-5.3-3.8-8.5S9.5 5.8 12 3.5Z" /></>),
} as const;

export type IconName = keyof typeof ICONS;

export function Icon({ name, size = 18, className, ...rest }: { name: IconName; size?: number } & SVGProps<SVGSVGElement>) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden
      className={className} {...rest}>
      {ICONS[name]}
    </svg>
  );
}
