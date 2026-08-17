import type { Furnished, PropertyType } from './enums';

/**
 * DTO ของทรัพย์ที่ฝั่งลูกค้าเห็น — **เปิดเผยได้ทั้งหมด**
 *
 * ตั้งใจไม่มี: เจ้าของทรัพย์ · ค่าคอม · ผู้ดูแล · โน้ตภายใน · สถานะภายใน
 * (ทรัพย์ที่ไม่ใช่ `available` ไม่ถูกส่งออกมาตั้งแต่ต้นทางอยู่แล้ว — RLS + query)
 */
export interface PublicProperty {
  id: string;
  slug: string;
  code: string;
  type: PropertyType;
  title: string;
  description: string | null;

  province: string | null;
  district: string | null;
  projectName: string | null;

  monthlyRent: number;
  depositMonths: number | null;

  bedrooms: number | null;
  bathrooms: number | null;
  areaSqm: number | null;
  floor: string | null;
  furnished: Furnished | null;
  amenities: string[];

  coverImageUrl: string | null;
  imageUrls: string[];
  isFeatured: boolean;
}

/** ฟอร์มนัดเข้าชมจากหน้าเว็บ — สร้าง lead + appointment ใน transaction เดียว */
export interface PublicBookingResult {
  leadCode: string;
  appointmentCode: string;
}
