import type { FeedItem } from '../lib/items';
import { formatDate } from '../lib/format';
import { ExternalLink } from './ExternalLink';

export function ItemCard({ item }: { item: FeedItem }) {
  const typeClass = 'badge type-' + item.type.toLowerCase().replace(/\s+/g, '-');
  return (
    <article className="card item">
      <div className="meta">
        <time dateTime={item.date}>{formatDate(item.date)}</time>
        <span className="company">{item.company}</span>
        <span className={typeClass}>{item.type}</span>
      </div>
      <h3 className="headline">
        <ExternalLink href={item.source_url}>{item.headline}</ExternalLink>
      </h3>
      <p className="summary">{item.summary}</p>
      <div className="meta small">
        <span className="tag">{item.topic}</span>
        <span className="tag">{item.region}</span>
        <span className="source">
          Source: <ExternalLink href={item.source_url}>{item.source_name} ↗</ExternalLink>
        </span>
      </div>
    </article>
  );
}

export function ItemList({ items, empty = 'No items.' }: { items: FeedItem[]; empty?: string }) {
  if (!items.length) return <p className="empty">{empty}</p>;
  return (
    <div className="list">
      {items.map((i) => (
        <ItemCard key={i.key} item={i} />
      ))}
    </div>
  );
}
