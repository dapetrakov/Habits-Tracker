# CLAUDE.md

This repo holds two separate apps:

- Root (`index.html`, `app.js`, …): the personal Habits Tracker, deployed publicly to GitHub Pages.
- `market-tracker/`: **CMG Seismic Market Tracker**, a shared feed of public market news for the
  CMG Seismic Solutions team (Bluware, Sharp Reflections, SeisWare). Vite + React + TypeScript,
  static site, no backend.

## Rules for the Market Tracker (always follow)

- **Public information only.** Never add CMG internal data, customer deal terms, or SLB internal
  information, in data files, code, tests, samples, commits or anywhere else.
- **The app displays what the data files say.** Never generate, summarise, reword or "fix" item
  text (headlines, summaries, Top 3, Coming up, conversation starters). The seed import only
  copies text and takes the first sentence as the headline.
- **Keep the schema stable.** The schema lives in `market-tracker/src/lib/schema.ts`. If it needs
  to change (new field, new enum value, looser rule), ask the user first.
- Don't install anything globally or create accounts without asking.
- Don't deploy without the user's approval.

## Market Tracker workflow

Run from `market-tracker/`:

- `npm run dev`: local site using `data/updates/`
- `npm run dev:sample`: local site using clearly-fake demo data in `samples/` (never copy it into `data/`)
- `npm run validate`: check every data file against the schema
- `npm run import-seed`: `data/seed/tracker.csv` → `data/updates/seed.json` (add `-- --dates=mdy|dmy` for slash dates)
- `npm test` and `npm run build`: the build fails if any data file is invalid

Competitor folders and their aliases are in `market-tracker/config/competitors.json`.
