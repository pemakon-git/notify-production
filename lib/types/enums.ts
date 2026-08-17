import { z } from 'zod';

export const userStatusSchema = z.enum(['active', 'suspended']);
export const languageSchema = z.enum(['th', 'en']);

export const propertyTypeSchema = z.enum(['condo', 'house', 'townhome', 'apartment']);
export const propertyStatusSchema = z.enum([
  'draft',
  'pending_review',
  'available',
  'unavailable',
]);
export const furnishingSchema = z.enum(['unfurnished', 'partly_furnished', 'fully_furnished']);
export const amenityCategorySchema = z.enum(['common', 'security', 'transport', 'pet', 'other']);
export const propertyRequestStatusSchema = z.enum(['pending', 'reviewed', 'rejected']);

export const leadSourceSchema = z.enum(['web', 'phone', 'referral']);
export const leadStatusSchema = z.enum(['following', 'closed', 'needs_attention']);
export const appointmentStatusSchema = z.enum(['pending', 'done', 'cancelled']);
export const contractStatusSchema = z.enum(['active', 'expiring_soon', 'ended']);

export const documentTypeSchema = z.enum([
  'id_card',
  'house_registration',
  'title_deed',
  'contract',
  'receipt',
  'power_of_attorney',
  'other',
]);
export const documentStatusSchema = z.enum(['pending', 'verified', 'rejected']);
export const entityTypeSchema = z.enum([
  'property',
  'owner',
  'customer',
  'contract',
  'appointment',
  'company',
  'lead',
  'user',
]);

export const notificationChannelSchema = z.enum(['in_app', 'line', 'email']);
export const notificationStatusSchema = z.enum(['pending', 'sent', 'read', 'failed']);

/** prefix ของ property code ตาม type (spec 4.2: CD/HS/TH/AP-ปี-เลข) */
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
export type Furnishing = z.infer<typeof furnishingSchema>;
export type AmenityCategory = z.infer<typeof amenityCategorySchema>;
export type PropertyRequestStatus = z.infer<typeof propertyRequestStatusSchema>;
export type LeadSource = z.infer<typeof leadSourceSchema>;
export type LeadStatus = z.infer<typeof leadStatusSchema>;
export type AppointmentStatus = z.infer<typeof appointmentStatusSchema>;
export type ContractStatus = z.infer<typeof contractStatusSchema>;
export type DocumentType = z.infer<typeof documentTypeSchema>;
export type DocumentStatus = z.infer<typeof documentStatusSchema>;
export type EntityType = z.infer<typeof entityTypeSchema>;
export type NotificationChannel = z.infer<typeof notificationChannelSchema>;
export type NotificationStatus = z.infer<typeof notificationStatusSchema>;
