// Vite plugin: exposes the validated data files as `virtual:market-data`.
// Validation runs on every build and dev-server start; an invalid file stops the build.
import path from 'node:path';
import type { Plugin } from 'vite';
import { loadDataDir } from './scripts/load-data';

const ID = 'virtual:market-data';
const RESOLVED = '\0' + ID;

export function marketData(opts: { dir: string; sample: boolean }): Plugin {
  const dir = path.resolve(opts.dir);
  return {
    name: 'market-data',
    buildStart() {
      loadDataDir(dir); // fail fast, before anything is bundled
    },
    resolveId(id) {
      return id === ID ? RESOLVED : undefined;
    },
    load(id) {
      if (id !== RESOLVED) return;
      const files = loadDataDir(dir);
      return `export const files = ${JSON.stringify(files)};\nexport const isSample = ${opts.sample};\n`;
    },
    configureServer(server) {
      // Reload the page when data files are added, changed or removed.
      server.watcher.add(dir);
      const onChange = (file: string) => {
        if (!file.startsWith(dir)) return;
        const mod = server.moduleGraph.getModuleById(RESOLVED);
        if (mod) server.moduleGraph.invalidateModule(mod);
        server.ws.send({ type: 'full-reload' });
      };
      server.watcher.on('add', onChange);
      server.watcher.on('change', onChange);
      server.watcher.on('unlink', onChange);
    },
  };
}
