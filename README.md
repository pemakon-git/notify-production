# Property Rental Management System

ระบบจัดการเช่าอสังหาริมทรัพย์ — implement ตาม [property-management-spec.md](property-management-spec.md)

**Next.js app เดียว** (1 codebase, 1 Vercel project) แบ่งฝั่งลูกค้า/พนักงานด้วย route group + protected route

## โครงสร้าง

```
app/
  (public)/           หน้าเว็บลูกค้า — ไม่ต้อง login
  (admin)/            หน้าเว็บพนักงาน — ผ่าน middleware + ตรวจ role ที่ layout
  api/                Route Handlers (Node.js runtime) — business logic ทั้งหมดอยู่ที่นี่
components/
  public/ | admin/    ห้าม import ข้ามกัน (ให้ Next code-split แยก bundle จริง)
lib/
  auth/               ตรวจ session, revoke session
  policies/           permissions.config.ts — ตารางสิทธิ์เดียวของระบบ
  guards/             withPermission(), applyFieldMask()
  audit/              writeAuditLog(), diffFields()
  crypto/             เข้ารหัสเลขบัตรประชาชน (AES-256-GCM)
  codes/              ออกเลข CD/LD/APT/CT-ปี-เลข
  http/               error → response mapping, validate
  types/              Zod schema + type ที่ UI และ API ใช้ร่วมกัน
  prisma/             schema.prisma, migrations, policies.sql, seed
middleware.ts         ด่านแรก — default-deny ทุก request ที่ไม่ได้อยู่ใน allowlist
supabase/config.toml  ตั้งค่า Supabase local (`supabase start`)
```

**หลักการที่ห้ามละเมิด:** UI ทั้งสองฝั่งไม่มี business logic — เรียก `app/api/*` ผ่าน
[lib/api-client.ts](lib/api-client.ts) เท่านั้น ยกเว้นการอ่าน listing ทรัพย์ที่เผยแพร่แล้ว
ซึ่งอ่านตรงจาก Supabase ได้ผ่าน [lib/supabase/public-browser.ts](lib/supabase/public-browser.ts)
โดยมี RLS เป็นตัวบังคับสิทธิ์

## ด่านตรวจสิทธิ์ 3 ชั้น (ห้ามตัดชั้นใดออก)

| ด่าน | ที่ไหน | ตรวจอะไร |
|---|---|---|
| 1 | `middleware.ts` | มี session ไหม — ไม่มี = redirect `/login` (หน้าเว็บ) หรือ 401 (API) |
| 2 | `app/(admin)/layout.tsx` | โปรไฟล์มีจริง / ไม่ถูก suspend / role อะไร (อ่านจาก DB) |
| 3 | `withPermission()` ในทุก route handler | action + field ตาม policy table |

ด่าน 3 เป็นด่านที่ป้องกันข้อมูลจริง — ด่าน 1-2 กันแค่ระดับ UI
รายละเอียดเหตุผลอยู่ใน [docs/architecture-decisions.md](docs/architecture-decisions.md) ข้อ 5-6

## Tech stack

| ชั้น | ใช้ |
|---|---|
| Runtime | Node.js 20+ / Next.js 16 (App Router, Route Handlers, `runtime = 'nodejs'`) |
| DB | Supabase Postgres 15 + Prisma 6 (ต่อผ่าน pooler port 6543) |
| Auth | Supabase Auth (GoTrue) + `@supabase/ssr` — session เป็น httpOnly cookie |
| Authorization | policy table เอง (resource × action × role + field masking) |
| Validation | Zod — ที่ route handler คือตัวจริง, ที่ฟอร์มคือ UX เสริม |
| UI | Tailwind CSS + TanStack Query/Table + react-hook-form + next-intl (th/en) |
| Storage | Supabase Storage — `property-images` (public) / `documents` (private) |
| Schedule | Vercel Cron → `/api/cron/*` (ตรวจ `CRON_SECRET`) |
| Rate limit | Upstash Redis — ใช้กับ `/api/public/*` เท่านั้น |
| Test | Vitest (unit + integration กับ Postgres จริง) |

## เริ่มใช้งาน

```bash
npm install

# 1) ตั้ง env
cp .env.example .env
# สร้าง key เข้ารหัสเลขบัตรประชาชน แล้วใส่เป็น NATIONAL_ID_ENC_KEY
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# 2) เตรียม DB (migrate → RLS/constraint/trigger → seed 3 role)
npm run db:setup

# 3) รัน (http://localhost:3000)
npm run dev
```

### คำสั่งที่ใช้บ่อย

| คำสั่ง | ทำอะไร |
|---|---|
| `npm run db:migrate` | `prisma migrate deploy` — สร้าง/อัปเดตตาราง |
| `npm run db:policies` | รัน `lib/prisma/sql/policies.sql` (**ต้องรันหลัง migrate ทุกครั้ง**) |
| `npm run db:seed` | สร้าง user 3 role + amenities + ทรัพย์ตัวอย่าง |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run test` | Vitest |
| `npm run build` | `prisma generate && next build` |

### บัญชีทดสอบจาก seed

| Email | Role |
|---|---|
| `owner@example.com` | `super_admin` |
| `manager@example.com` | `property_manager` |
| `sales@example.com` | `sales_agent` |

รหัสผ่านเริ่มต้น `DevPassword!2026` (เปลี่ยนได้ด้วย env `SEED_PASSWORD`)

## Migration ทำงานยังไง

DDL มี **เจ้าของเดียว** คือ Prisma เพื่อไม่ให้ schema สองแหล่งไม่ตรงกัน:

1. `lib/prisma/migrations/0_extensions/` — `btree_gist`, `pg_trgm` (ชื่อขึ้นต้น `0_` เพื่อรันก่อนทุก migration)
2. `lib/prisma/migrations/<timestamp>_init/` — ตารางทั้งหมด generate จาก `schema.prisma`
3. `lib/prisma/sql/policies.sql` — สิ่งที่ Prisma แสดงไม่ได้ (idempotent รันซ้ำได้):
   - FK `profiles.id` → `auth.users.id`
   - `next_code_seq()` ออกเลข running number ต่อปีแบบ atomic
   - exclusion constraint กันนัดชน (business rule #3)
   - เอกสารต้องมี link ≥ 1 (deferred constraint trigger)
   - `audit_logs` insert-only (trigger บล็อก UPDATE/DELETE/TRUNCATE แม้กับ table owner)
   - RLS ทุกตาราง + `REVOKE`/`GRANT` ของ `anon`/`authenticated`
   - Supabase Storage buckets

## Deploy

Vercel project เดียว ตั้ง env ตาม [.env.example](.env.example)

กติกาที่พลาดไม่ได้: `SUPABASE_SERVICE_ROLE_KEY` **ห้ามมี prefix `NEXT_PUBLIC_`** เพราะจะถูกฝังลง
client bundle ทันที — มีแค่ `NEXT_PUBLIC_SUPABASE_URL` และ `NEXT_PUBLIC_SUPABASE_ANON_KEY`
ที่ปลอดภัยจะ expose (คู่กับ RLS)

## เอกสารเพิ่มเติม

- [docs/implementation-status.md](docs/implementation-status.md) — ทำไปแล้วเท่าไร เหลืออะไร ทดสอบอะไรไปแล้ว
- [docs/architecture-decisions.md](docs/architecture-decisions.md) — จุดที่ตัดสินใจต่างจาก spec และเหตุผล
