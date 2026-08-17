import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import type { ApiList, ApiListMeta } from '@/lib/types';
import { ApiError } from './errors';

const NO_STORE = { 'Cache-Control': 'no-store' };

export function json<T>(data: T, status = 200): Response {
  return Response.json(data, { status, headers: NO_STORE });
}

export function noContent(): Response {
  return new Response(null, { status: 204, headers: NO_STORE });
}

export function listJson<T>(data: T[], meta: ApiListMeta): Response {
  return json<ApiList<T>>({ data, meta }, 200);
}

export function buildListMeta(total: number, page: number, perPage: number): ApiListMeta {
  return { page, perPage, total, totalPages: Math.max(1, Math.ceil(total / perPage)) };
}

/**
 * แปลง error ทุกชนิดเป็น response เดียวกัน — ห้าม leak stack/SQL ออกไปฝั่ง client
 * และ map error ระดับ DB (constraint ที่เราตั้งใน policies.sql) ให้เป็นข้อความที่อ่านได้
 */
export function toErrorResponse(error: unknown): Response {
  if (error instanceof ApiError) {
    return Response.json(
      { error: { code: error.code, message: error.message, details: error.details } },
      { status: error.status, headers: NO_STORE },
    );
  }

  if (error instanceof ZodError) {
    return Response.json(
      {
        error: {
          code: 'validation_error',
          message: 'ข้อมูลที่ส่งมาไม่ถูกต้อง',
          details: error.flatten().fieldErrors as Record<string, string[]>,
        },
      },
      { status: 422, headers: NO_STORE },
    );
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      const target = (error.meta?.target as string[] | undefined)?.join(', ') ?? 'field';
      return Response.json(
        { error: { code: 'conflict', message: `ข้อมูลซ้ำกับที่มีอยู่แล้ว (${target})` } },
        { status: 409, headers: NO_STORE },
      );
    }
    if (error.code === 'P2025') {
      return Response.json(
        { error: { code: 'not_found', message: 'ไม่พบข้อมูลที่ต้องการแก้ไข' } },
        { status: 404, headers: NO_STORE },
      );
    }
    if (error.code === 'P2003') {
      return Response.json(
        { error: { code: 'conflict', message: 'มีข้อมูลอื่นอ้างอิงอยู่ ไม่สามารถดำเนินการได้' } },
        { status: 409, headers: NO_STORE },
      );
    }
  }

  // constraint ที่ตั้งไว้ใน policies.sql — Prisma โยนมาเป็น raw db error
  const raw = error instanceof Error ? error.message : String(error);

  if (raw.includes('appointments_no_agent_overlap')) {
    return Response.json(
      {
        error: {
          code: 'conflict',
          message: 'ช่วงเวลานี้ผู้ดูแลมีนัดอยู่แล้ว กรุณาเลือกเวลาอื่น',
        },
      },
      { status: 409, headers: NO_STORE },
    );
  }

  if (raw.includes('must be linked to at least one entity') || raw.includes('last link of document')) {
    return Response.json(
      { error: { code: 'rule_violation', message: 'เอกสารต้องผูกกับข้อมูลอย่างน้อย 1 รายการ' } },
      { status: 409, headers: NO_STORE },
    );
  }

  if (raw.includes('is insert-only')) {
    return Response.json(
      { error: { code: 'forbidden', message: 'ข้อมูลนี้แก้ไขหรือลบไม่ได้' } },
      { status: 403, headers: NO_STORE },
    );
  }

  console.error('[api] unhandled error:', error);

  return Response.json(
    { error: { code: 'internal_error', message: 'เกิดข้อผิดพลาดภายในระบบ' } },
    { status: 500, headers: NO_STORE },
  );
}
