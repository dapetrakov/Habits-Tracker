import { useMemo, useState } from 'react';
import { FiltersBar } from '../components/FiltersBar';
import { ItemCard } from '../components/ItemCard';
import { UpdateCard } from '../components/UpdateCard';
import { companies, items, updates } from '../data';
import { applyFilters, emptyFilters, onlyDateFilters, type Filters } from '../lib/items';
import { replaceQuery } from '../lib/router';

const PAGE = 100;
const KEYS = Object.keys(emptyFilters) as (keyof Filters)[];

function fromParams(p: URLSearchParams): Filters {
  const f = { ...emptyFilters } as Record<keyof Filters, string>;
  for (const k of KEYS) f[k] = p.get(k) ?? '';
  return f as Filters;
}

export function FeedPage({ params }: { params: URLSearchParams }) {
  const [filters, setFilters] = useState(() => fromParams(params));
  const [limit, setLimit] = useState(PAGE);

  const change = (f: Filters) => {
    setFilters(f);
    setLimit(PAGE);
    const p = new URLSearchParams();
    for (const k of KEYS) if (f[k]) p.set(k, f[k]);
    replaceQuery('/', p);
  };

  const matching = useMemo(() => applyFilters(items, filters), [filters]);

  // Interleave update header cards with items by date (an update sits above items of its issue date).
  // Header cards show only when no filter other than the date range is set.
  const entries = useMemo(() => {
    type Entry = { date: string; kind: 0 | 1; node: JSX.Element };
    const out: Entry[] = matching.slice(0, limit).map((i) => ({ date: i.date, kind: 1, node: <ItemCard key={i.key} item={i} /> }));
    if (onlyDateFilters(filters)) {
      const lastShown = matching[Math.min(limit, matching.length) - 1]?.date ?? '';
      for (const u of updates) {
        const d = u.data.issue_date;
        if (filters.from && d < filters.from) continue;
        if (filters.to && d > filters.to) continue;
        if (matching.length > limit && d < lastShown) continue; // not reached yet
        out.push({ date: d, kind: 0, node: <UpdateCard key={u.file} data={u.data} /> });
      }
    }
    return out.sort((a, b) => (a.date !== b.date ? (a.date < b.date ? 1 : -1) : a.kind - b.kind));
  }, [matching, limit, filters]);

  return (
    <>
      <FiltersBar value={filters} onChange={change} companies={companies} />
      <p className="count">
        {matching.length} item{matching.length === 1 ? '' : 's'}
        {matching.length !== items.length && ` of ${items.length}`}
      </p>
      {entries.length ? <div className="list">{entries.map((e) => e.node)}</div> : <p className="empty">{items.length ? 'Nothing matches these filters.' : 'No data yet. Add files to data/updates/.'}</p>}
      {matching.length > limit && (
        <button className="more" onClick={() => setLimit(limit + PAGE)}>
          Show more ({matching.length - limit} left)
        </button>
      )}
    </>
  );
}
