-- ══════════════════════════════════════════════════════════════════════════
--  policies.sql — DDL ที่ Prisma แสดงไม่ได้
--  รันด้วย `npm run db:policies` **ทุกครั้งหลัง `prisma migrate`**
--  ไฟล์นี้ idempotent 100% — รันซ้ำได้เสมอ
--
--  ครอบ: FK ไป auth.users / running-number function / exclusion constraint กันนัดชน /
--        เอกสารห้ามลอย / audit_logs insert-only / RLS ทุกตาราง / storage bucket
-- ══════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────
-- 0. role ของ Supabase — บน Supabase มีอยู่แล้ว (บล็อกนี้ไม่ทำอะไร)
--    บน Postgres เปล่า (local/CI) สร้างให้ เพื่อให้ไฟล์นี้รันได้เหมือนกันทุกที่
--    → สิ่งที่เราเทสต์ในเครื่อง = สิ่งที่รันบน production จริง
-- ─────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN NOINHERIT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN NOINHERIT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role NOLOGIN NOINHERIT BYPASSRLS;
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────
-- 1. profiles.id ต้องผูกกับ auth.users ของ Supabase Auth
--    (Prisma ข้าม schema ไม่ได้ จึงเพิ่ม FK ที่นี่)
-- ─────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'auth' AND table_name = 'users'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_id_auth_users_fkey'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_id_auth_users_fkey
      FOREIGN KEY (id) REFERENCES auth.users (id) ON DELETE CASCADE;
    RAISE NOTICE 'added profiles -> auth.users FK';
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────
-- 2. running number ต่อปี — atomic ระดับ DB
--    ห้ามให้ app นับเอง (serverless หลาย invocation จะออกเลขซ้ำ)
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.next_code_seq(p_scope text, p_year int)
RETURNS int
LANGUAGE plpgsql
AS $$
DECLARE
  v_next int;
BEGIN
  INSERT INTO public.code_sequences (scope, year, last_value)
  VALUES (p_scope, p_year, 1)
  ON CONFLICT (scope, year)
    DO UPDATE SET last_value = code_sequences.last_value + 1
  RETURNING code_sequences.last_value INTO v_next;

  RETURN v_next;
END $$;

-- ─────────────────────────────────────────────────────────────
-- 3. นัดหมายห้ามชนกัน (spec business rule #3)
--    บังคับที่ DB ผ่าน exclusion constraint — ไม่ใช้ Redis lock เพราะ serverless
--    ไม่มี state ข้าม request และ DB constraint atomic กว่าอยู่แล้ว
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.appointments DROP CONSTRAINT IF EXISTS appointments_duration_positive;
ALTER TABLE public.appointments
  ADD CONSTRAINT appointments_duration_positive CHECK (duration_minutes > 0);

-- ends_at เขียนจาก app layer — CHECK นี้กันไม่ให้เขียนค่าที่ไม่สอดคล้องกับ duration
-- (make_interval เป็น immutable จึงใช้ใน CHECK ได้)
ALTER TABLE public.appointments DROP CONSTRAINT IF EXISTS appointments_ends_at_consistent;
ALTER TABLE public.appointments
  ADD CONSTRAINT appointments_ends_at_consistent
  CHECK (ends_at = scheduled_at + make_interval(mins => duration_minutes));

-- agent เดียวกัน + ช่วงเวลาซ้อนกัน = insert ไม่ผ่าน (ยกเว้นนัดที่ถูกยกเลิก)
-- '[)' = ติดกันพอดีไม่ถือว่าชน (10:00-11:00 กับ 11:00-12:00 ผ่าน)
ALTER TABLE public.appointments DROP CONSTRAINT IF EXISTS appointments_no_agent_overlap;
ALTER TABLE public.appointments
  ADD CONSTRAINT appointments_no_agent_overlap
  EXCLUDE USING gist (
    agent_id WITH =,
    tstzrange(scheduled_at, ends_at, '[)') WITH &&
  )
  WHERE (status <> 'cancelled'::public.appointment_status);

-- ─────────────────────────────────────────────────────────────
-- 4. เอกสารต้องมี link ≥ 1 เสมอ (spec 4.9 — ห้ามมีเอกสารลอย)
--    ใช้ CONSTRAINT TRIGGER แบบ DEFERRED เพื่อให้ insert document + link
--    ใน transaction เดียวกันยังทำได้ แต่ commit ที่ไม่มี link จะถูก reject
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.document_requires_link()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.document_links WHERE document_id = NEW.id) THEN
    RAISE EXCEPTION 'document % must be linked to at least one entity', NEW.id
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NULL;
END $$;

