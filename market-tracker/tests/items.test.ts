import { describe, expect, it } from 'vitest';
import competitorConfig from '../config/competitors.json';
import { allItems, applyFilters, emptyFilters, matchCompetitor, monthsBefore, otherCompetitorItems } from '../src/lib/items';
import type { Item, UpdateFile } from '../src/lib/schema';

const cs = competitorConfig.competitors;
const item = (id: string, date: string, company: string, headline = 'h', type: Item['type'] = 'Competitor'): Item => ({
  id, date, company, type, topic: 'AI & data', region: 'Global', headline, summary: 's', source_name: 'P', source_url: 'https://e.com',
});
const upd = (issue: string, items: Item[]): UpdateFile => ({
  issue_date: issue, window_start: issue, window_end: issue, top3: [], items, coming_up: [], conversation_starter: 'x',
});

describe('items', () => {
  it('merges newest first and removes duplicates (same company + date + headline)', () => {
    const out = allItems([
      { file: 'seed.json', data: upd('2026-01-01', [item('s1', '2026-10-01', 'TGS', 'Same headline.')]) },
      { file: '2026-10-15.json', data: upd('2026-10-15', [item('a', '2026-10-01', 'tgs', 'Same  headline'), item('b', '2026-10-10', 'SLB')]) },
    ]);
    expect(out.map((i) => i.key)).toEqual(['2026-10-15.json#b', '2026-10-15.json#a']);
  });
  it('matches aliases to folders', () => {
    expect(matchCompetitor('Halliburton Landmark', cs)?.slug).toBe('halliburton');
    expect(matchCompetitor('schlumberger', cs)?.slug).toBe('slb');
    expect(matchCompetitor('Some Startup', cs)).toBeNull();
  });
  it('puts unmatched Competitor items in Other', () => {
    const list = allItems([{ file: '2026-10-15.json', data: upd('2026-10-15', [item('a', '2026-10-01', 'Some Startup'), item('b', '2026-10-01', 'Some Customer', 'h', 'Customer'), item('c', '2026-10-01', 'TGS')]) }]);
    expect(otherCompetitorItems(list, cs).map((i) => i.id)).toEqual(['a']);
  });
  it('filters by text and date', () => {
    const list = allItems([{ file: '2026-10-15.json', data: upd('2026-10-15', [item('a', '2026-10-01', 'TGS', 'Survey award'), item('b', '2026-09-01', 'SLB')]) }]);
    expect(applyFilters(list, { ...emptyFilters, q: 'survey tgs' }).map((i) => i.id)).toEqual(['a']);
    expect(applyFilters(list, { ...emptyFilters, from: '2026-09-15' }).map((i) => i.id)).toEqual(['a']);
  });
  it('computes six months back', () => expect(monthsBefore('2026-11-15', 6)).toBe('2026-05-15'));
});
