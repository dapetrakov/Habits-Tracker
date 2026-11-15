// Helpers for the one-time seed import. Pure functions so they can be tested.
import { REGIONS, TOPICS, TYPES, isValidDate } from './schema';

/** RFC 4180 CSV parser: handles quoted fields, "" escapes, commas and newlines inside quotes. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  const s = text.replace(/^﻿/, ''); // strip Excel's byte-order mark
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inQuotes) {
      if (c === '"') {
        if (s[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && s[i + 1] === '\n') i++;
      row.push(field); rows.push(row); row = []; field = '';
    } else field += c;
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((f) => f.trim() !== ''));
}

/** Split "[Publisher](https://...)" into its parts. Returns null if it isn't a markdown link. */
export function parseMarkdownLink(s: string): { name: string; url: string } | null {
  const m = /^\s*\[([^\]]+)\]\(\s*(\S+?)\s*\)\s*$/.exec(s);
  return m ? { name: m[1].trim(), url: m[2] } : null;
}

const ABBREVIATIONS = new Set([
  'inc', 'ltd', 'co', 'corp', 'plc', 'llc', 'asa', 'sa', 'ag', 'bv', 'jr', 'sr', 'dr', 'mr', 'mrs', 'ms',
  'st', 'no', 'vs', 'approx', 'est', 'dept', 'u.s', 'u.k', 'e.g', 'i.e', 'jan', 'feb', 'mar', 'apr',
  'jun', 'jul', 'aug', 'sep', 'sept', 'oct', 'nov', 'dec', 'q1', 'q2', 'q3', 'q4',
]);

/**
 * The first sentence of a text, unchanged. A sentence ends at . ! or ? followed by
 * whitespace and then a capital letter, digit or quote, skipping common abbreviations
 * ("Inc.", "U.S.") and decimals ("1.5").
 */
export function firstSentence(text: string): string {
  const t = text.trim().replace(/\s+/g, ' ');
  const re = /[.!?](?=\s+["“'(]?[A-Z0-9])/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(t))) {
    if (m[0] === '.') {
      const before = t.slice(0, m.index);
      const word = (/([A-Za-z0-9.]+)$/.exec(before)?.[1] ?? '').toLowerCase();
      if (ABBREVIATIONS.has(word)) continue;
      if (/^[a-z]$/i.test(word)) continue; // initials, e.g. "J. Smith"
    }
    return t.slice(0, m.index + 1);
  }
  return t;
}

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12,
};
const pad = (n: number) => String(n).padStart(2, '0');

/**
 * Turn a spreadsheet date into YYYY-MM-DD. Accepts 2026-03-05, "5 Mar 2026",
 * "March 5, 2026", and slash dates only when `slashOrder` says how to read them
 * (03/05/2026 is ambiguous). Returns null if it can't be read with certainty.
 */
export function normalizeDate(raw: string, slashOrder?: 'mdy' | 'dmy'): string | null {
  const s = raw.trim();
  let y: number, mo: number, d: number;
  let m: RegExpExecArray | null;
  if ((m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s))) [y, mo, d] = [+m[1], +m[2], +m[3]];
  else if ((m = /^(\d{1,2})[ -]([A-Za-z]{3,9})\.?[ -,]+(\d{4})$/.exec(s)) && MONTHS[m[2].slice(0, 3).toLowerCase()])
    [y, mo, d] = [+m[3], MONTHS[m[2].slice(0, 3).toLowerCase()], +m[1]];
  else if ((m = /^([A-Za-z]{3,9})\.? (\d{1,2}),? (\d{4})$/.exec(s)) && MONTHS[m[1].slice(0, 3).toLowerCase()])
    [y, mo, d] = [+m[3], MONTHS[m[1].slice(0, 3).toLowerCase()], +m[2]];
  else if ((m = /^(\d{1,2})[/.](\d{1,2})[/.](\d{4})$/.exec(s)) && slashOrder)
    [y, mo, d] = slashOrder === 'mdy' ? [+m[3], +m[1], +m[2]] : [+m[3], +m[2], +m[1]];
  else return null;
  const iso = `${y}-${pad(mo)}-${pad(d)}`;
  return isValidDate(iso) ? iso : null;
}

/** Match a value to an allowed option ignoring case and extra spaces; returns the canonical spelling. */
export function canonical<T extends string>(raw: string, options: readonly T[]): T | null {
  const norm = (x: string) => x.trim().replace(/\s+/g, ' ').toLowerCase();
  return options.find((o) => norm(o) === norm(raw)) ?? null;
}

export const canonicalType = (s: string) => canonical(s, TYPES);
export const canonicalTopic = (s: string) => canonical(s, TOPICS);
export const canonicalRegion = (s: string) => canonical(s, REGIONS);

export function slugify(s: string): string {
  return s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'x';
}
