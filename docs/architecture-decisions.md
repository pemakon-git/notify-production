# Architecture decisions

บันทึกจุดที่ implementation ตัดสินใจ **ต่างจาก spec** หรือจุดที่ spec ขัดกันเองแล้วต้องเลือกทางใดทางหนึ่ง
ถ้าไม่เห็นด้วยกับข้อไหน แก้ได้ — แต่ให้แก้ที่นี่พร้อมโค้ดเพื่อไม่ให้เหตุผลหาย

---

## 1. Route Handlers ไม่ใช่ NestJS

**spec:** section 2/7 ระบุ Next.js Route Handlers แต่ section 3.2 เขียนตัวอย่างเป็น `@RequirePermission()`
decorator และ section 6 พาดหัวว่า "NestJS module ต่อ resource"

**เลือก:** Route Handlers ตาม section 2 และ 7 (และตามที่ผู้ใช้ยืนยัน "Next.js + Node.js")
decorator แปลงเป็น higher-order function:

```ts
// แทน @RequirePermission('properties', 'approve')
export const POST = withPermission('properties', 'approve', async (req, { auth, params }) => { … });
```

ผลลัพธ์เหมือนกัน: ไม่มีทางเรียก handler ได้โดยข้ามการตรวจสิทธิ์ เพราะ export ที่ Next เรียกคือ wrapper

---

## 2. กันนัดชนด้วย Postgres constraint ไม่ใช่ Redis lock

**spec:** 4.6 เขียน "DB-level exclusion constraint + app-level lock ผ่าน Redis"
แต่ 2.1 และ rule #3 บอกห้ามใช้ lock ข้าม request เพราะ serverless ไม่มี state

**เลือก:** exclusion constraint ล้วน (`lib/prisma/sql/policies.sql`)

```sql
EXCLUDE USING gist (agent_id WITH =, tstzrange(scheduled_at, ends_at, '[)') WITH &&)
WHERE (status <> 'cancelled')
```

Redis lock แก้ปัญหานี้ไม่ได้จริงอยู่แล้ว — ต่อให้ล็อกสำเร็จ ก็ยังมีช่องว่างระหว่างปล่อยล็อกกับ commit
ส่วน constraint ตัดสินที่ transaction commit จึงไม่มีช่องว่างนั้น Upstash Redis ยังอยู่ใน stack
แต่ใช้ทำ **rate limit** ของ `/api/public/*` เท่านั้น

**ผลข้างเคียงที่ต้องรู้:** เพราะ constraint ใช้คอลัมน์ `ends_at` ที่ app คำนวณ จึงมี CHECK
`ends_at = scheduled_at + make_interval(mins => duration_minutes)` กันกรณี app คำนวณผิดแล้วเลี่ยง constraint ได้

---

## 3. ไม่มี `password_hash` ในตาราง profiles

**spec:** 4.1 ระบุ field `password_hash` แต่ section 2 ใช้ Supabase Auth

**เลือก:** credential อยู่ที่ `auth.users` ของ Supabase จุดเดียว ตาราง `profiles` เก็บแค่ข้อมูล
ธุรกิจ (role/team/status/language) และผูก id เข้ากับ `auth.users.id` ด้วย FK จริง (ตั้งใน policies.sql)

เก็บ hash สองที่ = มีโอกาสไม่ตรงกัน และเป็น attack surface เพิ่มโดยไม่ได้อะไรกลับมา

---

## 4. `converted_from_lead_id` เก็บข้างเดียว

**spec:** 4.5 มี `leads.converted_to_customer_id` และ 4.7 มี `customers.converted_from_lead_id`
ซึ่งเป็นข้อมูลเดียวกันเก็บสองที่

**เลือก:** เก็บ FK จริงที่ `leads.converted_to_customer_id` (unique) ฝั่ง `customers` เป็น back-relation
ของ Prisma อ่านได้เหมือนกันแต่ไม่มีทางไม่ตรงกัน

---

## 5. middleware ไม่ตรวจ role — ตรวจที่ layout กับ route handler

**spec:** 2.1 เขียนว่า middleware ควรเช็ค "Supabase JWT + role แบบ default-deny"

**เลือก:** middleware เช็ค **การมี session** (default-deny) แต่ไม่เช็ค role เพราะ

1. role อยู่ในตาราง `profiles` — middleware รัน Edge runtime ต่อ Prisma ไม่ได้
2. ถ้าย้าย role ไปฝังใน JWT claim จะกลายเป็นความจริงชุดที่ 2 ที่ค้างเก่าหลังเปลี่ยน role
   (ขัด spec section 10 "ห้าม trust role ที่ไม่ได้ derive จากของจริง")

ชั้นตรวจสิทธิ์จริงจึงเป็น 3 ด่าน:

| ด่าน | ที่ไหน | ตรวจอะไร |
|---|---|---|
| 1 | `middleware.ts` | มี session ไหม — ไม่มี = redirect `/login` หรือ 401 |
| 2 | `app/(admin)/layout.tsx` | โปรไฟล์มีจริงไหม, ถูก suspend ไหม, role อะไร (จาก DB) |
| 3 | `withPermission()` ทุก route handler | action + field ตาม policy table |

ด่าน 3 คือด่านที่ป้องกันข้อมูลจริง — ด่าน 1-2 แค่กันไม่ให้ UI แสดงสิ่งที่ไม่ควรแสดง

---

## 6. middleware กัน `/api/*` ด้วย แต่ไม่ verify ซ้ำ

