import type {
  AppointmentStatus,
  CommunityStatus,
  ContractStatus,
  DocStatus,
  DocType,
  Furnished,
  LeadSource,
  LeadStatus,
  PropertyRequestStatus,
  PropertyStatus,
  PropertyType,
  Role,
} from '@/lib/types';

/**
 * สถานะ → โทนสี + i18n key — source เดียวของทั้งแอป (ยกมาจาก lib/status.ts ของระบบเดิม)
 *
 * `labelKey` ชี้ไป catalog ของ next-intl (messages/{en,th}.json) — คอมโพเนนต์แปลด้วย t()
 * เพราะ lib ใช้ hook ไม่ได้ · โทนสีอยู่ที่นี่จุดเดียว ⛔ ห้าม hardcode สีสถานะในหน้า
 */
export type Tone = 'neutral' | 'active' | 'done' | 'gold' | 'danger';

const TONE_CLASS: Record<Tone, string> = {
  neutral: 'bg-border/60 text-ink-soft',
  active: 'bg-success/10 text-success',
  done: 'bg-info/10 text-info',
  gold: 'bg-gold/15 text-gold-dark',
  danger: 'bg-danger/10 text-danger',
};

const TONE_OUTLINE: Record<Tone, string> = {
  neutral: 'border border-border text-ink-soft',
  active: 'border border-success/40 text-success',
  done: 'border border-info/40 text-info',
  gold: 'border border-gold/40 text-gold-dark',
  danger: 'border border-danger/40 text-danger',
};

/** จุดสีเล็กหน้าแคปชั่น (ใช้ใน DetailHeader — แคปชั่นเดียว ไม่ใช่ badge) */
const TONE_DOT: Record<Tone, string> = {
  neutral: 'bg-faint',
  active: 'bg-success',
  done: 'bg-info',
  gold: 'bg-gold',
  danger: 'bg-danger',
};

export function badgeClass(tone: Tone, outline?: boolean): string {
  return `badge ${outline ? TONE_OUTLINE[tone] : TONE_CLASS[tone]}`;
}

export function toneDot(tone: Tone): string {
  return TONE_DOT[tone];
}

export interface StatusMeta {
  labelKey: string;
  tone: Tone;
}

export const PROPERTY_STATUS: Record<PropertyStatus, StatusMeta> = {
  draft: { labelKey: 'status.property.draft', tone: 'neutral' },
  pending_review: { labelKey: 'status.property.pending_review', tone: 'done' },
  available: { labelKey: 'status.property.available', tone: 'active' },
  rented: { labelKey: 'status.property.rented', tone: 'gold' },
};

export const PROPERTY_REQUEST_STATUS: Record<PropertyRequestStatus, StatusMeta> = {
  pending: { labelKey: 'status.request.pending', tone: 'done' },
  needs_info: { labelKey: 'status.request.needs_info', tone: 'gold' },
  converted: { labelKey: 'status.request.converted', tone: 'active' },
  rejected: { labelKey: 'status.request.rejected', tone: 'neutral' },
};

export const LEAD_STATUS: Record<LeadStatus, StatusMeta> = {
  new: { labelKey: 'status.lead.new', tone: 'done' },
  working: { labelKey: 'status.lead.working', tone: 'gold' },
  closed: { labelKey: 'status.lead.closed', tone: 'neutral' },
};

export const APPOINTMENT_STATUS: Record<AppointmentStatus, StatusMeta> = {
  upcoming: { labelKey: 'status.appointment.upcoming', tone: 'done' },
  done: { labelKey: 'status.appointment.done', tone: 'active' },
  cancelled: { labelKey: 'status.appointment.cancelled', tone: 'neutral' },
};

export const CONTRACT_STATUS: Record<ContractStatus, StatusMeta> = {
  draft: { labelKey: 'status.contract.draft', tone: 'neutral' },
  active: { labelKey: 'status.contract.active', tone: 'active' },
  ended: { labelKey: 'status.contract.ended', tone: 'neutral' },
};

export const DOC_STATUS: Record<DocStatus, StatusMeta> = {
  uploaded: { labelKey: 'docStatus.uploaded', tone: 'done' },
  verified: { labelKey: 'docStatus.verified', tone: 'active' },
  active: { labelKey: 'docStatus.active', tone: 'active' },
  archived: { labelKey: 'docStatus.archived', tone: 'neutral' },
};

export const COMMUNITY_STATUS: Record<CommunityStatus, StatusMeta> = {
  pending: { labelKey: 'status.community.pending', tone: 'done' },
  published: { labelKey: 'status.community.published', tone: 'active' },
  archived: { labelKey: 'status.community.archived', tone: 'neutral' },
  rejected: { labelKey: 'status.community.rejected', tone: 'danger' },
};

// ── ค่าคงที่อื่น (ไม่ใช่สถานะ จึงไม่มีโทนสี — เก็บเป็น i18n key ล้วน) ─────────

export const PROPERTY_TYPE_KEY: Record<PropertyType, string> = {
  condo: 'propertyType.condo',
  house: 'propertyType.house',
  townhome: 'propertyType.townhome',
  apartment: 'propertyType.apartment',
};

export const LEAD_SOURCE_KEY: Record<LeadSource, string> = {
  public_web: 'leadSource.public_web',
  walk_in: 'leadSource.walk_in',
  phone: 'leadSource.phone',
  referral: 'leadSource.referral',
};

export const FURNISHED_KEY: Record<Furnished, string> = {
  fully: 'furnished.fully',
  partial: 'furnished.partial',
  unfurnished: 'furnished.unfurnished',
};

export const DOC_TYPE_KEY: Record<DocType, string> = {
  title_deed: 'docType.title_deed',
  id_card: 'docType.id_card',
  house_registration: 'docType.house_registration',
  lease: 'docType.lease',
  receipt: 'docType.receipt',
  power_of_attorney: 'docType.power_of_attorney',
  property_photo: 'docType.property_photo',
  other: 'docType.other',
};

/**
 * ป้ายบทบาท — อยู่ใน namespace `users.role.*` ของ catalog
 * (⚠️ `common.role` คือคำว่า "Role" ที่ใช้เป็นหัวคอลัมน์ ไม่ใช่ชื่อบทบาท)
 */
export const ROLE_KEY: Record<Role, string> = {
  super_admin: 'users.role.super_admin',
  property_manager: 'users.role.property_manager',
  sales_agent: 'users.role.sales_agent',
};

/** ป้ายเสริม "ใกล้ครบกำหนด" — คำนวณจากวันสิ้นสุด ไม่ใช่จากสถานะ */
export function isExpiringSoon(endDate?: string | Date | null, withinDays = 30): boolean {
  if (!endDate) return false;

  const ms = new Date(endDate).getTime() - Date.now();
  return ms > 0 && ms <= withinDays * 864e5;
}
