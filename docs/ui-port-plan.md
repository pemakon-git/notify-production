# แผนพอร์ต UI จากระบบเดิม (ROS / Notify)

> อ่านครบแล้วจาก `C:\Users\User\Desktop\--recover-redesign-v2` — เอกสารนี้คือ inventory จริง
> ของสิ่งที่มีอยู่ เทียบกับที่พอร์ตเข้ามาแล้ว และลำดับงานที่เหลือ

## แหล่งอ้างอิง

| ไฟล์ | ได้อะไร |
|---|---|
| `DESIGN-SYSTEM.md` | กฎที่เจ้าของล็อกไว้ 13 หมวด (typography/spacing/radius/shadow/icon/color/date/layout) |
| `SESSION-HANDOVER.md` | สถานะจริง + การตัดสินใจสะสมทุก session (สำคัญกว่าโค้ด) |
| `tailwind.preset.cjs` | token กลาง (admin) |
| `apps/web-admin/` | UI ฝั่งพนักงาน — functional ~100% |
| `apps/web-v2/` | UI ฝั่งลูกค้า — pixel-clone Findit STAGE1 เสร็จ 100% |

---

## ข้อเท็จจริงที่เปลี่ยนการตัดสินใจ (เจอตอนอ่านครบ)

1. **แบรนด์ = "Notify"** — wordmark ล้วน ไม่มีโลโก้กล่อง (ยุบ sidebar = "N")
   → ที่ผมใส่ไว้ตอนนี้เป็น "ทรัพย์ให้เช่า" **ผิด ต้องแก้**

2. **ฝั่งลูกค้ายังเป็นภาษาอังกฤษโดยเจตนา** — STAGE1 = โคลน Findit ให้ตรงก่อน (เนื้อหาอังกฤษ)
   → STAGE2 สลับเป็น Notify 5 เสา (อังกฤษ) → STAGE3 ค่อยไทย
   nav ที่เคาะไว้: `Home · Properties · Services · Network · About · [Contact] [ฝากทรัพย์]`
   → nav ที่ผมเดาไว้ (ทรัพย์ให้เช่า/เกี่ยวกับเรา/ติดต่อ) **ผิด ต้องแก้**

3. **5 เสาธุรกิจ** (เข็มทิศฝั่งลูกค้า): TRANSACTION (ซื้อ/ขาย/เช่า) · **SERVICE (Property Management = พระเอก)** ·
   ACQUISITION (ฝากทรัพย์) · NETWORK (agent/partner) · INVESTMENT
   → ยืนยันว่าระบบ**ไม่ใช่เช่าล้วน** มีขายด้วย ซึ่งขัดกับ schema ปัจจุบันที่มีแค่ `rent_price`

4. **i18n เสร็จสมบูรณ์แล้ว** — `next-intl` cookie-based, **default = EN**, toggle ไทย
   103 KB × 2 ภาษา ครอบทุกอย่างรวม string ที่ backend สร้าง (activity/notification เป็น key+params)
   28 namespace: `nav navGroup slot shell dashboard status common propertyType leadSource properties
   furnished propertyDetail propertyForm time docType docStatus documents search notif activity
   owners leads appts customers contracts propReq settings community users audit`

5. **สถานะทรัพย์จริงมี `rented`** และมี flag `contentDirty` (แก้เนื้อหาตอน rented → กลับ available
   ต้องเด้ง pending_review ใหม่) → schema ของเราใช้ `unavailable` ต้องเลือกว่าจะตามอันไหน

6. **กติกาที่เจ้าของล็อก** (ตรงกับ spec แต่ละเอียดกว่า): money-gate · maker-checker
   (เซลขอ → ผจก.ลง → เจ้าของอนุมัติ) · completeness gate 7/7 · 3-tier edit governance (log→notify→re-approve)

---

## Inventory: `ui.tsx` (1,025 บรรทัด · 27 export)