`/api/*` (ที่ไม่ใช่ `/api/public/*`, `/api/auth/login`, `/api/auth/refresh`, `/api/health`, `/api/cron/*`)
ถ้าไม่มี credential ติดมาเลย → middleware ตอบ 401 ทันทีโดย **ไม่ยิงไป GoTrue**

เหตุผล: ได้ตาข่ายกันกรณี "ลืมใส่ guard ใน endpoint ใหม่" ตามที่ spec 2.1 กังวล
โดยไม่จ่ายค่า network round-trip สองรอบต่อ request การ verify จริงยังอยู่ที่
`authenticate()` ใน route handler ที่เดียว

---

## 7. session เป็น httpOnly cookie ไม่ใช่ token ใน body

เพราะรวมเป็น app เดียว same-origin แล้ว `POST /api/auth/login` จึงเขียน session เป็น
httpOnly cookie ผ่าน `@supabase/ssr` และ **ไม่คืน access/refresh token ลง response body**
ทำให้ XSS อ่าน token ไปใช้ต่อไม่ได้ (ต่างจากตอนแยก 2 โปรเจกต์ที่ต้องส่ง token ข้าม origin)

`authenticate()` ยังรับ `Authorization: Bearer` ได้ด้วย สำหรับ integration test และเครื่องมือภายนอก

---

## 8. Prisma เป็นเจ้าของ DDL ทั้งหมด ไม่แยก supabase/migrations

**spec:** section 7 วาง `supabase/migrations/` สำหรับ RLS/constraint/extension

**เลือก:** migration runner เดียวคือ Prisma เพื่อไม่ให้ schema มีสองแหล่งที่ค่อยๆ ไม่ตรงกัน

```
lib/prisma/migrations/0_extensions/     ← btree_gist, pg_trgm (รันก่อนทุก migration)
lib/prisma/migrations/<ts>_init/        ← ตารางทั้งหมด (generate จาก schema.prisma)
lib/prisma/sql/policies.sql             ← RLS/constraint/trigger/bucket (idempotent, รันหลัง migrate)
supabase/config.toml                    ← ตั้งค่า Supabase local เท่านั้น ไม่มี DDL
```

`policies.sql` รันซ้ำได้เสมอ และ `npm run db:setup` ร้อยลำดับให้ถูกต้องอยู่แล้ว

---

## 9. RLS ไม่มีผลกับ connection ของ app — และนั่นคือดีไซน์

Prisma ต่อ DB ด้วย role `postgres` (table owner) ซึ่ง **bypass RLS** ตามธรรมชาติของ Postgres
RLS ในโปรเจกต์นี้จึงมีผลกับ `anon`/`authenticated` ที่เข้ามาทาง `supabase-js` เท่านั้น

ตรงตามเจตนา spec section 9: api เป็นด่านหลัก RLS เป็น defense-in-depth ของทางเข้าที่สอง
(หน้า listing ฝั่งลูกค้า) — และ `policies.sql` ยัง `REVOKE ALL` ทุกตารางจาก `anon`/`authenticated`
แล้ว `GRANT SELECT` คืนเฉพาะ 4 ตารางที่หน้า listing ต้องใช้

`tests/db-rules.test.ts` ยืนยันด้วย `SET ROLE anon` จริงว่าอ่าน `owners`/`customers`/`contracts`/
`audit_logs`/`profiles`/`documents` ไม่ได้เลย และเห็นทรัพย์เฉพาะ `status = 'available'`

---

## 10. เลขบัตรประชาชน: เข้ารหัสที่ app layer ไม่ใช่ pgcrypto

**spec:** section 9 ให้เลือกได้ทั้งสองทาง

**เลือก:** AES-256-GCM ที่ app layer (`lib/crypto/national-id.ts`) เพราะ

- key ไม่ต้องโผล่ใน SQL statement (ซึ่งอาจไปอยู่ใน DB log / slow query log)
- DB dump ที่หลุดออกไปยังอ่านไม่ออก
- rotate key ได้ทีละ record ด้วย version prefix (`v1:`)

เก็บ `national_id_last4` แยกไว้ต่างหาก เพื่อ mask เป็น `••••1234` ได้โดยไม่ต้อง decrypt ทั้งตาราง

---

## 11. running number ออกจาก DB function ไม่ใช่ `COUNT(*)`

`next_code_seq(scope, year)` เป็น `INSERT … ON CONFLICT DO UPDATE … RETURNING` ซึ่ง atomic
ระดับ row lock — serverless หลาย invocation ที่เข้ามาพร้อมกันจะไม่ได้เลขซ้ำ
(`tests/db-rules.test.ts` ยิง 8 connection พร้อมกันแล้วยืนยันว่าได้ 1-8 ไม่ซ้ำ)

ใช้ปี ค.ศ. — ถ้าต้องการ พ.ศ. แก้ที่ `lib/codes/generate-code.ts` บรรทัดเดียว

---

## 12. `canAssignRole` ตีความ "ต่ำกว่าตัวเอง" แบบเข้มงวด

**spec:** 3.1 "ตั้ง role ให้คนอื่นได้เฉพาะ role ที่ต่ำกว่าตัวเอง"

implement ตามตัวอักษร: `ROLE_RANK[target] < ROLE_RANK[actor]` → **super_admin สร้าง
super_admin คนที่สองไม่ได้** ทางเดียวที่จะมี super_admin เพิ่มคือ seed script หรือแก้ DB ตรง

ถ้าต้องการให้เจ้าของตั้งเจ้าของร่วมได้ ให้เปลี่ยนเป็น `<=` เฉพาะกรณี `actor === 'super_admin'`
— แต่ยังต้องคงกติกา "ห้ามแก้ role ตัวเอง" ไว้
