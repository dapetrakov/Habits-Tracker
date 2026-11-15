import { REGIONS, TOPICS, TYPES } from '../lib/schema';
import { emptyFilters, type Filters } from '../lib/items';

interface Props {
  value: Filters;
  onChange: (f: Filters) => void;
  companies: string[];
}

export function FiltersBar({ value, onChange, companies }: Props) {
  const set = <K extends keyof Filters>(k: K, v: Filters[K]) => onChange({ ...value, [k]: v });
  const active = Object.values(value).some(Boolean);
  return (
    <form className="filters" onSubmit={(e) => e.preventDefault()} role="search">
      <label className="search">
        <span className="sr-only">Search</span>
        <input
          type="search"
          placeholder="Search headlines, summaries, companies…"
          value={value.q}
          onChange={(e) => set('q', e.target.value)}
        />
      </label>
      <div className="row">
        <label>
          From
          <input type="date" value={value.from} onChange={(e) => set('from', e.target.value)} />
        </label>
        <label>
          To
          <input type="date" value={value.to} onChange={(e) => set('to', e.target.value)} />
        </label>
        <label>
          Company
          <select value={value.company} onChange={(e) => set('company', e.target.value)}>
            <option value="">All</option>
            {companies.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <label>
          Type
          <select value={value.type} onChange={(e) => set('type', e.target.value as Filters['type'])}>
            <option value="">All</option>
            {TYPES.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </label>
        <label>
          Topic
          <select value={value.topic} onChange={(e) => set('topic', e.target.value as Filters['topic'])}>
            <option value="">All</option>
            {TOPICS.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </label>
        <label>
          Region
          <select value={value.region} onChange={(e) => set('region', e.target.value as Filters['region'])}>
            <option value="">All</option>
            {REGIONS.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </label>
        {active && (
          <button type="button" className="clear" onClick={() => onChange(emptyFilters)}>
            Clear filters
          </button>
        )}
      </div>
    </form>
  );
}
