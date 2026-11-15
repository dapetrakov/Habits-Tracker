import { describe, expect, it } from 'vitest';
import { validateUpdateFile } from '../src/lib/schema';

const item = (id: string, extra: object = {}) => ({
  id, date: '2026-11-01', company: 'TGS', type: 'Competitor', topic: 'AI & data', region: 'Global',
  headline: 'h', summary: 's', source_name: 'P', source_url: 'https://example.com', ...extra,
});
const file = (extra: object = {}) => ({
  issue_date: '2026-11-13', window_start: '2026-10-30', window_end: '2026-11-12',
  top3: ['a', 'b', 'c'], items: [item('a'), item('b'), item('c')],
  coming_up: [{ date: 'Q1 2027', event: 'e', url: null }], conversation_starter: 'x', ...extra,
});

describe('validateUpdateFile', () => {
  it('accepts a valid file', () => expect(validateUpdateFile(file(), '2026-11-13.json')).toEqual([]));
  it('rejects a bad file name and mismatched issue_date', () => {
    expect(validateUpdateFile(file(), 'latest.json').join()).toMatch(/file name/);
    expect(validateUpdateFile(file(), '2026-11-14.json').join()).toMatch(/must match the file name/);
  });
  it('rejects wrong enums, bad dates, bad urls and unknown fields', () => {
    const errs = validateUpdateFile(file({ items: [item('a', { type: 'Rival', date: '2026-02-30', source_url: 'example.com', extra: 1 }), item('b'), item('c')] }), '2026-11-13.json').join('\n');
    expect(errs).toMatch(/type: must be one of/);
    expect(errs).toMatch(/date: must be a real date/);
    expect(errs).toMatch(/source_url/);
    expect(errs).toMatch(/unknown field "extra"/);
  });
  it('requires top3 to be three ids from the file', () => {
    expect(validateUpdateFile(file({ top3: ['a', 'b'] }), '2026-11-13.json').join()).toMatch(/exactly 3/);
    expect(validateUpdateFile(file({ top3: ['a', 'b', 'zzz'] }), '2026-11-13.json').join()).toMatch(/"zzz" is not the id/);
  });
  it('rejects duplicate ids and missing fields', () => {
    const errs = validateUpdateFile(file({ items: [item('a'), item('a'), { id: 'c' }] }), '2026-11-13.json').join('\n');
    expect(errs).toMatch(/duplicate id/);
    expect(errs).toMatch(/missing required field "headline"/);
  });
  it('lets the seed file have no Top 3 or starter', () =>
    expect(validateUpdateFile(file({ top3: [], conversation_starter: '' }), 'seed.json')).toEqual([]));
});
