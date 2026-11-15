// Combining files, de-duplicating, competitor matching and filtering. Display only:
// nothing here changes item text.
import { SEED_FILENAME, type Item, type ItemType, type Region, type Topic, type UpdateFile } from './schema';

export interface FeedItem extends Item {
  key: string; // unique across files: "<file>#<id>"
  file: string;
}

export interface Competitor {
  slug: string;
  name: string;
  aliases: string[];
}

const byDateDesc = <T extends { date: string }>(a: T, b: T) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0);
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

export const dedupKey = (i: Pick<Item, 'company' | 'date' | 'headline'>) =>
  `${norm(i.company)}|${i.date}|${norm(i.headline)}`;

/** Real biweekly updates, newest issue first (the seed file is history, not an update). */
export function updatesOf(files: { file: string; data: UpdateFile }[]) {
  return files
    .filter((f) => f.file !== SEED_FILENAME)
    .sort((a, b) => (a.data.issue_date < b.data.issue_date ? 1 : -1));
}

/**
 * Every item from every file, newest first, with duplicates (same company + date +
 * headline) removed. When an item appears twice, the copy from the newest update wins;
 * the seed file counts as oldest.
 */
export function allItems(files: { file: string; data: UpdateFile }[]): FeedItem[] {
  const ordered = [...updatesOf(files), ...files.filter((f) => f.file === SEED_FILENAME)];
  const seen = new Set<string>();
  const out: FeedItem[] = [];
  for (const { file, data } of ordered) {
    for (const item of data.items) {
      const k = dedupKey(item);
      if (seen.has(k)) continue;
      seen.add(k);
      out.push({ ...item, key: `${file}#${item.id}`, file });
    }
  }
  return out.sort(byDateDesc);
}

export function lastUpdated(files: { data: UpdateFile }[]): string | null {
  return files.reduce<string | null>((max, f) => (!max || f.data.issue_date > max ? f.data.issue_date : max), null);
}

/** Which competitor folder a company belongs to, by exact (case/punctuation-insensitive) alias match. */
export function matchCompetitor(company: string, competitors: Competitor[]): Competitor | null {
  const c = norm(company);
  return competitors.find((x) => [x.name, ...x.aliases].some((a) => norm(a) === c)) ?? null;
}

export function itemsForCompetitor(items: FeedItem[], slug: string, competitors: Competitor[]) {
  return items.filter((i) => matchCompetitor(i.company, competitors)?.slug === slug);
}

/** Competitor-type items whose company matches no folder. */
export function otherCompetitorItems(items: FeedItem[], competitors: Competitor[]) {
  return items.filter((i) => i.type === 'Competitor' && !matchCompetitor(i.company, competitors));
}

/** YYYY-MM-DD for the same day `months` months before `today`. */
export function monthsBefore(today: string, months: number): string {
  const d = new Date(today + 'T00:00:00Z');
  d.setUTCMonth(d.getUTCMonth() - months);
  return d.toISOString().slice(0, 10);
}

export function topicCounts(items: FeedItem[], since: string, topics: readonly Topic[]) {
  const counts = new Map<Topic, number>(topics.map((t) => [t, 0]));
  for (const i of items) if (i.date >= since) counts.set(i.topic, (counts.get(i.topic) ?? 0) + 1);
  return counts;
}

export interface Filters {
  from: string;
  to: string;
  company: string;
  type: ItemType | '';
  topic: Topic | '';
  region: Region | '';
  q: string;
}

export const emptyFilters: Filters = { from: '', to: '', company: '', type: '', topic: '', region: '', q: '' };

export function applyFilters(items: FeedItem[], f: Filters): FeedItem[] {
  const words = f.q.toLowerCase().split(/\s+/).filter(Boolean);
  return items.filter((i) => {
    if (f.from && i.date < f.from) return false;
    if (f.to && i.date > f.to) return false;
    if (f.company && i.company !== f.company) return false;
    if (f.type && i.type !== f.type) return false;
    if (f.topic && i.topic !== f.topic) return false;
    if (f.region && i.region !== f.region) return false;
    if (words.length) {
      const hay = `${i.company} ${i.headline} ${i.summary} ${i.source_name} ${i.topic} ${i.type} ${i.region}`.toLowerCase();
      if (!words.every((w) => hay.includes(w))) return false;
    }
    return true;
  });
}

/** Only date filters set (update header cards stay visible then). */
export const onlyDateFilters = (f: Filters) => !f.company && !f.type && !f.topic && !f.region && !f.q.trim();

export { byDateDesc };
