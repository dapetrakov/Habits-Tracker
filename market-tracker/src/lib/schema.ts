// The data-file schema and its validator.
// Used by the build (vite-plugin-market-data.ts), `npm run validate`,
// `npm run import-seed`, and the tests. Keep the schema stable:
// changes need sign-off (see CLAUDE.md).

export const TYPES = ['Competitor', 'Customer', 'Licensing round', 'Partner'] as const;
export const TOPICS = [
  'AI & data',
  'Software & licensing',
  'Surveys & reprocessing',
  'Contracts & awards',
  'M&A & partnerships',
  'Results & financials',
  'Budgets & activity',
  'Licensing rounds',
] as const;
export const REGIONS = ['Western Hemisphere', 'Eastern Hemisphere', 'Global'] as const;

export type ItemType = (typeof TYPES)[number];
export type Topic = (typeof TOPICS)[number];
export type Region = (typeof REGIONS)[number];

export interface Item {
  id: string;
  date: string;
  company: string;
  type: ItemType;
  topic: Topic;
  region: Region;
  headline: string;
  summary: string;
  source_name: string;
  source_url: string;
}

export interface ComingUp {
  date: string;
  event: string;
  url: string | null;
}

export interface UpdateFile {
  issue_date: string;
  window_start: string;
  window_end: string;
  top3: string[];
  items: Item[];
  coming_up: ComingUp[];
  conversation_starter: string;
}

/** The seed file holds imported history, not a real biweekly update. */
export const SEED_FILENAME = 'seed.json';
const DATED_FILENAME = /^(\d{4}-\d{2}-\d{2})\.json$/;

