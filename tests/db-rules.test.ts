/**
 * Integration test ของกติกาที่ "บังคับที่ระดับ DB" — ไม่ใช่ที่ app layer
 *
 * ครอบ spec section 5 rule #3 (นัดชน), #11 (audit insert-only), 4.9 (เอกสารห้ามลอย)
 * และ spec section 10 ("ทุก migration ที่แตะ RLS ต้องมี test ยืนยันว่า role ที่ไม่ควร
 * เข้าถึงได้ ถูกบล็อกจริงที่ระดับ DB ไม่ใช่แค่ที่ api")
 *
 * ต้องมี DB จริง:
 *   docker run -d --name notify-pg-test -e POSTGRES_PASSWORD=postgres -p 55432:5432 postgres:15
 *   TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:55432/postgres
 *   npm run db:migrate && npm run db:policies && npm test
 *
 * ถ้าไม่มี TEST_DATABASE_URL → ข้ามทั้งไฟล์ (ไม่ทำให้ CI ที่ไม่มี DB ล้ม)
 */
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Client } from 'pg';

const url = process.env.TEST_DATABASE_URL ?? process.env.DIRECT_URL;
const enabled = Boolean(url) && !url!.includes('replace-me');

const AGENT_A = '00000000-0000-4000-9000-00000000000a';
const AGENT_B = '00000000-0000-4000-9000-00000000000b';
const OWNER = '00000000-0000-4000-9000-000000000010';
const LEAD = '00000000-0000-4000-9000-000000000020';
const PROP_AVAILABLE = '00000000-0000-4000-9000-000000000030';
const PROP_DRAFT = '00000000-0000-4000-9000-000000000031';

let db: Client;

/** อ่านแถวแรกแบบไม่ต้องใส่ ! ทุกจุด — ถ้าไม่มีแถวคือเทสต์ผิดตั้งแต่ query */
function firstRow<T>(rows: T[]): T {
  const row = rows[0];
  if (row === undefined) throw new Error('query ไม่คืนแถวใดเลย');
  return row;
}

async function reset(): Promise<void> {
  await db.query('DELETE FROM appointments WHERE agent_id IN ($1, $2)', [AGENT_A, AGENT_B]);
  await db.query("DELETE FROM documents WHERE name LIKE 'test:%'"); // links cascade ตามไป
  // audit_logs ลบไม่ได้ตามดีไซน์ (insert-only) — ใช้ prefix action 'test.' แล้วปล่อยค้างไว้
}

beforeAll(async () => {
  if (!enabled) return;

  db = new Client({ connectionString: url });
  await db.connect();

  // fixture: agent 2 คน / เจ้าของ 1 / lead 1 / ทรัพย์ available + draft
  await db.query(
    `INSERT INTO profiles (id, email, first_name, last_name, role)
     VALUES ($1, 'agent-a@test.local', 'A', 'Agent', 'sales_agent'),
            ($2, 'agent-b@test.local', 'B', 'Agent', 'sales_agent')
     ON CONFLICT (id) DO NOTHING`,
    [AGENT_A, AGENT_B],
  );

  await db.query(
    `INSERT INTO owners (id, first_name, last_name, phone)
     VALUES ($1, 'สมชาย', 'ทดสอบ', '0800000000') ON CONFLICT (id) DO NOTHING`,
    [OWNER],
  );

  await db.query(
    `INSERT INTO properties (id, code, type, owner_id, title_th, province, district, rent_price, status)
     VALUES ($1, 'TEST-AV-1', 'condo', $3, 'ทรัพย์เผยแพร่แล้ว', 'กรุงเทพมหานคร', 'วัฒนา', 20000, 'available'),
            ($2, 'TEST-DR-1', 'condo', $3, 'ทรัพย์ร่าง', 'กรุงเทพมหานคร', 'วัฒนา', 15000, 'draft')
     ON CONFLICT (id) DO NOTHING`,
    [PROP_AVAILABLE, PROP_DRAFT, OWNER],
  );

  await db.query(
    `INSERT INTO leads (id, code, name, phone, source)
     VALUES ($1, 'TEST-LD-1', 'ลูกค้าทดสอบ', '0811111111', 'web') ON CONFLICT (id) DO NOTHING`,
    [LEAD],
  );

  await reset();
});