| # | Component | สถานะ | หมายเหตุ |
|---|---|---|---|
| 1 | `PAGE_SIZE` | ✅ พอร์ตแล้ว | 8 แถว/หน้า ทุกตาราง |
| 2 | `SectionLabel` | ✅ | |
| 3 | `PageHeader` | ⚠️ พอร์ตแล้วแต่ไม่ตรง | ของจริงมี `count` และ title `text-xl sm:text-2xl` (ผมใช้ 2xl/3xl) |
| 4 | `StatusBadge` | ⚠️ | ของจริงรับ `map`+`value` แล้วแปลผ่าน `t()` |
| 5 | `Spinner` | ✅ | |
| 6 | `ProgressBar` | ✅ | |
| 7 | `EmptyState` | ⚠️ | ของจริงมีวงกลมไอคอนทองจาง + `emptyAction` |
| 8 | `InfoRow` | ⚠️ | ขาด `href`/`onClick`/`icon`/`hideChevron` + สถานะ interactive |
| 9 | `RailBlock` | ✅ | |
| 10 | `InfoGroup` | ⚠️ | ของจริงเป็น `<section>` + `overflow-hidden` + `pb-1` เมื่อไม่มี footer |
| 11 | `SectionNav` | ❌ | แถบกระโดด section (sticky top-16) |
| 12 | `ListSkeleton` | ❌ | |
| 13 | `ErrorState` | ❌ | + ปุ่มลองใหม่ |
| 14 | `SectionTabs` | ⛔ ไม่ต้องพอร์ต | §12 ระบุ "เลิก SectionTabs" แล้ว |
| 15 | **`DetailHeader`** | ❌ | Direction A "แคปชั่นเดียว" — ชื่อ+ราคาทอง / แคปชั่นจาง (จุดสถานะ·subtitle·รหัส mono) |
| 16 | `ActionBar` | ❌ | |
| 17 | `MoreMenu` | ❌ | portal + flip + fixed position |
| 18 | `Pagination` | ❌ | |
| 19 | `Avatar` | ❌ | |
| 20 | **`Modal`** | ❌ | portal · focus trap · scroll lock · `confirmOnClose` · size lg/xl |
| 21 | `ConfirmDialog` | ❌ | + `withReason`/`reasonRequired` |
| 22 | `Field` | ❌ | label + error + hint |
| 23 | **`Combobox`** | ❌ | ค้นหาได้ · server-search · label cache · fixed+flip |
| 24 | `PhoneLink` | ❌ | |
| 25 | `Segmented` | ❌ | edge-fade · scroll-snap · เลื่อน active เข้าจอ |
| 26 | **`FilterBar`** | ❌ | search + filters + sort + range · inline (≥lg) / modal (<lg) |
| 27 | **`ListView` + `Col`** | ❌ | grid+subgrid (เดสก์ท็อป) / การ์ด (สัมผัส) |

**พอร์ตแล้ว 10/27 · ตรงเป๊ะ 4 · ต้องแก้ให้ตรง 6 · ยังไม่มี 16**

## Inventory: component อื่น (14 ไฟล์ · พอร์ต 0)

| ไฟล์ | บรรทัด | จำเป็นตอนไหน |
|---|---|---|
| `Icon.tsx` | — | **ทันที** (ดีไซน์ห้ามใช้อิโมจิ · ui.tsx เรียกทุกที่) |
| `Toast.tsx` | 63 | **ทันที** (ToastProvider ครอบทั้ง shell) |
| `PriceRange.tsx` | 93 | คู่กับ FilterBar |
| `SidebarAccount.tsx` | 81 | shell |
| `ThemeToggle.tsx` | — | shell (dark mode token พร้อมแล้ว) |
| `LanguageToggle.tsx` | — | shell (คู่กับ i18n) |
| `PullToRefresh.tsx` | — | shell มือถือ |
| `GlobalSearch.tsx` | 192 | shell (role-aware · ขับจาก nav เดียวกัน) |
| `NotificationBell.tsx` | 260 | shell (action-first: "ต้องคุณทำ" → "อัปเดต") |
| `ActivityTimeline.tsx` | 74 | หน้า property detail |
| `Lightbox.tsx` | — | แกลเลอรีรูปทรัพย์ |
| `DocumentSection.tsx` | 219 | milestone 8 |
| `PropertyForm.tsx` | 302 | milestone 4 (wizard 4 step) |
| `QuickAddProperty.tsx` | 144 | ⛔ dead code (ไม่มีที่ import) |

## Inventory: hooks (5 ไฟล์ · พอร์ต 0)

`useDebounce`(13) · `useScrollLock`(52 · iOS-proof + ref-count) · `useFocusTrap`(34) ·
`useList`(52 · state ของทุกหน้า list) · `useSwipe`(29)

## Inventory: shell `(app)/layout.tsx` (372 บรรทัด)

ที่ผมทำไว้ตอนนี้มีแค่ sidebar คงที่ + header เปล่า **ของจริงมี:**

- Sidebar **ยุบ-กางได้** 232px ↔ 64px จำสถานะใน localStorage + ป้ายกลุ่ม + tooltip ตอนยุบ
- Brand wordmark "Notify" / "N"
- badge จำนวนคำขอทรัพย์รอตรวจบนเมนู
- `SidebarAccount` popover ล่างสุด (แบบ Linear/Slack)
- แถบล่างมือถือ **5 ช่อง** ลอยกลาง · หุบตอนเลื่อนลงแบบ IG · **ซ่อนตอนคีย์บอร์ดเด้ง** (แก้บั๊ก iOS)
- Drawer โปรไฟล์มือถือ (เมนูที่ไม่อยู่บนแถบล่าง + ThemeToggle + LanguageToggle + ออกจากระบบ)
- Header: ปุ่ม + เพิ่มทรัพย์ (มือถือ) · `GlobalSearch` · `NotificationBell`
- **auto-logout 30 นาที** + เตือนล่วงหน้า 60 วิ พร้อมนับถอยหลัง + ปุ่ม "อยู่ต่อ"
- `PullToRefresh` · `ToastProvider` · skip-to-main (a11y) · `key={pathname}` ให้ fade ทุกครั้งที่เปลี่ยนหน้า

## Inventory: หน้าจอ (พอร์ต 0)