export function isValidDate(s: unknown): s is string {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(s + 'T00:00:00Z');
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

function isUrl(s: unknown): boolean {
  if (typeof s !== 'string') return false;
  try {
    const u = new URL(s);
    return u.protocol === 'https:' || u.protocol === 'http:';
  } catch {
    return false;
  }
}

const isNonEmptyString = (v: unknown): v is string => typeof v === 'string' && v.trim() !== '';
const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

function checkKeys(obj: Record<string, unknown>, allowed: readonly string[], where: string, errors: string[]) {
  for (const k of Object.keys(obj)) {
    if (!allowed.includes(k)) errors.push(`${where}: unknown field "${k}" (not in the schema)`);
  }
  for (const k of allowed) {
    if (!(k in obj)) errors.push(`${where}: missing required field "${k}"`);
  }
}

const ITEM_KEYS = ['id', 'date', 'company', 'type', 'topic', 'region', 'headline', 'summary', 'source_name', 'source_url'] as const;
const FILE_KEYS = ['issue_date', 'window_start', 'window_end', 'top3', 'items', 'coming_up', 'conversation_starter'] as const;
const COMING_KEYS = ['date', 'event', 'url'] as const;

/**
 * Validate one parsed data file. Returns a list of human-readable problems
 * (empty list = valid). `filename` is the base name, e.g. "2026-11-01.json".
 */
export function validateUpdateFile(data: unknown, filename: string): string[] {
  const errors: string[] = [];
  const isSeed = filename === SEED_FILENAME;
  const dated = DATED_FILENAME.exec(filename);
  if (!isSeed && !dated) {
    errors.push(`file name must be YYYY-MM-DD.json (or ${SEED_FILENAME})`);
  }
  if (!isObject(data)) {
    errors.push('top level must be a JSON object');
    return errors;
  }
  checkKeys(data, FILE_KEYS, 'file', errors);

  for (const k of ['issue_date', 'window_start', 'window_end'] as const) {
    if (k in data && !isValidDate(data[k])) errors.push(`${k}: must be a real date in YYYY-MM-DD format (got ${JSON.stringify(data[k])})`);
  }
  if (dated && isValidDate(data.issue_date) && data.issue_date !== dated[1]) {
    errors.push(`issue_date (${data.issue_date}) must match the file name (${dated[1]})`);
  }
  if (isValidDate(data.window_start) && isValidDate(data.window_end) && data.window_start > data.window_end) {
    errors.push('window_start must be on or before window_end');
  }
  if ('conversation_starter' in data) {
    const ok = isSeed ? typeof data.conversation_starter === 'string' : isNonEmptyString(data.conversation_starter);
    if (!ok) errors.push('conversation_starter: must be a non-empty string');
  }

  const ids = new Set<string>();
  if ('items' in data) {
    if (!Array.isArray(data.items)) {
      errors.push('items: must be an array');
    } else {
      data.items.forEach((raw, i) => {
        const where = `items[${i}]`;
        if (!isObject(raw)) {
          errors.push(`${where}: must be an object`);
          return;
        }
        const label = isNonEmptyString(raw.id) ? `${where} (id "${raw.id}")` : where;
        checkKeys(raw, ITEM_KEYS, label, errors);
        if ('id' in raw) {
          if (!isNonEmptyString(raw.id)) errors.push(`${label}.id: must be a non-empty string`);
          else if (ids.has(raw.id)) errors.push(`${label}.id: duplicate id in this file`);
          else ids.add(raw.id);
        }
        if ('date' in raw && !isValidDate(raw.date)) errors.push(`${label}.date: must be a real date in YYYY-MM-DD format (got ${JSON.stringify(raw.date)})`);
        for (const k of ['company', 'headline', 'summary', 'source_name'] as const) {
          if (k in raw && !isNonEmptyString(raw[k])) errors.push(`${label}.${k}: must be a non-empty string`);
        }
        if ('type' in raw && !TYPES.includes(raw.type as ItemType)) errors.push(`${label}.type: must be one of ${TYPES.join(' | ')} (got ${JSON.stringify(raw.type)})`);
        if ('topic' in raw && !TOPICS.includes(raw.topic as Topic)) errors.push(`${label}.topic: must be one of ${TOPICS.join(' | ')} (got ${JSON.stringify(raw.topic)})`);
        if ('region' in raw && !REGIONS.includes(raw.region as Region)) errors.push(`${label}.region: must be one of ${REGIONS.join(' | ')} (got ${JSON.stringify(raw.region)})`);
        if ('source_url' in raw && !isUrl(raw.source_url)) errors.push(`${label}.source_url: must be a full http(s) URL (got ${JSON.stringify(raw.source_url)})`);
      });
    }
  }

  if ('top3' in data) {
    if (!Array.isArray(data.top3) || !data.top3.every((x) => typeof x === 'string')) {
      errors.push('top3: must be an array of item ids');
    } else {
      // The seed file is history, so it has no Top 3. Real updates have exactly three.
      if (isSeed ? data.top3.length !== 0 && data.top3.length !== 3 : data.top3.length !== 3) {
        errors.push(`top3: must list exactly 3 item ids (got ${data.top3.length})`);
      }
      for (const id of data.top3) {
        if (!ids.has(id)) errors.push(`top3: "${id}" is not the id of an item in this file`);
      }
    }
  }

  if ('coming_up' in data) {
    if (!Array.isArray(data.coming_up)) {
      errors.push('coming_up: must be an array');
    } else {
      data.coming_up.forEach((raw, i) => {
        const where = `coming_up[${i}]`;
        if (!isObject(raw)) {
          errors.push(`${where}: must be an object`);
          return;
        }
        checkKeys(raw, COMING_KEYS, where, errors);
        if ('date' in raw && !isNonEmptyString(raw.date)) errors.push(`${where}.date: must be a non-empty string (YYYY-MM-DD or text)`);
        if ('event' in raw && !isNonEmptyString(raw.event)) errors.push(`${where}.event: must be a non-empty string`);
        if ('url' in raw && raw.url !== null && !isUrl(raw.url)) errors.push(`${where}.url: must be a full http(s) URL or null`);
      });
    }
  }
  return errors;
}

export function formatErrors(path: string, errors: string[]): string {
  return `Invalid data file ${path}:\n` + errors.map((e) => `  - ${e}`).join('\n');
}