CREATE OR REPLACE FUNCTION public.document_link_keeps_last()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- ถ้าเอกสารถูกลบไปด้วย (cascade) ก็ไม่ต้องเช็ค
  IF NOT EXISTS (SELECT 1 FROM public.documents WHERE id = OLD.document_id) THEN
    RETURN NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.document_links WHERE document_id = OLD.document_id) THEN
    RAISE EXCEPTION 'cannot remove the last link of document % (documents must not be orphaned)', OLD.document_id
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NULL;
END $$;

DROP TRIGGER IF EXISTS documents_require_link ON public.documents;
CREATE CONSTRAINT TRIGGER documents_require_link
  AFTER INSERT ON public.documents
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION public.document_requires_link();

DROP TRIGGER IF EXISTS document_links_keep_last ON public.document_links;
CREATE CONSTRAINT TRIGGER document_links_keep_last
  AFTER DELETE ON public.document_links
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION public.document_link_keeps_last();

-- ─────────────────────────────────────────────────────────────
-- 5. audit_logs = insert-only (spec business rule #11)
--    บังคับที่ DB ไม่ใช่แค่ "ไม่ expose endpoint" — แม้ connection ที่เป็น
--    table owner ก็ UPDATE/DELETE/TRUNCATE ไม่ได้
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.deny_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION '% is insert-only: % is not allowed', TG_TABLE_NAME, TG_OP
    USING ERRCODE = 'insufficient_privilege';
END $$;

DROP TRIGGER IF EXISTS audit_logs_no_update_delete ON public.audit_logs;
CREATE TRIGGER audit_logs_no_update_delete
  BEFORE UPDATE OR DELETE ON public.audit_logs
  FOR EACH STATEMENT EXECUTE FUNCTION public.deny_mutation();

DROP TRIGGER IF EXISTS audit_logs_no_truncate ON public.audit_logs;
CREATE TRIGGER audit_logs_no_truncate
  BEFORE TRUNCATE ON public.audit_logs
  FOR EACH STATEMENT EXECUTE FUNCTION public.deny_mutation();

-- ─────────────────────────────────────────────────────────────
-- 5.5 updated_at ให้มี DEFAULT now()
--     Prisma ใส่ค่านี้จาก app layer (@updatedAt) จึงไม่สร้าง default ให้
--     แต่เส้นทางที่เขียนด้วย SQL ตรง (cron job, migration แก้ข้อมูล) จะ insert ไม่ผ่าน
--     เพราะคอลัมน์เป็น NOT NULL — เติม default กันพลาด ไม่กระทบพฤติกรรมของ Prisma
-- ─────────────────────────────────────────────────────────────
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT table_name FROM information_schema.columns
    WHERE table_schema = 'public' AND column_name = 'updated_at' AND column_default IS NULL
  LOOP
    EXECUTE format('ALTER TABLE public.%I ALTER COLUMN updated_at SET DEFAULT now()', r.table_name);
  END LOOP;
END $$;

-- ─────────────────────────────────────────────────────────────
-- 6. index ค้นหาข้อความ (pg_trgm) — ILIKE '%คำค้น%' ให้ใช้ index ได้
-- ─────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS properties_title_th_trgm
  ON public.properties USING gin (title_th gin_trgm_ops);
CREATE INDEX IF NOT EXISTS properties_project_name_trgm
  ON public.properties USING gin (project_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS owners_name_trgm
  ON public.owners USING gin ((first_name || ' ' || last_name) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS leads_name_trgm
  ON public.leads USING gin (name gin_trgm_ops);

-- ─────────────────────────────────────────────────────────────
-- 7. RLS — เปิดทุกตารางเป็น default deny
--
--    หมายเหตุสำคัญ: `api` ต่อ DB ด้วย Prisma ในฐานะ table owner ซึ่ง **bypass RLS**
--    ตามดีไซน์ของ spec (api เป็นด่านหลัก, RLS เป็น defense-in-depth)
--    RLS ที่นี่จึงมีผลกับ `anon` / `authenticated` ที่มาทาง supabase-js เท่านั้น
-- ─────────────────────────────────────────────────────────────
DO $$
DECLARE
  t text;
BEGIN
  FOR t IN
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
  END LOOP;
END $$;

-- ตัดสิทธิ์ทั้งหมดของ anon/authenticated ก่อน แล้วค่อยคืนเฉพาะที่ web-public ต้องอ่าน
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM anon, authenticated;

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON public.properties         TO anon, authenticated;
GRANT SELECT ON public.property_images    TO anon, authenticated;
GRANT SELECT ON public.amenities          TO anon, authenticated;
GRANT SELECT ON public.property_amenities TO anon, authenticated;

-- web-public อ่านได้เฉพาะทรัพย์ที่เผยแพร่แล้ว
DROP POLICY IF EXISTS properties_public_read ON public.properties;
CREATE POLICY properties_public_read ON public.properties
  FOR SELECT TO anon, authenticated
  USING (status = 'available'::public.property_status);

DROP POLICY IF EXISTS property_images_public_read ON public.property_images;
CREATE POLICY property_images_public_read ON public.property_images
  FOR SELECT TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = property_images.property_id
        AND p.status = 'available'::public.property_status
    )
  );

DROP POLICY IF EXISTS amenities_public_read ON public.amenities;
CREATE POLICY amenities_public_read ON public.amenities
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS property_amenities_public_read ON public.property_amenities;
CREATE POLICY property_amenities_public_read ON public.property_amenities
  FOR SELECT TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = property_amenities.property_id
        AND p.status = 'available'::public.property_status
    )
  );

