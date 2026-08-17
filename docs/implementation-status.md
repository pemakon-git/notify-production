# Implementation status

เทียบกับ milestone ใน spec section 8

| # | Milestone | สถานะ |
|---|---|---|
| 1 | Foundation | ✅ เสร็จ |
| 2 | RBAC core | ✅ เสร็จ |
| 3 | Users + Dashboard | 🟡 Users API เสร็จ / Dashboard เป็น placeholder |
| 4 | Properties + Property Requests | ⬜ ยังไม่เริ่ม |
| 5 | Owners | ⬜ ยังไม่เริ่ม |
| 6 | Leads + Appointments | 🟡 constraint กันนัดชนพร้อมแล้วที่ DB / endpoint ยังไม่มี |
| 7 | Customers + Contracts | ⬜ ยังไม่เริ่ม |
| 8 | Documents | 🟡 constraint ห้ามเอกสารลอยพร้อมแล้ว / endpoint ยังไม่มี |
| 9 | Notifications | ⬜ ยังไม่เริ่ม (ตาราง + cron schedule ตั้งไว้แล้ว) |
| 10 | Audit/Activity logs | ✅ helper + DB guard เสร็จ (ต้อง retrofit เข้าโมดูลใหม่ทุกตัว) |
| 11 | Admin UI | 🟡 shell + เมนูตาม permission / หน้าจอจริงยังไม่มี |
| 12 | Public UI | 🟡 layout + RLS พร้อม / listing กับฟอร์มนัดดูยังไม่มี |
| 13 | Deploy | ⬜ ยังไม่ deploy (`vercel.json` + cron ตั้งไว้แล้ว) |

---

## milestone 1 — Foundation ✅

| สิ่งที่ทำ | ไฟล์ |
|---|---|
| Next.js app เดียว + route group `(public)`/`(admin)` | `app/` |
| Prisma schema เต็มตาม spec section 4 (24 ตาราง) | `lib/prisma/schema.prisma` |
| Migration: extensions → ตาราง | `lib/prisma/migrations/` |
| RLS + constraint + trigger + storage bucket | `lib/prisma/sql/policies.sql` |
| ผูก Supabase Auth เข้ากับ `profiles` (FK จริงไป `auth.users`) | `policies.sql` §1 |
| ต่อ DB ผ่าน pooler + singleton client | `lib/prisma/client.ts` |
| middleware ด่านแรก (default-deny) | `middleware.ts` |
| seed 3 role + amenities + ทรัพย์ตัวอย่าง | `lib/prisma/seed.ts` |

## milestone 2 — RBAC core ✅

| สิ่งที่ทำ | ไฟล์ |
|---|---|
| policy table (resource × action × role + maskedFields) | `lib/policies/permissions.config.ts` |
| `withPermission()` / `withAuth()` / `withPublic()` | `lib/guards/require-permission.ts` |
| field masking (`••••1234`) ที่ชั้น serializer | `lib/guards/mask-fields.ts` |
| audit log + activity log + diff helper | `lib/audit/write-audit-log.ts` |
| เข้ารหัสเลขบัตร AES-256-GCM | `lib/crypto/national-id.ts` |
| ออก running number ต่อปีแบบ atomic | `lib/codes/generate-code.ts` |
| error → response mapping (รวม DB constraint) | `lib/http/response.ts` |
| ตรวจสิทธิ์ชั้น UI จาก permission ที่ backend คำนวณ | `app/(admin)/layout.tsx`, `components/admin/admin-nav.tsx` |

---

## endpoint ที่ใช้งานได้แล้ว

```
POST   /api/auth/login                       (public — เขียน httpOnly cookie + บันทึก session/audit)
POST   /api/auth/refresh                     (public — ต่ออายุจาก cookie หรือ refreshToken)
POST   /api/auth/logout                      (auth  — revoke session + ล้าง cookie)
GET    /api/auth/me                          (auth  — profile + permissions ให้ UI ใช้)
GET    /api/health                           (public — เช็ค DB ผ่าน pooler)

GET    /api/users                            (super_admin — filter role/status/search + pagination)
POST   /api/users                            (super_admin — สร้าง auth user + profile, rollback ถ้าพลาด)
GET    /api/users/:id                        (super_admin)
PATCH  /api/users/:id                        (super_admin — บังคับ rule #7, #8)
GET    /api/users/:id/sessions               (super_admin — รายการอุปกรณ์ + ตัวที่ใช้อยู่)
DELETE /api/users/:id/sessions               (super_admin — ออกจากระบบทุกอุปกรณ์)
DELETE /api/users/:id/sessions/:sessionId    (super_admin — ถอนทีละเครื่อง)
```

