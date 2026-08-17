# Property Rental Management System — Technical Spec

> เอกสารนี้ใช้เป็น spec ตั้งต้นสำหรับ implement ด้วย Claude Code
> อ้างอิงจาก flow เดิม (role, เมนู, กติกาธุรกิจ) — แปลงเป็น spec เชิงเทคนิคที่พร้อมลงมือเขียนโค้ด

---

## 1. ภาพรวมระบบ

ระบบจัดการเช่าอสังหาริมทรัพย์ (property rental management) เป็น **Next.js app เดียว** (1 codebase, deploy 1 Vercel project) แบ่งเป็น 3 ชั้นภายในแอปเดียวกัน:

| ชั้น | อยู่ที่ | ผู้ใช้ | หน้าที่ |
|---|---|---|---|
| Public routes | `app/(public)/*` — ไม่ต้อง login | ลูกค้า | ดูประกาศทรัพย์, ฟอร์มนัดดู |
| Admin routes (Protected route) | `app/(admin)/*` — ผ่าน middleware บังคับ login + role | พนักงาน | operation ทั้งหมด: ทรัพย์, ลูกค้า, สัญญา, เอกสาร |
| API (Route Handlers) | `app/api/*` — Node.js runtime, serverless | ทั้งสองฝั่งเรียกผ่าน REST | business logic, RBAC, audit ทั้งหมด |
| Supabase | Postgres + Row Level Security + Auth + Storage | — | เก็บข้อมูล, auth session, ไฟล์เอกสาร/รูป |

**หลักการสำคัญ:** ทั้ง public routes และ admin routes (UI layer) **ห้ามมี business logic** — มีหน้าที่แสดงผลและเรียก `app/api/*` เท่านั้น การตรวจสิทธิ์/กติกาทั้งหมดต้องอยู่ที่ API layer เสมอ (ห้ามเชื่อ input จาก client) **ยกเว้น** การอ่านข้อมูล public ล้วนๆ (เช่น listing ทรัพย์ที่เผยแพร่แล้ว) ที่อนุญาตให้เรียก Supabase ตรงผ่าน `supabase-js` ได้ โดยมี RLS เป็นตัวบังคับสิทธิ์แทน

> **หมายเหตุ:** แม้จะรวมเป็น app เดียว แต่ **การแยกด่านตรวจสิทธิ์ยังต้องเข้มเหมือนเดิมทุกจุด** — เพราะ origin เดียวกันแปลว่าโอกาสหลุด (เช่น middleware พลาด, forget guard ใน endpoint ใหม่) ส่งผลกระทบกว้างกว่าตอนแยก 2 app เหตุผลและวิธีลดความเสี่ยงดูหัวข้อ 2.1

---

## 2. Tech Stack

```
Next.js app เดียว (1 Vercel project):
  - Next.js 14+ (App Router), TypeScript
  - Route Handlers (app/api/*) — Node.js runtime, business logic/RBAC/audit ทั้งหมด
  - Middleware (middleware.ts) — ด่านแรกกันเข้าถึง (admin)/* ถ้าไม่ login/ไม่มี role พอ
  - TanStack Query (data fetching / cache ฝั่ง UI)
  - supabase-js (เฉพาะ read-only public data เช่น listing ทรัพย์)
  - Zod (validate form ฝั่ง client — เป็น UX เสริม ไม่ใช่ security)

Data & infra:
  - Supabase Postgres 15+ พร้อม Row Level Security
  - Prisma ORM (ต่อผ่าน Supabase connection pooler — ดู 2.1)
  - Supabase Auth (JWT + session) แทนการเขียน auth เอง
  - Postgres exclusion constraint (btree_gist) แทน Redis lock สำหรับกันนัดชนกัน
  - Vercel Cron Jobs / Supabase pg_cron สำหรับงาน schedule (เช็คสัญญาใกล้หมด, ส่ง notification)
  - Supabase Storage สำหรับไฟล์เอกสาร/รูป

Infra:
  - Vercel project เดียว: 1 repo, 1 deploy pipeline
  - Supabase project เดียว: Postgres + Auth + Storage + RLS
```

