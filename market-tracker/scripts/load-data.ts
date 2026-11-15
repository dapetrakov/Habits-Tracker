// Node-side: read and validate every data file in a folder.
import fs from 'node:fs';
import path from 'node:path';
import { formatErrors, validateUpdateFile, type UpdateFile } from '../src/lib/schema';

export interface LoadedFile {
  file: string;
  data: UpdateFile;
}

export class DataValidationError extends Error {}

export function loadDataDir(dir: string): LoadedFile[] {
  if (!fs.existsSync(dir)) return [];
  const names = fs.readdirSync(dir).filter((n) => n.endsWith('.json')).sort();
  const problems: string[] = [];
  const out: LoadedFile[] = [];
  for (const name of names) {
    const full = path.join(dir, name);
    const rel = path.relative(process.cwd(), full);
    let parsed: unknown;
    try {
      parsed = JSON.parse(fs.readFileSync(full, 'utf8'));
    } catch (e) {
      problems.push(formatErrors(rel, [`not valid JSON: ${(e as Error).message}`]));
      continue;
    }
    const errors = validateUpdateFile(parsed, name);
    if (errors.length) problems.push(formatErrors(rel, errors));
    else out.push({ file: name, data: parsed as UpdateFile });
  }
  if (problems.length) {
    throw new DataValidationError(
      `\n${problems.join('\n\n')}\n\n${problems.length} data file(s) failed schema validation. Fix them and rebuild.\n`,
    );
  }
  return out;
}