---

## business rule ที่บังคับได้จริงแล้ว

| # | กติกา | บังคับที่ | ทดสอบที่ |
|---|---|---|---|
| 3 | นัดหมายห้ามชนกัน | DB exclusion constraint | `tests/db-rules.test.ts` (7 เคส) |
| 5 | เซ็น/ออกใบเสร็จเฉพาะ super_admin | policy table | `tests/permissions.test.ts` |
| 7 | ห้ามแก้ role ตัวเอง / ตั้ง role สูงกว่าตัวเอง | `canAssignRole()` + guard ใน `PATCH /users/:id` | `tests/permissions.test.ts` |
| 8 | suspend/เปลี่ยน role → เด้งออกทุกเครื่อง | `revokeAllSessions()` 3 ชั้น | — (ต้องมี Supabase จริง) |
| 11 | audit_logs ห้าม update/delete | DB trigger (แม้ owner ก็ทำไม่ได้) | `tests/db-rules.test.ts` (4 เคส) |
| 4.9 | เอกสารต้องมี link ≥ 1 | deferred constraint trigger | `tests/db-rules.test.ts` (4 เคส) |
| §9 | RLS: anon เห็นเฉพาะทรัพย์ available | RLS + GRANT | `tests/db-rules.test.ts` (4 เคส) |
| §2.1 | middleware default-deny ฝั่ง admin | `middleware.ts` | `tests/middleware.test.ts` (11 เคส) |

**ยังไม่ได้ implement** (รอโมดูลของมันใน milestone 4-9): rule #1, #2, #6, #9, #10

---

## ผลตรวจล่าสุด

```
npx tsc --noEmit     → ผ่าน
npx vitest run       → 61 passed (6 files) — รวม integration test กับ Postgres 15 จริง
npx next build       → ผ่าน (13 routes + middleware)
npm audit            → 0 vulnerabilities
```

integration test ใน `tests/db-rules.test.ts` จะถูกข้ามอัตโนมัติถ้าไม่มี `TEST_DATABASE_URL`
วิธีรันจริง:

```bash
docker run -d --name notify-pg-test -e POSTGRES_PASSWORD=postgres -p 55432:5432 postgres:15
npm run db:migrate && npm run db:policies
TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:55432/postgres npx vitest run
```

---

## สิ่งที่ยังไม่ได้ยืนยันกับของจริง

ต้องมี Supabase project จริงจึงทดสอบได้ (ยังไม่มี credential ในเครื่องนี้):

- `POST /api/auth/login` กับ GoTrue จริง (flow cookie + session recording)
- FK `profiles.id → auth.users.id` (บล็อกนี้ถูกข้ามบน Postgres เปล่า)
- Storage bucket + policy (บล็อกนี้ถูกข้ามบน Postgres เปล่า)
- `revokeAllSessions()` เรียก GoTrue admin logout
- seed script (ต้องสร้าง auth user จริง)

ทั้งหมดนี้จะรันได้ทันทีเมื่อกรอก `.env` แล้วสั่ง `npm run db:setup`

---

## ทำต่อจากนี้ (ลำดับที่แนะนำ)

1. กรอก `.env` จาก Supabase project จริง → `npm run db:setup` → login ด้วยบัญชี seed ยืนยัน flow ครบวง
2. milestone 4: Properties + state machine `draft → pending_review → available` (rule #1, #2)
3. milestone 5: Owners + field masking + notification diff (rule #9) — ตาราง `notifications` พร้อมแล้ว
4. milestone 6: Appointments endpoint (constraint พร้อมแล้ว เหลือ map error → 409 ซึ่ง `toErrorResponse()` ทำไว้แล้ว)

ทุก PR ที่เพิ่ม route ใหม่ ให้เช็ค checklist ใน spec section 10 ข้อสุดท้าย:
(1) อยู่ใน route group ที่ถูก (2) เรียก `withPermission()` จริงไม่ใช่พึ่ง middleware
(3) ไม่ import component ข้าม `admin`/`public`