### 2.1 สถาปัตยกรรม single-app: ข้อควรระวังและวิธีลดความเสี่ยง

เดิม spec แยก `web-admin` / `web-public` / `api` เป็น 3 โปรเจกต์ เพื่อตัด attack surface และแยก deploy อิสระกัน แต่ตอนนี้รวมเป็น Next.js app เดียวโดยใช้ **protected route ที่มีอยู่แล้ว** เป็นด่านกั้นฝั่ง admin การรวมยังใช้ได้ดี ถ้าคุมจุดต่อไปนี้ให้เข้ม:

| ความเสี่ยงจากการรวม app | วิธีลดความเสี่ยงในสถาปัตยกรรมนี้ |
|---|---|
| middleware พลาด/ลืมใส่ guard ใน route ใหม่ → หลุดเข้า admin ได้ | Route group `app/(admin)/*` ทุกตัวต้องผ่าน `middleware.ts` ที่เช็ค Supabase JWT + role แบบ default-deny (ไม่ใช่ whitelist เฉพาะบาง route) |
| Route Handler เดียวถูกเรียกได้จากทั้ง public และ admin โดยไม่เช็คสิทธิ์ | ทุก Route Handler ยังต้องเรียก `requirePermission()` ของตัวเองเสมอ **ห้ามพึ่ง middleware อย่างเดียว** — มองว่า middleware คือด่านที่ 1 (UI-level), permission check ใน route handler คือด่านที่ 2 (data-level) |
| Admin bundle (ตาราง/ฟอร์มจัดการ) หลุดไปอยู่ใน JS ที่ฝั่ง public โหลด | แยก route group ชัดเจน `app/(public)/*` กับ `app/(admin)/*` — Next.js code-split ตาม route อัตโนมัติอยู่แล้ว ตราบใดที่ไม่ import component ข้าม group กัน |
| Search engine เก็บ index หน้า admin | ตั้ง `robots.txt` disallow `/admin` และใส่ `noindex` metadata ใน layout ของ route group `(admin)` |

**สรุป:** business logic ยังอยู่จุดเดียวที่ `app/api/*` เหมือนเดิม (ยังตอบโจทย์ "logic อยู่ที่ Node.js") เพียงแต่ตอนนี้ UI ทั้งสองฝั่งอยู่ repo/deploy เดียวกัน ไม่ได้ลดความเข้มงวดของ RBAC ที่วางไว้ในหัวข้อ 3 เลย — แค่ลดจำนวนโปรเจกต์ที่ต้องดูแล

---

## 3. RBAC — บทบาทและสิทธิ์

### 3.1 บทบาท

```
super_admin       — เจ้าของ: ทำได้ทุกอย่าง + อนุมัติ/เซ็นสัญญา/ออกใบเสร็จ/ลบ/ดูเลขบัตร ปชช./ตั้งค่าระบบ
property_manager  — ผู้จัดการ: operation เต็ม แต่ อนุมัติ/เซ็น/ลบ/ตั้งค่า ไม่ได้
sales_agent       — เซล: สายขายเท่านั้น (ผู้สนใจ/ลูกค้า/นัด/ร่างสัญญา) ทรัพย์+เจ้าของทรัพย์ = ดูอย่างเดียว
```

ลำดับสิทธิ์: `super_admin > property_manager > sales_agent`
กติกา: ตั้ง role ให้คนอื่นได้เฉพาะ role ที่ต่ำกว่าตัวเอง และห้ามแก้ role ตัวเอง

### 3.2 โมเดลสิทธิ์ที่ต้อง implement

ต้องเป็น **permission ระดับ action + field** ไม่ใช่แค่ route-level guard เพราะมีเคสแบบ:
- เห็น record ได้ แต่บาง field ต้อง mask (เลขบัตร ปชช. `••••1234`)
- ทำ action พื้นฐานได้ (สร้าง/แก้) แต่ action สุดท้าย (อนุมัติ/เซ็น/ลบ) ทำไม่ได้

**แนะนำ implement เป็น policy table**