afterAll(async () => {
  if (!enabled) return;
  await reset();
  await db.end();
});

function insertAppointment(
  code: string,
  agentId: string,
  startIso: string,
  minutes: number,
  status = 'pending',
  endsAtOverride?: string,
): Promise<unknown> {
  const endsAt = endsAtOverride ?? new Date(new Date(startIso).getTime() + minutes * 60_000).toISOString();

  return db.query(
    `INSERT INTO appointments (id, code, lead_id, agent_id, scheduled_at, duration_minutes, ends_at, status)
     VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7)`,
    [code, LEAD, agentId, startIso, minutes, endsAt, status],
  );
}

describe.skipIf(!enabled)('นัดหมายห้ามชนกัน — exclusion constraint (rule #3)', () => {
  it('นัดแรกเข้าได้', async () => {
    await expect(
      insertAppointment('APT-T-001', AGENT_A, '2026-09-01T10:00:00Z', 60),
    ).resolves.toBeDefined();
  });

  it('agent เดียวกัน เวลาซ้อนกัน → DB ปฏิเสธ', async () => {
    await expect(
      insertAppointment('APT-T-002', AGENT_A, '2026-09-01T10:30:00Z', 60),
    ).rejects.toThrow(/appointments_no_agent_overlap/);
  });

  it('agent เดียวกัน เวลาต่อกันพอดี (11:00) → เข้าได้ ไม่ถือว่าชน', async () => {
    await expect(
      insertAppointment('APT-T-003', AGENT_A, '2026-09-01T11:00:00Z', 60),
    ).resolves.toBeDefined();
  });

  it('agent คนอื่น เวลาเดียวกัน → เข้าได้', async () => {
    await expect(
      insertAppointment('APT-T-004', AGENT_B, '2026-09-01T10:00:00Z', 60),
    ).resolves.toBeDefined();
  });

  it('นัดที่ถูกยกเลิกไม่กินเวลา → นัดใหม่ทับได้', async () => {
    await insertAppointment('APT-T-005', AGENT_B, '2026-09-01T14:00:00Z', 60, 'cancelled');

    await expect(
      insertAppointment('APT-T-006', AGENT_B, '2026-09-01T14:00:00Z', 60),
    ).resolves.toBeDefined();
  });

  it('ends_at ที่ไม่ตรงกับ duration → CHECK ปฏิเสธ (กัน app คำนวณผิดแล้วเลี่ยง constraint ได้)', async () => {
    await expect(
      insertAppointment(
        'APT-T-007',
        AGENT_B,
        '2026-09-02T10:00:00Z',
        60,
        'pending',
        '2026-09-02T09:00:00Z',
      ),
    ).rejects.toThrow(/appointments_ends_at_consistent/);
  });

  it('duration ต้องมากกว่า 0', async () => {
    await expect(
      insertAppointment('APT-T-008', AGENT_B, '2026-09-03T10:00:00Z', 0),
    ).rejects.toThrow(/appointments_duration_positive/);
  });
});

