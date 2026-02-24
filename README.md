# agri_stat_displayer

Phone-first PWA for quick Agricola card lookup with switchable datasets.

## Features

1. Installable web app (PWA) for mobile use during play.
2. Fast card search by name, alias, and card text.
3. Dataset-aware filters (only show available type/deck/edition values).
4. Dataset switcher with comparability warnings when moving across metric groups.
5. Import status panel per dataset (matched/unmatched/source mode).
6. Card detail hides unavailable fields instead of flooding the UI with placeholders.

## Quick start

```bash
npm install
npm run dev
```

## iPhone usage

1. Open the deployed app URL in Safari.
2. Tap Share.
3. Tap `Add to Home Screen`.
4. Launch from home screen for standalone app mode.

## Data workflow

```bash
npm run data:refresh
```

This runs:

1. `scripts/fetch_agricolacards.ts`
2. `scripts/ingest_agricola_norge.ts`
3. `scripts/validate_datasets.ts`

See `docs/datasets.md` for source details and import format.

If your GitHub repository name is not `agri_stat_displayer`, update `VITE_BASE_PATH` in `.github/workflows/deploy.yml`.