```ts
// permissions.config.ts (ตัวอย่างโครงสร้าง ไม่ใช่ค่าจริงทั้งหมด)
type Role = 'super_admin' | 'property_manager' | 'sales_agent';

interface ResourcePolicy {
  create?: Role[];
  read?: Role[];        // ถ้า resource ไม่ระบุ = ทุก role ที่ login แล้วอ่านได้
  update?: Role[];
  delete?: Role[];
  approve?: Role[];     // action พิเศษ เช่น อนุมัติเผยแพร่ทรัพย์
  sign?: Role[];        // เซ็นสัญญา
  issueReceipt?: Role[];
  maskedFields?: Partial<Record<Role, string[]>>; // field ที่ role นั้นเห็นแบบ mask
}

const POLICIES: Record<string, ResourcePolicy> = {
  users: {
    read: ['super_admin'],
    create: ['super_admin'],
    update: ['super_admin'],
  },
  properties: {
    create: ['super_admin', 'property_manager'],
    update: ['super_admin', 'property_manager'],
    approve: ['super_admin'],       // ขอเผยแพร่ -> อนุมัติ เฉพาะเจ้าของ
    delete: ['super_admin'],
  },
  owners: {
    update: ['super_admin', 'property_manager'],
    delete: ['super_admin'],
    maskedFields: {
      property_manager: ['national_id'], // เห็นเป็น ••••1234
      sales_agent: ['national_id'],
    },
  },
  contracts: {
    create: ['super_admin', 'property_manager', 'sales_agent'], // ร่างได้
    sign: ['super_admin'],
    issueReceipt: ['super_admin'],
  },
  // ... ที่เหลือตามตาราง module ด้านล่าง
};
```

Implement เป็น **NestJS Guard + Decorator**:
```ts
@RequirePermission('properties', 'approve')
@Post('properties/:id/approve')
approveProperty(...) { ... }
```
และ **field masking** ทำที่ชั้น serializer/interceptor ก่อนส่ง response ออก ไม่ใช่ query แล้วส่ง field ดิบไปให้ frontend ซ่อนเอง

### 3.3 Audit ที่ต้องผูกกับ RBAC

- ทุกครั้งที่ `super_admin` เปิดดูเลขบัตร ปชช. เต็ม → บันทึก audit log ทันที (แม้แค่ "ดู" ก็ต้อง log)
- ทุกครั้งที่ `property_manager` แก้ ชื่อ/เบอร์/ที่อยู่/เลขบัตร ของเจ้าของทรัพย์ → สร้าง notification แจ้งเจ้าของ พร้อม diff (ค่าเดิม → ค่าใหม่)

---

## 4. Data Model (สรุปตาม module)

> เขียนเป็น Prisma schema ใน `schema.prisma` — ด้านล่างเป็นสรุประดับ entity/field หลัก ไม่ใช่ schema เต็ม

### 4.1 `users`
- id, email, password_hash, first_name, last_name, phone
- role (enum: super_admin/property_manager/sales_agent), team_id
- status (active/suspended), language (th/en)
- **relation:** `sessions` (device, browser, ip, created_at)

### 4.2 `properties`
- id, code (`CD/HS/TH/AP-ปี-เลข`), type_enum, owner_id (FK owners)
- title_th, title_en, description_th, description_en, project_name
- province, district, sub_district, address, lat, lng
- rent_price, deposit_months
- bedrooms, bathrooms, area_sqm, floor, furnishing_enum
- amenities: many-to-many กับ `amenities` table (แยกหมวด: common/security/transport/pet/other)
- cover_image_id, images (relation)
- status_enum (draft/pending_review/available/unavailable)
- is_featured, view_count
- managed_by (sales_agent), sourced_by (sales_agent)
- **relation:** `status_history` (who, when, reason)

### 4.3 `property_requests`
- id, property_code_draft, type, province, district, project_name
- expected_rent, bedrooms, bathrooms, area, note
- owner_name, owner_phone, owner_consent (boolean)
- status_enum (pending/reviewed/rejected), review_note
- submitted_by (sales_agent), reviewed_by

### 4.4 `owners`
- id, first_name, last_name, phone, email, address
- national_id_encrypted (AES-256 ที่ app layer), note
- **relation:** properties, contracts

