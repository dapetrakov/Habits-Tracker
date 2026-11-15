import { describe, expect, it } from 'vitest';
import { canonicalType, firstSentence, normalizeDate, parseCsv, parseMarkdownLink } from '../src/lib/csv';

describe('csv helpers', () => {
  it('parses quoted fields with commas, quotes and newlines', () => {
    expect(parseCsv('a,b\r\n"x, y","say ""hi""\nthere"\n')).toEqual([['a', 'b'], ['x, y', 'say "hi"\nthere']]);
  });
  it('splits markdown links', () => {
    expect(parseMarkdownLink('[Offshore Energy](https://x.com/a_(b))')).toEqual({ name: 'Offshore Energy', url: 'https://x.com/a_(b)' });
    expect(parseMarkdownLink('[Reuters](https://reuters.com/x)')).toEqual({ name: 'Reuters', url: 'https://reuters.com/x' });
    expect(parseMarkdownLink('https://reuters.com/x')).toBeNull();
  });
  it('takes the first sentence without splitting on abbreviations or decimals', () => {
    expect(firstSentence('TGS Inc. won a 1.5 bn contract. More text here.')).toBe('TGS Inc. won a 1.5 bn contract.');
    expect(firstSentence('U.S. lease sale held. Next one in March.')).toBe('U.S. lease sale held.');
    expect(firstSentence('Only one sentence')).toBe('Only one sentence');
  });
  it('reads dates safely', () => {
    expect(normalizeDate('2026-3-5')).toBe('2026-03-05');
    expect(normalizeDate('5 Mar 2026')).toBe('2026-03-05');
    expect(normalizeDate('March 5, 2026')).toBe('2026-03-05');
    expect(normalizeDate('03/05/2026')).toBeNull();
    expect(normalizeDate('03/05/2026', 'mdy')).toBe('2026-03-05');
    expect(normalizeDate('03/05/2026', 'dmy')).toBe('2026-05-03');
    expect(normalizeDate('2026-02-30')).toBeNull();
  });
  it('normalises case of enum values', () => expect(canonicalType(' licensing ROUND ')).toBe('Licensing round'));
});
