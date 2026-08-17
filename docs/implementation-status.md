# Implementation status

## ผลตรวจล่าสุด

```
npx tsc --noEmit     → ผ่าน
npx vitest run       → 61 passed (6 files) — รวม integration กับ Supabase local จริง
npx next build       → ผ่าน
npm audit            → 0 vulnerabilities
```

### ยืนยันครบวงกับ Supabase local แล้ว (ไม่ใช่แค่ build ผ่าน)

| ตรวจอะไร | ผล |
|---|---|
| `npm run db:setup` (migrate → policies → seed) | ✅ ผ่านทั้งสามขั้น |
| FK `profiles.id` → `auth.users.id` | ✅ สร้างจริง — บล็อก fixture ปลอมใน test ด้วย |
| Storage bucket | ✅ `property-images` (public) · `documents` (private) |
| RLS | ✅ เปิดครบ 26/26 ตาราง |
| login 3 บทบาท | ✅ ได้ session + permission ต่างกันตาม role (14 / 12 / 10 resource) |
| เมนูตามบทบาท | ✅ เซลไม่เห็น Users/Settings/Activity/Community · เห็น "Request property" แทน |
| RBAC ที่ API | ✅ เซลเรียก `GET /api/users` → 403 · เจ้าของ → 200 (3 users) |
| สลับภาษา | ✅ EN ↔ TH ทั้ง shell และเมนู (cookie `NEXT_LOCALE`) |
| RLS ผ่าน anon key จริง | ✅ เห็นเฉพาะทรัพย์ `available` · อ่าน `owners` → `permission denied` |
| logout | ✅ 204 → เข้า `/admin/*` เด้ง 307 · `user_sessions` ขึ้น `revoked` |
| audit log | ✅ ระบบเขียนเอง: `auth.login.success` ×3 · `auth.logout` พร้อม role/ip |

ทั้งหมดรันบน Supabase local (`npx supabase start`) ไม่ต้องมี cloud project

**บั๊กที่เจอระหว่างยืนยัน (แก้แล้ว):** `supabase/config.toml` ตั้ง `[auth.email] enable_signup = false`
ซึ่งไม่ได้แปลว่า "ห้ามสมัครเอง" แต่แปลว่า **ปิด provider อีเมลทั้งตัว** → login ด้วยรหัสผ่านพังหมด
(GoTrue ตอบ `email_provider_disabled`) · การกันสมัครเองต้องใช้ `[auth] enable_signup = false` แทน

---

## เทียบกับ milestone ใน spec

| # | Milestone | สถานะ |
|---|---|---|
| 1 | Foundation | ✅ เสร็จ + ยืนยันกับ Supabase จริงแล้ว |
| 2 | RBAC core | ✅ เสร็จ + ยืนยันแล้ว |
| 3 | Users + Dashboard | 🟡 Users API เสร็จ / Dashboard เป็น placeholder |
| 4 | Properties + Property Requests | ⬜ ยังไม่เริ่ม |
| 5 | Owners | ⬜ ยังไม่เริ่ม |
| 6 | Leads + Appointments | 🟡 constraint กันนัดชนพร้อมแล้วที่ DB / endpoint ยังไม่มี |
| 7 | Customers + Contracts | ⬜ ยังไม่เริ่ม |
| 8 | Documents | 🟡 constraint ห้ามเอกสารลอยพร้อมแล้ว / endpoint ยังไม่มี |
| 9 | Notifications | ⬜ ยังไม่เริ่ม (ตาราง + cron schedule ตั้งไว้แล้ว) |
| 10 | Audit/Activity logs | ✅ helper + DB guard เสร็จ (ต้อง retrofit เข้าโมดูลใหม่ทุกตัว) |
| 11 | Admin UI | 🟡 design system + shell ครบ / หน้าจอจริงยังไม่มี |
| 12 | Public UI | 🟡 layout + token + PropertyCard / หน้า listing-detail ยังไม่มี |
| 13 | Deploy | ⬜ ยังไม่ deploy (`vercel.json` + cron ตั้งไว้แล้ว) |

