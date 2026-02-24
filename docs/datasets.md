# Dataset Sources and Update Workflow

## Included built-in datasets

1. `agricolacards_get_cards_local`
   - Source: AgricolaCards
   - Reference: `https://www.agricolacards.com/get-cards`
   - Purpose: Card metadata snapshot (expansion, card title, cost, player count, text, type)
   - Terms note: Check source terms before redistribution
2. `agricola_norge_full_4p_play_agricola`
   - Source: Agricola Norge
   - URL: `https://agricola.no/play-agricola-4player-card-statistics/`
   - Purpose: Full 4-player card table (counts + ADP/PWR)

## Optional source-specific imports

1. Play-Agricola direct ingest
   - Script: `npm run data:ingest:playagricola`
   - Default URL: `https://play-agricola.com/Agricola/Cards/index.php?id=1174`
   - Fallback: put HTML snapshots in `data/raw/play_agricola/*.html`
2. BoardGameGeek imports (manual download)
   - Script: `npm run data:import:bgg`
   - Input folder: `datasets/_bgg/*.csv`
   - Use `datasets/_bgg/template.csv` as starter format.
   - BGG often blocks automated scraping/cloud requests. Manual export/download is the reliable path.
   - You should create a BGG account for access to files, subscriptions, and user-uploaded datasets.

## Optional manual imports

1. Place CSV files under `datasets/_imports/`.
2. Use `datasets/_imports/template.csv` as schema reference.
3. Keep deck/edition/type values consistent with the template to avoid validation errors.

Suggested manual source categories:

1. BoardGameGeek user files and spreadsheets (export to CSV).
2. BoardGameArena match exports or curated community sheets (if available to your account).
3. Local playgroup logs converted to the CSV template.

## Refresh commands

Run the complete refresh pipeline:

```bash
npm run data:refresh
```

For deterministic output timestamps in generated manifests:

```bash
DATASET_GENERATED_AT=2026-02-24T00:00:00.000Z npm run data:refresh
```

PowerShell equivalent:

```powershell
$env:DATASET_GENERATED_AT="2026-02-24T00:00:00.000Z"; npm run data:refresh
```

Individual steps:

```bash
npm run data:fetch:agricolacards
npm run data:ingest:norge
npm run data:ingest:playagricola
npm run data:import:csv
npm run data:import:bgg
npm run data:validate
```

## Outputs

1. Generated datasets: `public/datasets/*.json`
2. Dataset index: `public/datasets/index.json`
3. Raw source snapshots: `data/raw/`
4. Unmatched card mappings:
   - `reports/unmatched_cards_norge.json`
   - `reports/unmatched_cards_play_agricola.json`
5. BGG import summary: `reports/bgg_import_report.json`
6. Each dataset manifest can expose `importStatus` fields used by the app UI (`sourceMode`, `sourceRows`, `matchedCards`, `unmatchedCards`, etc.).

## Mapping notes

1. Alias mapping file: `datasets/_aliases.json`
2. Canonical ID format: `edition:card_type:normalized_name`
3. Source-specific cards that cannot map to the metadata reference dataset are still included with generated canonical IDs and a source note.
