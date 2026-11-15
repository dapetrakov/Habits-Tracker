// `npm run import-seed`: convert data/seed/tracker.csv into data/updates/seed.json.
//
// The text is copied as-is. headline = first sentence of "What happened".
// The "From" and "Added by" columns are not part of the schema and are not imported.
// If your dates look like 03/05/2026, say how to read them:
//   npm run import-seed -- --dates=mdy   (month/day/year)
//   npm run import-seed -- --dates=dmy   (day/month/year)
import fs from 'node:fs';
import path from 'node:path';
import {
  canonicalRegion, canonicalTopic, canonicalType, firstSentence, normalizeDate, parseCsv, parseMarkdownLink, slugify,
} from '../src/lib/csv';
import { SEED_FILENAME, formatErrors, validateUpdateFile, type Item, type UpdateFile } from '../src/lib/schema';

const IN = 'data/seed/tracker.csv';
const OUT = path.join('data/updates', SEED_FILENAME);
const COLUMNS = ['Date', 'Company', 'Type', 'Topic', 'Region', 'What happened (facts only)', 'Source', 'From', 'Added by'];

const datesArg = process.argv.find((a) => a.startsWith('--dates='))?.split('=')[1];
if (datesArg && datesArg !== 'mdy' && datesArg !== 'dmy') fail(`--dates must be "mdy" or "dmy" (got "${datesArg}")`);
const slashOrder = datesArg as 'mdy' | 'dmy' | undefined;

function fail(msg: string): never {
  console.error(`\nimport-seed failed:\n${msg}\n`);
  process.exit(1);
}

if (!fs.existsSync(IN)) fail(`${IN} not found. Export the tracker sheet as CSV and save it there.`);

const rows = parseCsv(fs.readFileSync(IN, 'utf8'));
if (rows.length < 2) fail(`${IN} has no data rows.`);

const header = rows[0].map((h) => h.trim());
const col: Record<string, number> = {};
const missing: string[] = [];
for (const name of COLUMNS) {
  const i = header.findIndex((h) => h.toLowerCase() === name.toLowerCase());
  if (i === -1) missing.push(name);
  col[name] = i;
}
// "From" and "Added by" are optional since they are not imported.
const required = missing.filter((m) => m !== 'From' && m !== 'Added by');
if (required.length) fail(`Missing column(s): ${required.join(', ')}\nFound: ${header.join(', ')}`);

const problems: string[] = [];
const items: Item[] = [];
const perKey = new Map<string, number>();

rows.slice(1).forEach((r, idx) => {
  const line = idx + 2; // spreadsheet row number (row 1 is the header)
  const get = (name: string) => (r[col[name]] ?? '').trim();
  const rowErr = (m: string) => problems.push(`  - row ${line}: ${m}`);

  const date = normalizeDate(get('Date'), slashOrder);
  if (!date) rowErr(`can't read date "${get('Date')}"` + (/\//.test(get('Date')) && !slashOrder ? ' (slash dates need --dates=mdy or --dates=dmy)' : ''));
  const company = get('Company');
  if (!company) rowErr('Company is empty');
  const type = canonicalType(get('Type'));
  if (!type) rowErr(`unknown Type "${get('Type')}"`);
  const topic = canonicalTopic(get('Topic'));
  if (!topic) rowErr(`unknown Topic "${get('Topic')}"`);
  const region = canonicalRegion(get('Region'));
  if (!region) rowErr(`unknown Region "${get('Region')}"`);
  const text = get('What happened (facts only)').replace(/\s+/g, ' ');
  if (!text) rowErr('"What happened" is empty');
  const link = parseMarkdownLink(get('Source'));
  if (!link) rowErr(`Source is not a markdown link [Publisher](url): "${get('Source')}"`);

  if (date && company && type && topic && region && text && link) {
    const key = `${date}-${slugify(company)}`;
    const n = (perKey.get(key) ?? 0) + 1;
    perKey.set(key, n);
    items.push({
      id: `seed-${key}-${n}`,
      date, company, type, topic, region,
      headline: firstSentence(text),
      summary: text,
      source_name: link.name,
      source_url: link.url,
    });
  }
});

if (problems.length) fail(`${problems.length} problem(s) in ${IN}; nothing was written:\n${problems.join('\n')}`);

items.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
const dates = items.map((i) => i.date).sort();
const seed: UpdateFile = {
  issue_date: dates[dates.length - 1],
  window_start: dates[0],
  window_end: dates[dates.length - 1],
  top3: [],
  items,
  coming_up: [],
  conversation_starter: '',
};

const errors = validateUpdateFile(seed, SEED_FILENAME);
if (errors.length) fail(formatErrors(OUT, errors));

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(seed, null, 2) + '\n');
console.log(`Wrote ${items.length} item(s) from ${IN} to ${OUT} (${seed.window_start} to ${seed.window_end}).`);