---

## Design system (พอร์ตจากระบบเดิม)

| ส่วน | สถานะ |
|---|---|
| token 2 ชุด (admin gold / ลูกค้า ขาว-ดำ) + dark mode | ✅ |
| i18n EN/TH (959 key × 2) cookie-based | ✅ |
| `ui.tsx` 26 primitive | ✅ |
| `Icon` 37 ตัว · hooks 5 ตัว · Toast · PriceRange · toggles | ✅ |
| shell: sidebar ยุบ-กาง · drawer · แถบล่าง IG · idle logout · PullToRefresh | ✅ |
| `GlobalSearch` · `NotificationBell` · badge คำขอ | ⬜ รอ endpoint |
| ฝั่งลูกค้า: `PropertyCard` · `ScrollReveal` · icons | ✅ |
| ฝั่งลูกค้า: อีก 11 component + 10 หน้า | ⬜ |

รายละเอียดเต็มอยู่ใน [ui-port-plan.md](ui-port-plan.md)

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
PATCH  /api/users/:id                        (super_admin — บังคับกติกา role + revoke session)
GET    /api/users/:id/sessions               (super_admin — รายการอุปกรณ์ + ตัวที่ใช้อยู่)
DELETE /api/users/:id/sessions               (super_admin — ออกจากระบบทุกอุปกรณ์)
DELETE /api/users/:id/sessions/:sessionId    (super_admin — ถอนทีละเครื่อง)
```

---

## business rule ที่บังคับได้จริงแล้ว

| กติกา | บังคับที่ | ทดสอบที่ |
|---|---|---|
| นัดหมายห้ามชนกัน | DB exclusion constraint | `tests/db-rules.test.ts` (7 เคส) |
| เซ็น/ออกใบเสร็จเฉพาะเจ้าของ | policy table | `tests/permissions.test.ts` |
| ห้ามแก้ role ตัวเอง / ตั้ง role สูงกว่าตัวเอง | `canAssignRole()` + guard | `tests/permissions.test.ts` |
| suspend/เปลี่ยน role → เด้งออกทุกเครื่อง | `revokeAllSessions()` 3 ชั้น | ยืนยันผ่าน logout flow จริง |
| `audit_logs` ห้าม update/delete | DB trigger (แม้ table owner ก็ทำไม่ได้) | `tests/db-rules.test.ts` (5 เคส) |
| เอกสารต้องมี link ≥ 1 | deferred constraint trigger | `tests/db-rules.test.ts` (4 เคส) |
| RLS: anon เห็นเฉพาะทรัพย์ available | RLS + GRANT | `tests/db-rules.test.ts` + ยิง anon key จริง |
| middleware default-deny ฝั่ง admin | `middleware.ts` | `tests/middleware.test.ts` (11 เคส) |

**ยังไม่ได้ implement** (รอโมดูลของมัน): completeness gate 7/7 · เด้งกลับ pending_review เมื่อแก้ทรัพย์ที่เผยแพร่แล้ว ·
ต้องมีเอกสาร verified ก่อนเซ็น · แจ้งเจ้าของเมื่อผู้จัดการแก้ข้อมูล · ลบ owner/customer ได้เมื่อไม่มีอะไรผูก

---

## ทำต่อจากนี้

1. **milestone 4 — Properties** (แม่แบบของทุกหน้า): endpoint CRUD + state machine
   `draft → pending_review → available → rented` + completeness gate + หน้า list/detail/form
2. milestone 5 — Owners + field masking + แจ้งเตือน diff
3. milestone 6 — Appointments endpoint (constraint พร้อมแล้ว · `toErrorResponse()` map เป็น 409 ให้แล้ว)
4. ฝั่งลูกค้า: `/api/public/properties` + หน้า listing/detail + ฟอร์มนัดชม

ทุก PR ที่เพิ่ม route ใหม่ ให้เช็ค: (1) อยู่ใน route group ที่ถูก (2) เรียก `withPermission()` จริง
ไม่ใช่พึ่ง middleware (3) ไม่ import component ข้าม `admin`/`public`