### 4.5 `leads`
- id, code (`LD-ปี-เลข`), name, phone, email
- source_enum (web/phone/referral)
- interested_properties (many-to-many)
- message, preferred_visit_at
- status_enum (following/closed/needs_attention)
- assigned_to (user), converted_to_customer_id

### 4.6 `appointments`
- id, code (`APT-ปี-เลข`), lead_id, property_id (nullable ถ้านัดนอกรอบ), topic
- agent_id, scheduled_at, duration_minutes, location
- status_enum (pending/done/cancelled), note, cancel_reason
- **constraint:** unique overlap check ต่อ agent_id (ทำ DB-level exclusion constraint + app-level lock ผ่าน Redis)

### 4.7 `customers`
- id, first_name, last_name, phone, email, address
- national_id_encrypted
- converted_from_lead_id

### 4.8 `contracts`
- id, code (`CT-ปี-เลข`), property_id, owner_id, customer_id, agent_id
- rent_price, deposit, commission
- start_date, end_date, signed_date
- status_enum (active/expiring_soon/ended)
- renewed_from_contract_id, cancel_reason
- **relation:** `contract_terms` (key-value), `documents`

### 4.9 `documents` + `document_versions` + `document_links`
- documents: id, type_enum, name, status_enum
- document_versions: id, document_id, file_url, version_no, file_size, file_type, checksum
- document_links: document_id, entity_type (property/owner/customer/contract/appointment/company), entity_id
  - **constraint:** เอกสารต้องมี link อย่างน้อย 1 เสมอ (ห้ามมีเอกสารลอย)
- verified_by, verified_at

### 4.10 `notifications` + `notification_preferences`
- notifications: id, category, title, content, entity_link, channel_enum (in_app/line/email)
  - status_enum (pending/sent/read/failed), read_at, user_id
- notification_preferences: user_id, category, channel, enabled (boolean)

### 4.11 `audit_logs` (insert-only, ห้าม update/delete)
- id, actor_id, actor_role, action, entity_type, entity_id
- old_value (jsonb), new_value (jsonb), ip, device, created_at

### 4.12 `activity_logs` (business timeline)
- id, entity_type, entity_id, action, actor_id, summary, created_at

---

## 5. Business Rules ที่ต้อง enforce ที่ backend (สำคัญ — ห้ามพึ่ง frontend)

| # | กติกา | จุด enforce |
|---|---|---|
| 1 | ทรัพย์ต้องข้อมูลครบ 7/7 หมวด ก่อนขอเผยแพร่ | validation ก่อน status → pending_review |
| 2 | แก้ทรัพย์ที่เผยแพร่แล้ว → เด้งกลับ pending_review อัตโนมัติ | interceptor บน update endpoint |
| 3 | นัดหมายห้ามชนกัน (agent เดียวกัน เวลาซ้อน) | Postgres exclusion constraint (`btree_gist`) — DB บังคับที่ transaction level ไม่ต้องพึ่ง lock ภายนอก |
| 4 | สร้างนัดดูทรัพย์ → ดัน lead เป็น "กำลังดูแล" | side-effect ใน transaction เดียวกับ create appointment |
| 5 | เซ็นสัญญา/ออกใบเสร็จ ทำได้เฉพาะ super_admin | guard เฉพาะ endpoint |
| 6 | เซ็นสัญญาได้ต้องมีเอกสารที่ verified แล้วเท่านั้น | validation ก่อน sign |
| 7 | แก้ role ตัวเองไม่ได้ / ตั้ง role สูงกว่าตัวเองไม่ได้ | guard ใน users module |
| 8 | reset password / suspend → revoke session ทุกเครื่องทันที | invalidate ทุก refresh token ของ user นั้น |
| 9 | ผจก.แก้ข้อมูล owner (ชื่อ/เบอร์/ที่อยู่/เลขบัตร) → แจ้งเตือนเจ้าของ พร้อม diff | interceptor บน owners update |
| 10 | ลบ owner/customer ได้เฉพาะเมื่อไม่มี property/contract ผูกอยู่ | check ก่อน delete |
| 11 | audit_logs ห้าม update/delete จาก application layer | ไม่ expose update/delete endpoint ให้ table นี้เลย |

