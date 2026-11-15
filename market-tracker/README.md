# CMG Seismic Market Tracker

A shared, read-only feed of public market news for the CMG Seismic Solutions team.
Static site (Vite + React + TypeScript); all data comes from JSON files in this folder.

## Data

- `data/updates/YYYY-MM-DD.json`: one file per biweekly market update (schema in `src/lib/schema.ts`).
- `data/updates/seed.json`: imported history, made by `npm run import-seed` from `data/seed/tracker.csv`.
  It has no Top 3 / Coming up / conversation starter, so it doesn't show as an update card.
- `config/competitors.json`: competitor folders and the company names (aliases) that map to each.

Every file is validated at build time; an invalid file stops the build with a list of problems.

## Commands

```
npm install          # once
npm run dev          # http://localhost:5173
npm run dev:sample   # same, with fake demo data
npm run import-seed  # CSV → data/updates/seed.json
npm run validate     # check data files
npm test
npm run build        # output in dist/
```

## How it behaves

- **Feed**: all items, newest first, duplicates (same company + date + headline, ignoring case
  and punctuation) shown once; the copy from the newest update wins. Update cards (Top 3, Coming up,
  Conversation starter) appear at their issue date, and are hidden while a company/type/topic/region
  or text filter is on. Filters are kept in the URL, so a filtered view can be shared.
- **Competitors**: one page per folder: all of that company's items (any type) plus topic counts for
  the last 6 months. Competitor items matching no folder go to *Other competitors*.
- **Customers**: Customer and Licensing round items, grouped by region.
