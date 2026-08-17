import type { Config } from 'tailwindcss';
import plugin from 'tailwindcss/plugin';

/**
 * Design token — single source of truth (ยกมาจาก tailwind.preset.cjs + web-v2/tailwind.config.ts)
 *
 * สองชุดในไฟล์เดียว เพราะรวมเป็นแอปเดียวแล้ว:
 *   ไม่มี prefix  = ฝั่งพนักงาน (admin) — อ้าง CSS variable จึงสลับ light/dark ได้ + รองรับ opacity (bg-ink/40)
 *   prefix `v2-`  = ฝั่งลูกค้า — ค่าคงที่ ไม่มี dark mode (ตามที่ web-v2 ตั้งใจ override lock)
 *
 * ⛔ ห้ามใช้ค่า arbitrary ในคอมโพเนนต์ (DESIGN-SYSTEM.md §1-§4) — เพิ่ม token ที่นี่ก่อน
 */
export default {
  darkMode: 'class',
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // ── ฝั่งพนักงาน (semantic · light/dark ผ่าน CSS var ใน globals.css) ──
        ink: {
          DEFAULT: 'rgb(var(--c-ink) / <alpha-value>)',
          soft: 'rgb(var(--c-ink-soft) / <alpha-value>)',
        },
        gold: {
          DEFAULT: 'rgb(var(--c-gold) / <alpha-value>)',
          dark: 'rgb(var(--c-gold-dark) / <alpha-value>)',
          light: 'rgb(var(--c-gold-light) / <alpha-value>)',
        },
        surface: 'rgb(var(--c-surface) / <alpha-value>)',
        raised: 'rgb(var(--c-raised) / <alpha-value>)',
        canvas: 'rgb(var(--c-canvas) / <alpha-value>)',
        border: 'rgb(var(--c-border) / <alpha-value>)',
        'border-strong': 'rgb(var(--c-border-strong) / <alpha-value>)',
        muted: 'rgb(var(--c-muted) / <alpha-value>)',
        faint: 'rgb(var(--c-faint) / <alpha-value>)',
        success: 'rgb(var(--c-success) / <alpha-value>)',
        warning: 'rgb(var(--c-warning) / <alpha-value>)',
        danger: 'rgb(var(--c-danger) / <alpha-value>)',
        info: 'rgb(var(--c-info) / <alpha-value>)',

        // ── ฝั่งลูกค้า (ขาว-ดำ minimal · ค่าจาก audit DOM สด) ──
        v2: {
          ink: '#111111', // หัวข้อ/ปุ่มดำ
          body: '#333333', // เนื้อความ
          muted: '#666666',
          faint: '#999999',
          line: '#e8e8e8',
          surface: '#ffffff',
          soft: '#f6f6f6', // พื้น section สลับ
        },
      },

      fontFamily: {
        // admin: Latin = Inter (คลีน UI) · ไทย = IBM Plex Sans Thai (per-glyph fallback)
        sans: ['var(--font-inter)', 'var(--font-plex-thai)', 'system-ui', 'sans-serif'],
        // ฝั่งลูกค้า: Latin = Manrope
        display: ['var(--font-manrope)', 'var(--font-plex-thai)', 'system-ui', 'sans-serif'],
      },

      // micro token (badge/unit/count/nav) — แทน arbitrary text-[11px]
      fontSize: { '2xs': '0.6875rem' },

      borderRadius: {
        card: '12px', // การ์ด/กล่องเอกสาร (admin)
        xl2: '14px', // search panel, dropdown, floating bottom-nav (admin)
        pill: '50px', // ปุ่มหลักฝั่งลูกค้าเท่านั้น — ⛔ ห้ามใช้กับปุ่ม admin
        'card-v2': '20px', // การ์ดฝั่งลูกค้า
      },

      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,0.06)',
        // public เด่นกว่า admin โดยเจตนา (การ์ด hover/ลอย)
        lift: '0 8px 24px rgba(0,0,0,0.08)',
      },

      maxWidth: {
        content: '1200px', // container ฝั่งลูกค้า
      },

      letterSpacing: {
        tightish: '-0.01em',
      },

      // ── Motion tokens — ตั้งชื่อ easing/duration ให้ทั้งระบบใช้ภาษาเดียว ──
      transitionTimingFunction: {
        standard: 'cubic-bezier(0.16, 1, 0.3, 1)', // entrance/รายการ
        emphasized: 'cubic-bezier(0.2, 0, 0, 1)', // interaction สำคัญ
      },
      transitionDuration: {
        fast: '150ms',
        base: '200ms',
        slow: '300ms',
      },
      keyframes: {
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'modal-in': {
          from: { opacity: '0', transform: 'translateY(8px) scale(0.985)' },
          to: { opacity: '1', transform: 'none' },
        },
      },
      animation: {
        'fade-in': 'fade-in 200ms cubic-bezier(0.16, 1, 0.3, 1) both',
        // backwards (ไม่ใช่ both): กัน identity transform ค้างแล้วกลายเป็น
        // containing block ดักจับ position:fixed → dropdown ในโมดัลตกกรอบ
        'modal-in': 'modal-in 240ms cubic-bezier(0.16, 1, 0.3, 1) backwards',
      },
    },
  },
  plugins: [
    /**
     * variant สลับ shell ตาม "อุปกรณ์ชี้" ไม่ใช่แค่ความกว้างจอ
     *   mouse = จอกว้าง ≥768 และไม่มี touch → shell แบบมี sidebar
     *   touch = มีระบบสัมผัส (มือถือ/แท็บเล็ต) → shell มือถือเสมอ แม้ต่อคีย์บอร์ด/แทร็กแพด
     * เหตุผล: iPad ต่อ Magic Keyboard กว้างพอ ๆ โน้ตบุ๊ก แต่ target ต้องใหญ่แบบสัมผัส
     */
    plugin(({ addVariant }) => {
      addVariant('mouse', '@media (min-width: 768px) and (not (any-pointer: coarse))');
      addVariant('touch', '@media (any-pointer: coarse)');
    }),
  ],
} satisfies Config;
