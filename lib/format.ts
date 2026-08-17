/**
 * มาตรฐานรูปแบบ วันที่ / เวลา / เบอร์ / เงิน — **source เดียวของทั้งแอป**
 * ยกมาจากระบบดีไซน์เดิม (DESIGN-SYSTEM.md §7 — เจ้าของล็อกไว้)
 *
 * ⛔ ห้ามเขียน fmtDate/toLocaleDateString ในไฟล์หน้าเอง — เคยมีคนซ่อน fmtDate ปีเต็ม
 *    ไว้ในหน้า leads/contracts แล้วบายพาสมาตรฐาน ต้องเรียกจากที่นี่เท่านั้น
 *
 * กฎที่ล็อกไว้:
 *   - วันที่ = สากล ปี 2 หลัก "14 Jul 26" (แบบ Linear/Stripe/Vercel)
 *   - ❌ ห้าม พ.ศ. / เดือนไทย / "น." / DD/MM/YY (กำกวม)
 *   - locale en-GB (วัน-เดือน-ปี) · hour12:false (24 ชม.)
 *   - ยกเว้น: ใบเสร็จ PDF คงไทย/พ.ศ. (เอกสารทางการ) · คำสัมพัทธ์ (ชม.ที่แล้ว) ไทยได้
 *   - เลข/บาท ใช้ th-TH ได้ (คอมมา)
 */

// ── เบอร์โทร ────────────────────────────────────────────────────────────────

/** จัดรูปเบอร์ไทยขณะพิมพ์ → 08x-xxx-xxxx (สูงสุด 10 หลัก) */
export function formatPhone(input: string): string {
  const digits = input.replace(/\D/g, '').slice(0, 10);

  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;

  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
}

/** ตัวเลขล้วนของเบอร์ (สำหรับส่ง API / เทียบค่า) */
export function phoneDigits(input: string): string {
  return input.replace(/\D/g, '');
}

// ── วันที่ / เวลา ───────────────────────────────────────────────────────────

const LOCALE = 'en-GB';
const DATE = { day: 'numeric', month: 'short', year: '2-digit' } as const; // 14 Jul 26
const DATE_SHORT = { day: 'numeric', month: 'short' } as const; // 14 Jul
const TIME = { hour: '2-digit', minute: '2-digit', hour12: false } as const; // 09:00

function parse(iso?: string | Date | null): Date | null {
  if (!iso) return null;

  const date = iso instanceof Date ? iso : new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** "14 Jul 26" — รูปแบบหลักของระบบ */
export function fmtDate(iso?: string | Date | null): string {
  const date = parse(iso);
  return date ? date.toLocaleDateString(LOCALE, DATE) : '';
}

/** "14 Jul" — ไม่มีปี ใช้ใน agenda/แจ้งเตือนที่พื้นที่แคบ */
export function fmtDateShort(iso?: string | Date | null): string {
  const date = parse(iso);
  return date ? date.toLocaleDateString(LOCALE, DATE_SHORT) : '';
}

/** "Tue 14 Jul 26" — หัวนัดหมาย (วันในสัปดาห์สำคัญต่อการนัด) */
export function fmtWeekdayDate(iso?: string | Date | null): string {
  const date = parse(iso);
  if (!date) return '';

  return `${date.toLocaleDateString(LOCALE, { weekday: 'short' })} ${date.toLocaleDateString(LOCALE, DATE)}`;
}

/** "09:00" (24 ชม.) */
export function fmtTime(iso?: string | Date | null): string {
  const date = parse(iso);
  return date ? date.toLocaleTimeString(LOCALE, TIME) : '';
}

/** "14 Jul 26 · 09:00" — วัน → เวลา */
export function fmtDateTime(iso?: string | Date | null): string {
  const date = parse(iso);
  if (!date) return '';

  return `${date.toLocaleDateString(LOCALE, DATE)} · ${date.toLocaleTimeString(LOCALE, TIME)}`;
}

/** "09:00–09:30" จากเวลาเริ่ม + ระยะเวลานาที · ไม่ส่ง duration = คืนเวลาเริ่มอย่างเดียว */
export function fmtTimeRange(iso?: string | Date | null, durationMin?: number): string {
  const date = parse(iso);
  if (!date) return '';

  const start = date.toLocaleTimeString(LOCALE, TIME);
  if (!durationMin) return start;

  const end = new Date(date.getTime() + durationMin * 60_000).toLocaleTimeString(LOCALE, TIME);
  return `${start}–${end}`;
}

/**
 * อดีตแบบสัมพัทธ์ "เมื่อสักครู่" / "5 นาทีที่แล้ว" / "3 ชม.ที่แล้ว" / "เมื่อวาน"
 * เกิน 7 วัน → คืนวันที่เต็ม · ใช้กับ feed/แจ้งเตือน/audit ที่ความสดสำคัญกว่าวันเป๊ะ
 */
export function fmtRelative(iso?: string | Date | null): string {
  const date = parse(iso);
  if (!date) return '';

  const seconds = Math.round((Date.now() - date.getTime()) / 1000);
  if (seconds < 45) return 'เมื่อสักครู่';

  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} นาทีที่แล้ว`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} ชม.ที่แล้ว`;

  const days = Math.round(hours / 24);
  if (days === 1) return 'เมื่อวาน';
  if (days < 7) return `${days} วันที่แล้ว`;

  return fmtDate(iso);
}

/**
 * อนาคตแบบนับถอยหลัง "อีก 5 นาที" / "อีก 2 ชม." / "พรุ่งนี้" / "อีก 3 วัน"
 * ใช้เป็น urgency hint ของนัด/สัญญาใกล้ครบ (คู่กับ fmtRelative ที่ทำเฉพาะอดีต)
 */
export function fmtUntil(iso?: string | Date | null): string {
  const date = parse(iso);
  if (!date) return '';

  const seconds = Math.round((date.getTime() - Date.now()) / 1000);
  if (seconds < -60) return 'เลยกำหนดแล้ว';
  if (seconds < 60) return 'ถึงกำหนดแล้ว';

  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `อีก ${minutes} นาที`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `อีก ${hours} ชม.`;

  const days = Math.round(hours / 24);
  if (days === 1) return 'พรุ่งนี้';
  if (days < 7) return `อีก ${days} วัน`;

  return fmtDate(iso);
}

// ── เงิน / ตัวเลข ───────────────────────────────────────────────────────────

/** "12,000" — ตัวเลขคอมมา (ใช้ th-TH ได้ตามกฎ §7) */
export function fmtNumber(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') return '';

  const numeric = typeof value === 'number' ? value : Number(value);
  if (Number.isNaN(numeric)) return '';

  return new Intl.NumberFormat('th-TH', { maximumFractionDigits: 0 }).format(numeric);
}

/** "฿12,000" — ค่าเช่า/มัดจำ/ค่าคอม */
export function fmtBaht(value: number | string | null | undefined): string {
  const formatted = fmtNumber(value);
  return formatted === '' ? '' : `฿${formatted}`;
}