---

## 6. API Structure (`app/api/*` Route Handler ต่อ resource)

```
/auth
  POST   /auth/login
  POST   /auth/refresh
  POST   /auth/logout
  GET    /auth/me

/users            (super_admin only)
  GET/POST/PATCH  /users
  GET             /users/:id/sessions
  DELETE          /users/:id/sessions/:sessionId

/dashboard
  GET   /dashboard/summary        (ตัวเลขสรุป, ปรับตาม role)
  GET   /dashboard/agenda         (today/7d/30d)

/properties
  GET/POST/PATCH/DELETE  /properties
  POST  /properties/:id/images
  POST  /properties/:id/request-publish
  POST  /properties/:id/approve
  POST  /properties/:id/reject
  PATCH /properties/:id/status
  POST  /properties/:id/star

/property-requests
  GET/POST/PATCH  /property-requests
  POST  /property-requests/:id/review

/owners
  GET/POST/PATCH/DELETE  /owners
  GET   /owners/:id/national-id   (super_admin only, log audit ทุกครั้ง)

/leads
  GET/POST/PATCH  /leads
  POST  /leads/from-public-form   (public endpoint, ไม่ต้อง auth)

/appointments
  GET/POST/PATCH  /appointments
  POST  /appointments/:id/cancel
  POST  /appointments/:id/complete

/customers
  GET/POST/PATCH/DELETE  /customers
  GET   /customers/:id/national-id

/contracts
  GET/POST/PATCH  /contracts
  POST  /contracts/:id/sign
  POST  /contracts/:id/issue-receipt
  POST  /contracts/:id/renew
  POST  /contracts/:id/close

/documents
  POST  /documents                (upload, ต้องมี entity_type+entity_id)
  POST  /documents/:id/versions
  POST  /documents/:id/verify
  GET   /documents/:id/download

/notifications
  GET   /notifications
  POST  /notifications/:id/read
  POST  /notifications/read-all
  GET/PATCH  /notifications/preferences

/audit
  GET   /audit/logs        (super_admin เต็ม, property_manager จำกัด scope)
  GET   /audit/export

/public   (สำหรับ route group (public) เรียก — ไม่ต้อง auth)
  GET   /public/properties
  GET   /public/properties/:id
  POST  /public/appointments    (= สร้าง lead + appointment พร้อมกัน)
```

> เส้นทางทั้งหมดข้างบนอยู่ภายใต้ `app/api/` เดียวกัน ไม่ได้แยก deploy — route ที่ไม่ได้อยู่ใต้ `/public/*` ถือว่าต้อง auth เป็น default เสมอ (default-deny) และยังต้องเช็ค `requirePermission()` ตาม policy ในหัวข้อ 3.2 ทุก endpoint แม้ว่า middleware จะกันชั้นนอกไว้แล้วก็ตาม

---

## 7. โครงสร้างโฟลเดอร์ที่แนะนำ (Next.js app เดียว)

