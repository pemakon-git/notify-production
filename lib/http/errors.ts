import type { ApiErrorCode } from '@/lib/types';

const STATUS_BY_CODE: Record<ApiErrorCode, number> = {
  unauthorized: 401,
  forbidden: 403,
  not_found: 404,
  validation_error: 422,
  conflict: 409,
  rule_violation: 409,
  rate_limited: 429,
  internal_error: 500,
};

export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly status: number;
  readonly details?: Record<string, string[]>;

  constructor(code: ApiErrorCode, message: string, details?: Record<string, string[]>) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = STATUS_BY_CODE[code];
    this.details = details;
  }
}

export const unauthorized = (message = 'ต้อง login ก่อน') => new ApiError('unauthorized', message);

export const forbidden = (message = 'ไม่มีสิทธิ์ดำเนินการนี้') => new ApiError('forbidden', message);

export const notFound = (message = 'ไม่พบข้อมูล') => new ApiError('not_found', message);

export const conflict = (message: string) => new ApiError('conflict', message);

/** ใช้กับ business rule ใน spec section 5 ที่ถูกละเมิด */
export const ruleViolation = (message: string) => new ApiError('rule_violation', message);
