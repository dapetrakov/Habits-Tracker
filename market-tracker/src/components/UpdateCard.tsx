import type { UpdateFile } from '../lib/schema';
import { formatDate } from '../lib/format';
import { ExternalLink } from './ExternalLink';

export function UpdateCard({ data }: { data: UpdateFile }) {
  const byId = new Map(data.items.map((i) => [i.id, i]));
  return (
    <section className="card update" aria-label={`Market update ${data.issue_date}`}>
      <div className="update-head">
        <h2>Market update · {formatDate(data.issue_date)}</h2>
        <span className="window">
          Covers {formatDate(data.window_start)} – {formatDate(data.window_end)}
        </span>
      </div>

      {data.top3.length > 0 && (
        <div className="block">
          <h3>Top 3</h3>
          <ol>
            {data.top3.map((id) => {
              const it = byId.get(id)!;
              return (
                <li key={id}>
                  <strong>{it.company}:</strong> <ExternalLink href={it.source_url}>{it.headline}</ExternalLink>
                </li>
              );
            })}
          </ol>
        </div>
      )}

      {data.coming_up.length > 0 && (
        <div className="block">
          <h3>Coming up</h3>
          <ul>
            {data.coming_up.map((c, i) => (
              <li key={i}>
                <span className="when">{formatDate(c.date)}</span>{' '}
                {c.url ? <ExternalLink href={c.url}>{c.event}</ExternalLink> : c.event}
              </li>
            ))}
          </ul>
        </div>
      )}

      {data.conversation_starter && (
        <div className="block">
          <h3>Conversation starter</h3>
          <p className="starter">{data.conversation_starter}</p>
        </div>
      )}
    </section>
  );
}
