'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { loginSchema, type LoginResponse } from '@/lib/types';
import { apiFetch, ApiClientError } from '@/lib/api-client';

/**
 * ปลายทางหลัง login — รับได้เฉพาะ path ภายในฝั่ง admin
 * กัน open redirect จาก `?next=https://evil.example` หรือ `//evil.example`
 */
function safeNext(next: string | undefined): string {
  if (!next?.startsWith('/admin') || next.startsWith('//')) return '/admin/dashboard';
  return next;
}

export function LoginForm({ nextPath }: { nextPath?: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError(null);

    const formData = new FormData(event.currentTarget);
    // validate ฝั่ง client เป็น UX เสริมเท่านั้น — ตัวจริงคือ Zod ที่ route handler
    const parsed = loginSchema.safeParse({
      email: formData.get('email'),
      password: formData.get('password'),
    });

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'ข้อมูลไม่ถูกต้อง');
      return;
    }

    setPending(true);

    try {
      await apiFetch<LoginResponse>('/api/auth/login', {
        method: 'POST',
        body: parsed.data,
      });

      // session อยู่ใน httpOnly cookie แล้ว — refresh เพื่อให้ middleware/layout เห็น
      router.replace(safeNext(nextPath));
      router.refresh();
    } catch (caught) {
      setError(
        caught instanceof ApiClientError ? caught.message : 'เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่',
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm">
        อีเมล
        <input
          name="email"
          type="email"
          autoComplete="username"
          required
          className="rounded border border-slate-300 px-3 py-2"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        รหัสผ่าน
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="rounded border border-slate-300 px-3 py-2"
        />
      </label>

      {error ? (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="rounded bg-slate-900 px-4 py-2 text-white disabled:opacity-50"
      >
        {pending ? 'กำลังเข้าสู่ระบบ…' : 'เข้าสู่ระบบ'}
      </button>
    </form>
  );
}
