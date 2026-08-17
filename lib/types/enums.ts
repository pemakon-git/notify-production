import { z } from 'zod';

/**
 * ค่า enum ทั้งหมดตรงกับระบบเดิม 1:1 — เป็น key ที่ i18n catalog อ้างถึง
 * ⛔ ห้ามแก้ค่า (ไม่ใช่แค่ป้าย) เพราะกระทบ filter/route/flow ที่บันทึกไว้แล้ว
 */

export const userStatusSchema = z.enum(['active', 'suspended', 'invited']);
/** ระบบเดิม default = อังกฤษ (ไทยเป็นตัวเลือกสลับได้) */
export const languageSchema = z.enum(['en', 'th']);

export const propertyTypeSchema = z.enum(['condo', 'house', 'townhome', 'apartment']);
/** draft → pending_review → available → rented */
export const propertyStatusSchema = z.enum(['draft', 'pending_review', 'available', 'rented']);
export const furnishedSchema = z.enum(['fully', 'partial', 'unfurnished']);
export const mediaTypeSchema = z.enum(['image', 'video', 'floor_plan']);
export const propertyRequestStatusSchema = z.enum([
  'pending',
  'needs_info',
  'converted',
  'rejected',
]);

export const leadSourceSchema = z.enum(['public_web', 'walk_in', 'phone', 'referral']);
export const leadStatusSchema = z.enum(['new', 'working', 'closed']);
export const appointmentStatusSchema = z.enum(['upcoming', 'done', 'cancelled']);
export const contractStatusSchema = z.enum(['draft', 'active', 'ended']);

export const docTypeSchema = z.enum([
  'title_deed',
  'id_card',
  'house_registration',
  'lease',
  'receipt',
  'power_of_attorney',
  'property_photo',
  'other',
]);
export const docStatusSchema = z.enum(['uploaded', 'verified', 'active', 'archived']);
export const entityTypeSchema = z.enum([
  'property',
  'property_request',
  'owner',
  'customer',
  'lead',
  'contract',
  'appointment',
  'company',
  'user',
]);

export const notificationChannelSchema = z.enum(['line', 'email', 'in_app']);
export const notificationCategorySchema = z.enum([
  'lead',
  'appointment',
  'property',
  'owner',
  'contract',
  'system',
]);
export const notificationStatusSchema = z.enum(['queued', 'delivered', 'read', 'failed']);

export const communityCategorySchema = z.enum([
  'looking_room',
  'looking_condo',
  'for_rent',
  'looking_tenant',
  'buy_sell',
]);
export const communityStatusSchema = z.enum(['pending', 'published', 'archived', 'rejected']);

/** prefix ของรหัสทรัพย์ตามประเภท (CD/HS/TH/AP-ปี-เลข) */
export const PROPERTY_CODE_PREFIX = {
  condo: 'CD',
  house: 'HS',
  townhome: 'TH',
  apartment: 'AP',
} as const satisfies Record<z.infer<typeof propertyTypeSchema>, string>;

export type UserStatus = z.infer<typeof userStatusSchema>;
export type Language = z.infer<typeof languageSchema>;
export type PropertyType = z.infer<typeof propertyTypeSchema>;
export type PropertyStatus = z.infer<typeof propertyStatusSchema>;
export type Furnished = z.infer<typeof furnishedSchema>;
export type MediaType = z.infer<typeof mediaTypeSchema>;
export type PropertyRequestStatus = z.infer<typeof propertyRequestStatusSchema>;
export type LeadSource = z.infer<typeof leadSourceSchema>;
export type LeadStatus = z.infer<typeof leadStatusSchema>;
export type AppointmentStatus = z.infer<typeof appointmentStatusSchema>;
export type ContractStatus = z.infer<typeof contractStatusSchema>;
export type DocType = z.infer<typeof docTypeSchema>;
export type DocStatus = z.infer<typeof docStatusSchema>;
export type EntityType = z.infer<typeof entityTypeSchema>;
export type NotificationChannel = z.infer<typeof notificationChannelSchema>;
export type NotificationCategory = z.infer<typeof notificationCategorySchema>;
export type NotificationStatus = z.infer<typeof notificationStatusSchema>;
export type CommunityCategory = z.infer<typeof communityCategorySchema>;
export type CommunityStatus = z.infer<typeof communityStatusSchema>;
