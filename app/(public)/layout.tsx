import type { ReactNode } from 'react';

/**
 * layout ฝั่งลูกค้า — index ได้ (ต่างจาก (admin) ที่ noindex)
 *
 * กติกา bundle isolation (spec section 9): ห้าม import อะไรจาก components/admin/*
 * เข้ามาในซับทรีนี้ ไม่งั้น Next จะรวม admin bundle ไปให้ลูกค้าโหลดด้วย
 */
export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-slate-200">
        <nav className="mx-auto flex max-w-6xl items-center justify-between p-4">
          <a href="/" className="font-semibold">
            ทรัพย์ให้เช่า
          </a>
          <a href="/properties" className="text-sm text-slate-600 hover:text-slate-900">
            ค้นหาทรัพย์
          </a>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 p-4">{children}</main>

      <footer className="border-t border-slate-200 p-4 text-center text-sm text-slate-500">
        © {new Date().getFullYear()} ทรัพย์ให้เช่า
      </footer>
    </div>
  );
}
