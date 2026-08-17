/**
 * กัน MISSING_MESSAGE ตอน runtime — ตรวจว่า key ทุกตัวที่โค้ดเรียก `t('…')`
 * มีจริงทั้ง en.json และ th.json
 *
 * เขียนขึ้นหลังเจอบั๊กจริง: `ROLE_KEY` ชี้ไป `common.role.*` แต่ป้ายบทบาทอยู่ที่ `users.role.*`
 * (`common.role` คือคำว่า "Role" หัวคอลัมน์) → หน้า admin พังตอน render
 *
 * และตรวจกฎภาษาที่เจ้าของล็อกไว้: en.json ต้องไม่มีอักษรไทยเลย
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import en from '../messages/en.json';
import th from '../messages/th.json';

const ROOT = join(import.meta.dirname, '..');
const SCAN_DIRS = ['app', 'components', 'lib'];

function walk(dir: string): string[] {
  const out: string[] = [];

  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry.startsWith('.')) continue;

    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (/\.tsx?$/.test(entry)) out.push(full);
  }

  return out;
}

function resolveKey(catalog: unknown, key: string): unknown {
  return key
    .split('.')
    .reduce<unknown>(
      (node, part) =>
        node && typeof node === 'object' ? (node as Record<string, unknown>)[part] : undefined,
      catalog,
    );
}

/** เก็บ key จาก t('a.b'), t.rich('a.b') และค่าคงที่ *_KEY ที่ลงท้ายด้วย labelKey */
function extractKeys(source: string): string[] {
  const keys: string[] = [];

  /**
   * useTranslations('login') → t('email') หมายถึง `login.email`
   * เก็บ namespace ของไฟล์ไว้เติมหน้า key ที่ไม่มีจุด
   * (ไฟล์ที่มีหลาย namespace = เติมไม่ได้แน่นอน → ข้าม key เปล่าไปเลย ดีกว่าเดาผิด)
   */
  const namespaces = [
    ...new Set(
      [...source.matchAll(/\b(?:useTranslations|getTranslations)\(\s*'([a-zA-Z0-9_]+)'/g)]
        .map((match) => match[1])
        .filter((ns): ns is string => Boolean(ns)),
    ),
  ];
  const scope = namespaces.length === 1 ? namespaces[0] : null;

  // t('key') / t.rich('key')
  for (const match of source.matchAll(/\bt(?:\.rich)?\(\s*'([a-zA-Z0-9_.]+)'/g)) {
    const key = match[1];
    if (!key) continue;

    if (key.includes('.')) keys.push(key);
    else if (scope) keys.push(`${scope}.${key}`);
  }

  // labelKey: 'status.property.draft' และ map ป้ายอื่นใน lib/status.ts
  for (const match of source.matchAll(/(?:labelKey|_KEY)\s*[:=][^'\n]*'([a-zA-Z0-9_.]+\.[a-zA-Z0-9_.]+)'/g)) {
    if (match[1]) keys.push(match[1]);
  }
  for (const match of source.matchAll(/^\s{2,}[a-z_]+:\s*'((?:status|propertyType|leadSource|furnished|docType|docStatus|users|nav|navGroup|shell|common)\.[a-zA-Z0-9_.]+)',?$/gm)) {
    if (match[1]) keys.push(match[1]);
  }

  return keys;
}

const files = SCAN_DIRS.flatMap((dir) => walk(join(ROOT, dir)));
const used = [...new Set(files.flatMap((file) => extractKeys(readFileSync(file, 'utf8'))))].sort();

describe('i18n catalog', () => {
  it('สแกนเจอ key ที่โค้ดใช้จริง (กันกรณี regex พังแล้วเทสต์ผ่านเปล่าๆ)', () => {
    expect(used.length).toBeGreaterThan(20);
  });

  it('ทุก key ที่โค้ดเรียก มีจริงใน en.json', () => {
    const missing = used.filter((key) => typeof resolveKey(en, key) !== 'string');
    expect(missing, `ขาดใน en.json: ${missing.join(', ')}`).toEqual([]);
  });

  it('ทุก key ที่โค้ดเรียก มีจริงใน th.json', () => {
    const missing = used.filter((key) => typeof resolveKey(th, key) !== 'string');
    expect(missing, `ขาดใน th.json: ${missing.join(', ')}`).toEqual([]);
  });

  it('en.json ต้องไม่มีอักษรไทยเลย (กฎที่เจ้าของล็อกไว้)', () => {
    const thaiLines = JSON.stringify(en, null, 2)
      .split('\n')
      // ฿ (U+0E3F) อยู่ในบล็อกไทยแต่เป็นสัญลักษณ์สกุลเงิน ใช้ในภาษาอังกฤษได้
      .filter((line) => /[฀-๿]/.test(line.replace(/฿/g, '')));

    expect(thaiLines, `บรรทัดที่มีภาษาไทย:\n${thaiLines.join('\n')}`).toEqual([]);
  });

  it('en.json กับ th.json มีชุด key เหมือนกัน', () => {
    const flatten = (node: unknown, prefix = ''): string[] => {
      if (typeof node !== 'object' || node === null) return [prefix];
      return Object.entries(node as Record<string, unknown>).flatMap(([key, value]) =>
        flatten(value, prefix ? `${prefix}.${key}` : key),
      );
    };

    const enKeys = new Set(flatten(en));
    const thKeys = new Set(flatten(th));

    const onlyEn = [...enKeys].filter((key) => !thKeys.has(key));
    const onlyTh = [...thKeys].filter((key) => !enKeys.has(key));

    expect(onlyEn, `มีเฉพาะ en: ${onlyEn.join(', ')}`).toEqual([]);
    expect(onlyTh, `มีเฉพาะ th: ${onlyTh.join(', ')}`).toEqual([]);
  });
});
