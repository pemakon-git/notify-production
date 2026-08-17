import type { Metadata, Viewport } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale } from 'next-intl/server';
import { IBM_Plex_Sans_Thai, Inter, Manrope } from 'next/font/google';
import type { ReactNode } from 'react';
import './globals.css';

/**
 * ฟอนต์ตาม DESIGN-SYSTEM.md §1 — โหลดผ่าน next/font (self-host ไม่เรียก CDN ตอน runtime)
 * weight เฉพาะที่ระบบใช้: 400 regular · 500 medium · 600 semibold
 */
const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-inter',
  display: 'swap',
});

const manrope = Manrope({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-manrope',
  display: 'swap',
});

/** ไทยทั้งสองฝั่งใช้ตัวนี้ (per-glyph fallback ต่อจาก Inter/Manrope) */
const plexThai = IBM_Plex_Sans_Thai({
  subsets: ['thai', 'latin'],
  weight: ['400', '500', '600'],
  variable: '--font-plex-thai',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'Notify',
    template: '%s — Notify',
  },
  description: 'Real Estate Operating System',
  applicationName: 'Notify',
};

/** ไม่ล็อกซูม (คง accessibility) — กัน auto-zoom ด้วยขนาดฟอนต์ ≥16px ในช่องกรอกแทน */
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#141312',
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const locale = await getLocale();

  return (
    <html
      lang={locale}
      className={`${inter.variable} ${manrope.variable} ${plexThai.variable}`}
      suppressHydrationWarning
    >
      <head>
        {/* ใช้ธีมที่บันทึกไว้ก่อนเพนต์ (กันจอกระพริบ) — ค่าเริ่มต้น = สว่าง */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{if(localStorage.getItem('notify-theme')==='dark')document.documentElement.classList.add('dark')}catch(e){}",
          }}
        />
      </head>
      <body>
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