**web-admin 20 หน้า:** dashboard · properties (list/detail/new/edit) · property-requests (list/detail) ·
owners (list/detail) · leads (list/detail) · appointments (list/detail) · calendar · customers (list/detail) ·
contracts (list/detail) · users · audit · notifications · settings · community · search · login

**web-v2 10 route:** `/` (Home 9 section) · `/property` · `/property/[slug]` · `/agent` · `/about` ·
`/contact` · `/add-property` · `/blog` · `/blog/[slug]` + Nav/Footer
component: `Nav Footer FeaturedCard PropertyCard FreshListings FreshSection AboutBenefits
Testimonials StatsBand FaqAccordion FaqSection ArticleCard ScrollReveal icons`

---

## ลำดับงานที่เสนอ

### ✅ รอบ 1 — รากฐานที่ทุกหน้าพึ่ง (เสร็จแล้ว)
1. ✅ **i18n** — `messages/{en,th}.json` (959 key × 2) + `next-intl` cookie-based default EN
2. ✅ **`Icon.tsx`** (37 ไอคอน) + hooks 5 ตัว (`use-debounce` `use-scroll-lock` `use-focus-trap` `use-swipe` `use-list`)
3. ✅ **`ui.tsx` ครบ 26 ตัว** — ยกของจริงมาทั้งไฟล์ ปรับ import + strict mode (ตัด `SectionTabs` ตาม §12)
4. ✅ **`Toast`** + `PriceRange` + `ThemeToggle` + `LanguageToggle` (มีโหมด compact สำหรับ header)
5. ✅ **data model** ปรับตามระบบเดิมทั้งชุด (enum/field/โมเดลที่ขาด) + migration + policies.sql ใหม่

### ✅ รอบ 2 — shell ฝั่งพนักงาน (เสร็จแล้ว)

[components/admin/admin-shell.tsx](../components/admin/admin-shell.tsx) ครอบทั้งหมด:

- ✅ Sidebar **ยุบ-กางได้** 232px ↔ 64px · จำสถานะใน localStorage · ป้ายกลุ่ม + tooltip ตอนยุบ
- ✅ แบรนด์ wordmark **"Notify"** / ยุบ = "N"
- ✅ ไอคอนครบทุกเมนู — §5 icon size: ราง 19 (กาง) / 22 (ยุบ) · แถบล่าง 24 · drawer 18
- ✅ `SidebarAccount` popover ล่างสุด (อีเมล · ภาษา · ธีม · ออกจากระบบ) + `translate="no"`
- ✅ แถบล่างมือถือ **ไอคอนล้วน 5 ช่อง** ลอยกลาง · หุบตอนเลื่อนลงแบบ IG · **ซ่อนตอนคีย์บอร์ดเด้ง** (บั๊ก iOS)
- ✅ Drawer โปรไฟล์มือถือ — เมนูที่ไม่อยู่บนแถบล่าง + ThemeToggle + LanguageToggle + ออกจากระบบ
  (focus trap + scroll lock)
- ✅ **auto-logout 30 นาที** + เตือนล่วงหน้า 60 วิ นับถอยหลัง + ปุ่ม "อยู่ต่อ"
- ✅ `PullToRefresh` (ยิง event `app:refresh` ให้ `useList` โหลดใหม่)
- ✅ skip-to-main (a11y) · `key={pathname}` fade ทุกครั้งที่เปลี่ยนหน้า · `max-w-5xl` คุมที่ shell เดียว

**ยังไม่ได้พอร์ต** (ต้องมี endpoint ก่อน): `GlobalSearch` · `NotificationBell` · badge คำขอรอตรวจ

### รอบ 3 — ฝั่งลูกค้า (web-v2)
Nav/Footer ตาม 5 เสา · PropertyCard · หน้า Home 9 section · property list/detail

### รอบ 4 เป็นต้นไป — ทีละหน้าตาม §13 ("ทำทีละหน้า จบแล้วหยุด")
ไล่ตาม milestone ของ spec: properties → owners → leads/appointments → customers/contracts → documents

---

## เรื่องที่ต้องให้เจ้าของเคาะก่อน

1. **ขาย+เช่า หรือ เช่าล้วน** — 5 เสามี TRANSACTION (ซื้อ/ขาย/เช่า) และ SERVICE (Property Management)
   แต่ schema ปัจจุบันรองรับเช่าอย่างเดียว (`rent_price`, `deposit_months`, สัญญาเช่า)
2. **สถานะทรัพย์** — ตาม spec (`unavailable`) หรือตามระบบเดิม (`rented` + `contentDirty`)
3. **ฝั่งลูกค้าเอาภาษาอะไรก่อน** — ระบบเดิมค้างที่ STAGE1 (อังกฤษ/เนื้อหา Findit)
   จะข้ามไป STAGE2 (Notify 5 เสา อังกฤษ) เลย หรือทำไทยเลย
4. **โมดูลที่ไม่มีใน spec แต่มีในระบบเดิม** — `calendar` · `community` (กระดานชุมชน) ·
   `blog` · `agent` (โปรไฟล์สาธารณะ) — เอาด้วยไหม
