import { useEffect, useState } from 'react';

export interface Route {
  path: string;
  params: URLSearchParams;
}

function read(): Route {
  const raw = window.location.hash.replace(/^#/, '') || '/';
  const [path, query = ''] = raw.split('?');
  return { path: path || '/', params: new URLSearchParams(query) };
}

/** Tiny hash router: "#/competitors/tgs?x=y". Works on any static host. */
export function useRoute(): Route {
  const [route, setRoute] = useState(read);
  useEffect(() => {
    const on = () => setRoute(read());
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return route;
}

/** Update the query part without adding a history entry (used for filters). */
export function replaceQuery(path: string, params: URLSearchParams) {
  const q = params.toString();
  history.replaceState(null, '', `#${path}${q ? '?' + q : ''}`);
}