```
repo/
├── app/
│   ├── (public)/                   ← route group: ลูกค้า ไม่ต้อง login
│   │   ├── layout.tsx
│   │   ├── page.tsx                 (หน้าแรก)
│   │   ├── properties/
│   │   │   ├── page.tsx             (listing)
│   │   │   └── [id]/page.tsx        (รายละเอียดทรัพย์)
│   │   └── book/page.tsx            (ฟอร์มนัดดู)
│   │
│   ├── (admin)/                     ← route group: พนักงาน ผ่าน protected route
│   │   ├── layout.tsx               (เช็ค session ซ้ำอีกชั้น + เมนูตาม role)
│   │   ├── admin/
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── properties/...
│   │   │   ├── property-requests/...
│   │   │   ├── owners/...
│   │   │   ├── leads/...
│   │   │   ├── appointments/...
│   │   │   ├── customers/...
│   │   │   ├── contracts/...
│   │   │   ├── documents/...
│   │   │   ├── users/...            (super_admin เท่านั้น)
│   │   │   └── audit/...
│   │
│   ├── api/                         ← Route Handlers, Node.js runtime
│   │   ├── auth/
│   │   ├── users/
│   │   ├── properties/
│   │   ├── property-requests/
│   │   ├── owners/
│   │   ├── leads/
│   │   ├── appointments/
│   │   ├── customers/
│   │   ├── contracts/
│   │   ├── documents/
│   │   ├── notifications/
│   │   ├── audit/
│   │   ├── cron/                    (endpoint ที่ Vercel Cron ยิงเข้ามา)
│   │   └── public/                  (endpoint แบบไม่ auth: leads/appointments จากฝั่ง public)
│   │
│   └── middleware.ts                ← guard ทุก request เข้า /admin/* (เช็ค Supabase JWT + role)
│
├── components/
│   ├── public/                      (UI เฉพาะฝั่งลูกค้า)
│   └── admin/                       (UI เฉพาะฝั่งพนักงาน — ไม่ import เข้าฝั่ง public)
│
├── lib/
│   ├── auth/                        (helper ตรวจ Supabase JWT, getServerSession)
│   ├── policies/                    (permissions.config.ts)
│   ├── guards/                      (requirePermission(), maskFields())
│   ├── audit/                       (writeAuditLog helper)
│   └── prisma/
│       └── schema.prisma
│
├── supabase/
│   ├── migrations/                  (RLS policies, exclusion constraint, extensions)
│   └── config.toml
└── vercel.json                      (1 project เดียว)
```

> ไม่ต้องมี `packages/shared-types` แยกแล้ว เพราะ type ระหว่าง UI กับ API อยู่ใน repo เดียวกัน import ตรงได้เลย

---

## 8. ลำดับการ implement ที่แนะนำ (milestone)

1. **Foundation** — สร้าง Next.js project เดียว, สร้าง Supabase project, ตั้ง connection pooler, Prisma schema เต็ม, migration (RLS + extensions), เชื่อม Supabase Auth เข้ากับ `profiles` table (role/team_id), ตั้ง route group `(public)`/`(admin)` เปล่าๆ + `middleware.ts` เช็ค session เบื้องต้น
2. **RBAC core** — permissions.config, requirePermission() helper, field masking helper, audit log helper (ทำก่อนโมดูลอื่น เพราะทุกโมดูลต้องใช้) รวมถึงทดสอบว่า middleware บล็อก `/admin/*` จริงสำหรับ role ที่ไม่ควรเข้าได้
3. **Users + Dashboard** — จัดการผู้ใช้ + แดชบอร์ดตาม role
4. **Properties + Property Requests** — รวม state machine (draft→pending→available) + amenities
5. **Owners** — พร้อม field masking + encryption เลขบัตร
6. **Leads + Appointments** — รวม conflict-check logic
7. **Customers + Contracts** — รวม sign/receipt gate เฉพาะ super_admin
8. **Documents** — upload, versioning, verify, link constraint
9. **Notifications** — Vercel Cron ยิง `/api/cron/*` ตามรอบ, multi-channel (in-app/LINE/email)
10. **Audit/Activity logs** — ให้ครอบทุกโมดูลก่อนหน้า (retrofit helper เข้าไปทุก write endpoint)
11. **Admin UI** — ทำใน `app/(admin)/admin/*` ตาม role-based menu
12. **Public UI** — ทำใน `app/(public)/*` property listing (อ่านตรงผ่าน `supabase-js` + RLS) + booking form → เชื่อม `/api/public/*` endpoints
13. **Deploy** — push ขึ้น Vercel project เดียว, ตั้ง custom domain, เช็ค `robots.txt` กัน index route `/admin`

---

## 9. Non-functional requirements