-- ─────────────────────────────────────────────────────────────
-- 8. Supabase Storage — แยก bucket public / private ตาม spec section 9
-- ─────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'storage' AND table_name = 'buckets'
  ) THEN
    RAISE NOTICE 'storage schema not found — skipping bucket setup';
    RETURN;
  END IF;

  INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES
    ('property-images', 'property-images', true, 10485760,
     ARRAY['image/jpeg', 'image/png', 'image/webp']),
    ('documents', 'documents', false, 26214400,
     ARRAY['application/pdf', 'image/jpeg', 'image/png'])
  ON CONFLICT (id) DO UPDATE
    SET public             = EXCLUDED.public,
        file_size_limit    = EXCLUDED.file_size_limit,
        allowed_mime_types = EXCLUDED.allowed_mime_types;

  -- รูปทรัพย์: อ่านได้สาธารณะ / เขียนได้เฉพาะ service_role (ผ่าน api)
  DROP POLICY IF EXISTS property_images_read ON storage.objects;
  CREATE POLICY property_images_read ON storage.objects
    FOR SELECT TO anon, authenticated
    USING (bucket_id = 'property-images');

  -- bucket `documents` ไม่มี policy ใดๆ → anon/authenticated เข้าไม่ถึงเลย
  -- ต้องขอ signed URL ผ่าน GET /api/documents/:id/download เท่านั้น
END $$;
