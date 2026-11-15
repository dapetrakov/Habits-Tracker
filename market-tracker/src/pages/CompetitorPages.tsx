import { competitors, items } from '../data';
import { ItemList } from '../components/ItemCard';
import { itemsForCompetitor, monthsBefore, otherCompetitorItems, topicCounts } from '../lib/items';
import { TOPICS } from '../lib/schema';
import { formatDate, todayIso } from '../lib/format';
import type { FeedItem } from '../lib/items';

export const OTHER_SLUG = 'other';

export function CompetitorsIndex() {
  return (
    <>
      <h1>Competitors</h1>
      <ul className="folders">
        {competitors.map((c) => (
          <li key={c.slug}>
            <a href={`#/competitors/${c.slug}`}>{c.name}</a>
            <span className="n">{itemsForCompetitor(items, c.slug, competitors).length}</span>
          </li>
        ))}
        <li>
          <a href={`#/competitors/${OTHER_SLUG}`}>Other competitors</a>
          <span className="n">{otherCompetitorItems(items, competitors).length}</span>
        </li>
      </ul>
    </>
  );
}

function TopicTable({ list }: { list: FeedItem[] }) {
  const since = monthsBefore(todayIso(), 6);
  const counts = topicCounts(list, since, TOPICS);
  return (
    <section className="card topics">
      <h2>By topic, last 6 months</h2>
      <p className="window">Since {formatDate(since)}</p>
      <table>
        <tbody>
          {TOPICS.map((t) => (
            <tr key={t} className={counts.get(t) ? '' : 'zero'}>
              <th scope="row">{t}</th>
              <td>{counts.get(t)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

export function CompetitorPage({ slug }: { slug: string }) {
  if (slug === OTHER_SLUG) {
    const list = otherCompetitorItems(items, competitors);
    return (
      <>
        <h1>Other competitors</h1>
        <p className="intro">Competitor items whose company isn't in any folder. Add an alias in config/competitors.json to move one into a folder.</p>
        <TopicTable list={list} />
        <ItemList items={list} />
      </>
    );
  }
  const c = competitors.find((x) => x.slug === slug);
  if (!c) return <p className="empty">No competitor folder called “{slug}”.</p>;
  const list = itemsForCompetitor(items, slug, competitors);
  const names = [...new Set(list.map((i) => i.company))].filter((n) => n !== c.name);
  return (
    <>
      <h1>{c.name}</h1>
      <p className="intro">
        {list.length} item{list.length === 1 ? '' : 's'}
        {names.length > 0 && <> · includes items listed as {names.join(', ')}</>}
      </p>
      <TopicTable list={list} />
      <ItemList items={list} empty={`No items for ${c.name} yet.`} />
    </>
  );
}

