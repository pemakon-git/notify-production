import type { Action, Resource } from '@/lib/types';
import { authenticate, type AuthContext } from '@/lib/auth/session';
import { can } from '@/lib/policies/permissions.config';
import { forbidden } from '@/lib/http/errors';
import { toErrorResponse } from '@/lib/http/response';

/** Next 15: params เป็น Promise */
export interface RouteContext<P extends Record<string, string> = Record<string, string>> {
  params: Promise<P>;
}

export type GuardedHandler<P extends Record<string, string> = Record<string, string>> = (
  request: Request,
  ctx: { auth: AuthContext; params: P },
) => Promise<Response>;

/**
 * ตรวจสิทธิ์ + แปลง error เป็น response — เทียบเท่า NestJS Guard + Decorator ในสเปค
 * (spec 3.2 เขียนตัวอย่างเป็น `@RequirePermission('properties','approve')`
 *  บน Route Handlers ใช้เป็น wrapper function แบบนี้แทน)
 *
 * ใช้:
 *   export const POST = withPermission('properties', 'approve', async (req, { auth, params }) => …)
 */
export function withPermission<P extends Record<string, string> = Record<string, string>>(
  resource: Resource,
  action: Action,
  handler: GuardedHandler<P>,
) {
  return async (request: Request, ctx?: RouteContext<P>): Promise<Response> => {
    try {
      const auth = await authenticate(request);

      if (!can(auth.user.role, resource, action)) {
        throw forbidden(`role ${auth.user.role} ไม่มีสิทธิ์ ${action} บน ${resource}`);
      }

      const params = ((await ctx?.params) ?? {}) as P;
      return await handler(request, { auth, params });
    } catch (error) {
      return toErrorResponse(error);
    }
  };
}

/** login แล้วก็ผ่าน (เช่น GET /auth/me) — ยังตรวจ status active ให้ใน authenticate() */
export function withAuth<P extends Record<string, string> = Record<string, string>>(
  handler: GuardedHandler<P>,
) {
  return async (request: Request, ctx?: RouteContext<P>): Promise<Response> => {
    try {
      const auth = await authenticate(request);
      const params = ((await ctx?.params) ?? {}) as P;
      return await handler(request, { auth, params });
    } catch (error) {
      return toErrorResponse(error);
    }
  };
}

/** endpoint สาธารณะ (/api/public/*) — ไม่ auth แต่ยังต้องแปลง error ให้เป็นรูปแบบเดียวกัน */
export function withPublic<P extends Record<string, string> = Record<string, string>>(
  handler: (request: Request, ctx: { params: P }) => Promise<Response>,
) {
  return async (request: Request, ctx?: RouteContext<P>): Promise<Response> => {
    try {
      const params = ((await ctx?.params) ?? {}) as P;
      return await handler(request, { params });
    } catch (error) {
      return toErrorResponse(error);
    }
  };
}
