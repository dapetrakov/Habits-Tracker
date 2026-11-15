import { useEffect } from 'react';
import { isSample, latestIssue } from './data';
import { formatDate } from './lib/format';
import { useRoute } from './lib/router';
import { FeedPage } from './pages/FeedPage';
import { CompetitorPage, CompetitorsIndex } from './pages/CompetitorPages';
import { CustomersPage } from './pages/CustomersPage';

export function App() {
  const { path, params } = useRoute();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [path]);

  let page: JSX.Element;
  let section: string;
  const comp = /^\/competitors\/([^/]+)$/.exec(path);
  if (comp) { page = <CompetitorPage slug={decodeURIComponent(comp[1])} />; section = 'competitors'; }
  else if (path === '/competitors') { page = <CompetitorsIndex />; section = 'competitors'; }
  else if (path === '/customers') { page = <CustomersPage />; section = 'customers'; }
  else { page = <FeedPage key="feed" params={params} />; section = 'feed'; }

  return (
    <>
      {isSample && <div className="sample-banner">SAMPLE DATA: made-up placeholder items for previewing the layout. Not real news.</div>}
      <header className="site">
        <div className="wrap">
          <a className="brand" href="#/">CMG Seismic Market Tracker</a>
          <span className="updated">Last updated: {latestIssue ? formatDate(latestIssue) : 'no data yet'}</span>
          <nav className="tabs">
            <a href="#/" aria-current={section === 'feed' ? 'page' : undefined}>Feed</a>
            <a href="#/competitors" aria-current={section === 'competitors' ? 'page' : undefined}>Competitors</a>
            <a href="#/customers" aria-current={section === 'customers' ? 'page' : undefined}>Customers</a>
          </nav>
        </div>
      </header>
      <main className="wrap">{page}</main>
      <footer className="wrap foot">Public sources only. Every item links to its source.</footer>
    </>
  );
}
