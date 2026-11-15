// All data the app shows, loaded and validated at build time.
import { files, isSample } from 'virtual:market-data';
import competitorConfig from '../config/competitors.json';
import { allItems, lastUpdated, updatesOf, type Competitor } from './lib/items';

export const competitors: Competitor[] = competitorConfig.competitors;
export const items = allItems(files);
export const updates = updatesOf(files);
export const latestIssue = lastUpdated(files);
export const companies = [...new Set(items.map((i) => i.company))].sort((a, b) => a.localeCompare(b));
export { files, isSample };
