import Link from 'next/link';
import type { ReactNode } from 'react';
import { ScrollReveal } from '@/components/public/scroll-reveal';

/**
 * layout ฝั่งลูกค้า — ใช้ token ชุด v2 (ขาว-ดำ minimal · Manrope · ปุ่ม pill)
 * คลาส `.ui-v2` เปิด scope ของ token ชุดนี้ (ต่างจากฝั่งพนักงานโดยเจตนา)
 *
 * เนื้อหาเป็น **อังกฤษ** ตามที่ระบบเดิมกำหนดไว้ (ฝั่งลูกค้ายังไม่ผ่านขั้นแปลไทย)
 * และ nav ยึด 5 เสาธุรกิจที่เจ้าของเคาะแล้ว:
 *   TRANSACTION (ซื้อ/ขาย/เช่า) · SERVICE (Property Management = พระเอก)
 *   ACQUISITION (ฝากทรัพย์) · NETWORK (agent/partner) · INVESTMENT
 *
 * ⛔ bundle isolation: ห้าม import อะไรจาก components/admin/* เข้ามาในซับทรีนี้
 *    ไม่งั้น Next จะรวม admin bundle ไปให้ลูกค้าโหลดด้วย
 */
const NAV = [
  { href: '/properties', label: 'Properties' },
  { href: '/services', label: 'Services' },
  { href: '/network', label: 'Network' },
  { href: '/about', label: 'About' },
];

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="ui-v2 flex min-h-dvh flex-col">
      <header className="border-b border-v2-line">
        <div className="wrap flex h-20 items-center justify-between gap-6">
          <Link href="/" className="text-lg font-bold tracking-tightish text-v2-ink">
            Notify
          </Link>

          <nav className="hidden items-center gap-7 text-sm sm:flex" aria-label="Main">
            {NAV.map((item) => (
              <Link key={item.href} href={item.href} className="text-v2-body hover:text-v2-ink">
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <Link href="/contact" className="hidden text-sm text-v2-body hover:text-v2-ink sm:block">
              Contact
            </Link>
            <Link href="/list-your-property" className="btn-dark">
              List your property
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      {/* appear-on-scroll แบบ Framer — mount ครั้งเดียว auto-detect target ทุกหน้า */}
      <ScrollReveal />

      <footer className="mt-20 border-t border-v2-line py-10">
        <div className="wrap flex flex-col gap-2 text-sm text-v2-muted sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Notify</p>
          <Link href="/login" className="hover:text-v2-ink">
            Staff sign in
          </Link>
        </div>
      </footer>
    </div>
  );
}
