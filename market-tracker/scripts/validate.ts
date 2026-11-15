// `npm run validate`: check every file in data/updates without building.
import { DataValidationError, loadDataDir } from './load-data';

const dir = process.argv[2] ?? 'data/updates';
try {
  const files = loadDataDir(dir);
  const items = files.reduce((n, f) => n + f.data.items.length, 0);
  console.log(`OK: ${files.length} file(s), ${items} item(s) in ${dir} are valid.`);
} catch (e) {
  if (e instanceof DataValidationError) {
    console.error(e.message);
    process.exit(1);
  }
  throw e;
}
