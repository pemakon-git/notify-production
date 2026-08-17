-- Extensions ต้องมีก่อน migration อื่นทั้งหมด
-- ชื่อโฟลเดอร์ขึ้นต้นด้วย "0_" เพื่อให้ Prisma เรียงรันเป็นตัวแรกก่อน timestamp migration ใดๆ
--
-- btree_gist : จำเป็นสำหรับ exclusion constraint กันนัดหมายชนกัน (spec rule 3)
--              — ทำให้ `agent_id WITH =` ใช้ร่วมกับ `tstzrange WITH &&` ใน GiST index เดียวได้
-- pg_trgm    : ค้นหาชื่อทรัพย์/โครงการแบบ partial match (ILIKE '%...%') ให้ใช้ index ได้

CREATE EXTENSION IF NOT EXISTS btree_gist;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