describe.skipIf(!enabled)('audit_logs เป็น insert-only (rule #11)', () => {
  // ลบ audit log ไม่ได้ตามดีไซน์ จึงใช้ action ที่ไม่ซ้ำกันทุกรอบเทสต์
  const action = `test.create.${randomUUID()}`;

  it('insert ได้', async () => {
    await db.query(
      `INSERT INTO audit_logs (id, actor_id, actor_role, action, entity_type, entity_id)
       VALUES (gen_random_uuid(), $1, 'sales_agent', $2, 'user', $3)`,
      // actor_id เป็น uuid ส่วน entity_id เป็น text — ส่งแยก parameter ไม่ใช้ $1 ซ้ำ
      [AGENT_A, action, AGENT_A],
    );

    const { rows } = await db.query<{ n: number }>(
      'SELECT count(*)::int AS n FROM audit_logs WHERE action = $1',
      [action],
    );
    expect(firstRow(rows).n).toBe(1);
  });

  it('UPDATE ถูกบล็อกที่ DB', async () => {
    await expect(
      db.query(`UPDATE audit_logs SET action = 'tampered' WHERE action = $1`, [action]),
    ).rejects.toThrow(/insert-only/);
  });

  it('DELETE ถูกบล็อกที่ DB', async () => {
    await expect(db.query('DELETE FROM audit_logs WHERE action = $1', [action])).rejects.toThrow(
      /insert-only/,
    );
  });

  it('UPDATE ที่ไม่ match แถวใดเลย ก็ยังถูกบล็อก (trigger ระดับ statement)', async () => {
    await expect(
      db.query(`UPDATE audit_logs SET action = 'x' WHERE action = 'ไม่มีจริง'`),
    ).rejects.toThrow(/insert-only/);
  });

  it('TRUNCATE ถูกบล็อกที่ DB', async () => {
    await expect(db.query('TRUNCATE audit_logs')).rejects.toThrow(/insert-only/);
  });
});

describe.skipIf(!enabled)('เอกสารต้องมี link ≥ 1 (spec 4.9)', () => {
  it('insert เอกสารโดยไม่มี link → commit ไม่ผ่าน', async () => {
    await db.query('BEGIN');
    await db.query(
      `INSERT INTO documents (id, type, name) VALUES (gen_random_uuid(), 'other', 'test:orphan')`,
    );

    await expect(db.query('COMMIT')).rejects.toThrow(/must be linked to at least one entity/);
    await db.query('ROLLBACK');
  });

  it('insert เอกสาร + link ใน transaction เดียวกัน → ผ่าน (deferred ทำงานถูกต้อง)', async () => {
    await db.query('BEGIN');
    const { rows } = await db.query(
      `INSERT INTO documents (id, type, name) VALUES (gen_random_uuid(), 'title_deed', 'test:linked') RETURNING id`,
    );
    await db.query(
      `INSERT INTO document_links (document_id, entity_type, entity_id) VALUES ($1, 'property', $2)`,
      [firstRow(rows).id, PROP_AVAILABLE],
    );
    await expect(db.query('COMMIT')).resolves.toBeDefined();
  });

  it('ลบ link สุดท้ายออก → ถูกปฏิเสธ (เอกสารห้ามลอย)', async () => {
    const { rows } = await db.query(`SELECT id FROM documents WHERE name = 'test:linked'`);

    await db.query('BEGIN');
    await db.query('DELETE FROM document_links WHERE document_id = $1', [firstRow(rows).id]);

    await expect(db.query('COMMIT')).rejects.toThrow(/last link of document/);
    await db.query('ROLLBACK');
  });

  it('ลบเอกสารทั้งใบพร้อม link → ผ่าน (cascade ไม่ติด trigger)', async () => {
    const { rows } = await db.query(`SELECT id FROM documents WHERE name = 'test:linked'`);

    await db.query('BEGIN');
    await db.query('DELETE FROM documents WHERE id = $1', [firstRow(rows).id]);
    await expect(db.query('COMMIT')).resolves.toBeDefined();
  });
});

