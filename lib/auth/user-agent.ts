/** แยก device/browser จาก user-agent แบบหยาบๆ พอให้ผู้ใช้จำอุปกรณ์ตัวเองได้ */
export function parseUserAgent(userAgent: string | null): { device: string; browser: string } {
  if (!userAgent) return { device: 'unknown', browser: 'unknown' };

  const device = /android/i.test(userAgent)
    ? 'Android'
    : /iphone|ipad|ipod/i.test(userAgent)
      ? 'iOS'
      : /windows/i.test(userAgent)
        ? 'Windows'
        : /mac os x/i.test(userAgent)
          ? 'macOS'
          : /linux/i.test(userAgent)
            ? 'Linux'
            : 'unknown';

  const browser = /edg\//i.test(userAgent)
    ? 'Edge'
    : /opr\/|opera/i.test(userAgent)
      ? 'Opera'
      : /chrome\//i.test(userAgent)
        ? 'Chrome'
        : /firefox\//i.test(userAgent)
          ? 'Firefox'
          : /safari\//i.test(userAgent)
            ? 'Safari'
            : 'unknown';

  return { device, browser };
}

/**
 * อ่าน `session_id` จาก access token ของ Supabase
 * — token ถูก verify มาแล้วโดย Supabase ก่อนถึงจุดนี้ ตรงนี้แค่อ่าน claim เพื่อผูก
 *   แถว user_sessions เข้ากับ session จริงของ GoTrue (ห้ามใช้เพื่อยืนยันตัวตน)
 */
export function readSessionId(accessToken: string): string | null {
  const payload = accessToken.split('.')[1];
  if (!payload) return null;

  try {
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
      session_id?: string;
    };
    return decoded.session_id ?? null;
  } catch {
    return null;
  }
}