- **Encryption:** เลขบัตรประชาชนเข้ารหัสที่ app layer (AES-256-GCM) ก่อนเก็บ DB หรือใช้ `pgcrypto` extension ของ Postgres (`pgp_sym_encrypt`/`decrypt`) ก็ได้เพราะ Supabase เปิดใช้ extension นี้ได้ในตัว — decrypt เฉพาะตอน super_admin ขอดูเต็ม
- **Connection pooling:** Prisma ต้องต่อ Supabase ผ่าน **pooler connection string (port 6543, pgbouncer, transaction mode)** ไม่ใช่ direct connection (port 5432) เพราะ serverless function เปิด connection ใหม่ทุก invocation — ถ้าต่อ direct จะชน connection limit เร็วมาก ใช้ direct connection เฉพาะตอนรัน migration เท่านั้น
- **RLS เป็น defense-in-depth:** เปิด Row Level Security ทุกตารางใน Supabase แม้ว่า `api` จะเป็นด่านหลักอยู่แล้ว โดยเฉพาะตารางที่ `web-public` อ่านตรง (เช่น `properties` ให้อ่านได้เฉพาะ `status = 'available'`)
- **Rate limiting:** โดยเฉพาะ `/api/public/*` endpoints (กัน spam lead/appointment) — ใช้ Vercel middleware หรือ Upstash Rate Limit (serverless-friendly)
- **File validation:** จำกัดชนิดไฟล์/ขนาดตอน upload เข้า Supabase Storage, ตั้ง bucket policy แยก public (รูปทรัพย์) กับ private (เอกสารอ่อนไหว เช่น โฉนด/บัตรประชาชน)
- **i18n:** รองรับ ไทย/อังกฤษ ทั้ง property listing และ UI (ตาม `language` ของ user)
- **SEO isolation:** `app/(admin)` layout ต้องใส่ `export const metadata = { robots: { index: false, follow: false } }` และเพิ่ม `Disallow: /admin` ใน `robots.txt` เพื่อกันไม่ให้ search engine เก็บ index หน้าแอดมิน
- **Bundle isolation:** ห้าม import component จาก `components/admin/*` เข้ามาใช้ใน `app/(public)/*` (และกลับกัน) เพื่อให้ Next.js code-split แยก bundle กันจริง แม้จะ deploy รวม app เดียว
- **Testing:** unit test ให้ policy/RBAC logic และ business rules ในตาราง section 5 เป็นอันดับแรก (จุดเสี่ยงสุด) และเพิ่ม integration test ยืนยันว่า middleware บล็อกผู้ใช้ไม่ login หรือ role ไม่พอ ไม่ให้เข้า `/admin/*` ได้จริง

---

## 10. หมายเหตุสำหรับ Claude Code

- เริ่มจาก milestone 1-2 ก่อนเสมอ เพราะทุกโมดูลพึ่งพา RBAC core
- ทุก endpoint ที่แก้ไข sensitive data (owners, customers, users) ต้องเช็คว่ามี audit log helper ครอบหรือยังก่อน merge
- ห้าม trust `role` หรือ field-visibility ใดๆ ที่ส่งมาจาก client — ต้อง derive จาก Supabase JWT ที่ `api` verify เองเท่านั้น
- เขียน seed script (Prisma seed) สร้าง user ตัวอย่างครบ 3 role ไว้ตั้งแต่ milestone 1 เพื่อทดสอบ RBAC ได้ทันที
- ตั้งค่า environment variable ใน Vercel project เดียว โดยแยกชัดเจนว่าตัวไหนใช้ได้ที่ server-side เท่านั้น: `DATABASE_URL` แบบ pooler, `SUPABASE_SERVICE_ROLE_KEY` **ห้ามมี prefix `NEXT_PUBLIC_` เด็ดขาด** เพราะจะถูกฝังลง client bundle ทันที ส่วน `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY` เท่านั้นที่ปลอดภัยจะ expose ให้ client ใช้ (คู่กับ RLS)
- ทุก migration ที่แตะ RLS policy ต้องมี test ยืนยันว่า role ที่ไม่ควรเข้าถึงได้ ถูกบล็อกจริงที่ระดับ DB ไม่ใช่แค่ที่ API layer
- เพราะรวมเป็น app เดียวแล้ว **ทุก PR ที่เพิ่ม route ใหม่ใน `app/(admin)/*` หรือ `app/api/*`** ต้องเช็ค checklist สั้นๆ ก่อน merge: (1) อยู่ใน route group ที่ถูกต้อง (2) มี `requirePermission()` เรียกใน route handler จริง ไม่ใช่พึ่ง middleware อย่างเดียว (3) ไม่ import component ข้าม `admin`/`public`