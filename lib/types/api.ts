import { z } from 'zod';

/** รหัส error ที่ frontend เอาไปแมปข้อความได้ (ไม่ต้อง parse ข้อความ) */
export const API_ERROR_CODES = [
  'unauthorized',
  'forbidden',
  'not_found',
  'validation_error',
  'conflict',
  'rule_violation',
  'rate_limited',
  'internal_error',
] as const;
export type ApiErrorCode = (typeof API_ERROR_CODES)[number];

export interface ApiErrorBody {
  error: {
    code: ApiErrorCode;
    message: string;
    /** ราย field สำหรับ validation_error */
    details?: Record<string, string[]>;
  };
}

export interface ApiListMeta {
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
}

export interface ApiList<T> {
  data: T[];
  meta: ApiListMeta;
}

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(20),
});

export const sortQuerySchema = z.object({
  sortBy: z.string().optional(),
  sortDir: z.enum(['asc', 'desc']).default('desc'),
});

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;