describe.skipIf(!enabled)('RLS — สิ่งที่ anon เข้าถึงได้จริงที่ระดับ DB (spec section 9)', () => {
  it('anon เห็นเฉพาะทรัพย์ status=available', async () => {
    await db.query('BEGIN');
    await db.query('SET LOCAL ROLE anon');

    const { rows } = await db.query('SELECT id, status FROM properties');

    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((row: { status: string }) => row.status === 'available')).toBe(true);
    expect(rows.some((row: { id: string }) => row.id === PROP_DRAFT)).toBe(false);

    await db.query('ROLLBACK');
  });

  it('anon แตะตารางที่มีข้อมูลอ่อนไหวไม่ได้เลย', async () => {
    for (const table of ['owners', 'customers', 'contracts', 'audit_logs', 'profiles', 'documents']) {
      await db.query('BEGIN');
      await db.query('SET LOCAL ROLE anon');

      await expect(
        db.query(`SELECT * FROM ${table} LIMIT 1`),
        `anon ต้องอ่าน ${table} ไม่ได้`,
      ).rejects.toThrow(/permission denied/);

      await db.query('ROLLBACK');
    }
  });

  it('anon เขียนทรัพย์ไม่ได้ (อ่านได้เท่านั้น)', async () => {
    await db.query('BEGIN');
    await db.query('SET LOCAL ROLE anon');

    await expect(
      db.query(`UPDATE properties SET rent_price = 1 WHERE id = $1`, [PROP_AVAILABLE]),
    ).rejects.toThrow(/permission denied/);

    await db.query('ROLLBACK');
  });

  it('anon เห็นรูปของทรัพย์ที่เผยแพร่แล้วเท่านั้น', async () => {
    await db.query(
      `INSERT INTO property_images (id, property_id, storage_key)
       VALUES (gen_random_uuid(), $1, 'test/available.jpg'),
              (gen_random_uuid(), $2, 'test/draft.jpg')`,
      [PROP_AVAILABLE, PROP_DRAFT],
    );

    await db.query('BEGIN');
    await db.query('SET LOCAL ROLE anon');
    const { rows } = await db.query(`SELECT storage_key FROM property_images`);
    await db.query('ROLLBACK');

    const keys = rows.map((row: { storage_key: string }) => row.storage_key);
    expect(keys).toContain('test/available.jpg');
    expect(keys).not.toContain('test/draft.jpg');

    await db.query(`DELETE FROM property_images WHERE storage_key LIKE 'test/%'`);
  });
});

describe.skipIf(!enabled)('next_code_seq — ออกเลขไม่ซ้ำ (spec 4.2/4.5/4.6/4.8)', () => {
  it('เลขเดินต่อเนื่องต่อ (scope, year)', async () => {
    const first = await db.query<{ seq: number }>(`SELECT next_code_seq('TEST', 2026) AS seq`);
    const second = await db.query<{ seq: number }>(`SELECT next_code_seq('TEST', 2026) AS seq`);

    expect(firstRow(second.rows).seq).toBe(firstRow(first.rows).seq + 1);
  });

  it('แยก scope และแยกปีจากกัน', async () => {
    const a = await db.query<{ seq: number }>(`SELECT next_code_seq('TEST_OTHER', 2026) AS seq`);
    const b = await db.query<{ seq: number }>(`SELECT next_code_seq('TEST', 2027) AS seq`);

    expect(firstRow(a.rows).seq).toBe(1);
    expect(firstRow(b.rows).seq).toBe(1);
  });

  it('เรียกพร้อมกันหลาย connection → ไม่มีเลขซ้ำ', async () => {
    const clients = await Promise.all(
      Array.from({ length: 8 }, async () => {
        const client = new Client({ connectionString: url });
        await client.connect();
        return client;
      }),
    );

    try {
      const results = await Promise.all(
        clients.map((client) =>
          client.query<{ seq: number }>(`SELECT next_code_seq('TEST_CONCURRENT', 2026) AS seq`),
        ),
      );

      const seqs = results.map((result) => firstRow(result.rows).seq).sort((a, b) => a - b);
      expect(new Set(seqs).size).toBe(8);
      expect(seqs).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    } finally {
      await Promise.all(clients.map((client) => client.end()));
      await db.query(`DELETE FROM code_sequences WHERE scope LIKE 'TEST%'`);
    }
  });
});
