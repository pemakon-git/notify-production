import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'ทรัพย์ให้เช่า',
    template: '%s — ทรัพย์ให้เช่า',
  },
  description: 'ค้นหาคอนโด บ้าน ทาวน์โฮม และอพาร์ตเมนต์ให้เช่า',
};

/**
 * root layout ของทั้งแอป — เก็บแค่ <html>/<body> และ font
 * เนื้อหาที่ต่างกันระหว่างฝั่งลูกค้า/พนักงานอยู่ใน layout ของแต่ละ route group
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="th">
      <body className="min-h-dvh bg-white text-slate-900 antialiased">{children}</body>
    </html>
  );
}
