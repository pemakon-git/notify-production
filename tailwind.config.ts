import type { Config } from 'tailwindcss';

export default {
  // ต้องครอบทั้ง app/ และ components/ ไม่งั้น Tailwind purge class ทิ้งทั้งหมด
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
} satisfies Config;
