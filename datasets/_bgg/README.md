# BGG Import Folder

Place BoardGameGeek-exported CSV files here, then run:

```bash
npm run data:import:bgg
```

## Notes

1. BoardGameGeek often blocks automated bots/challenges requests.
2. Use a browser and logged-in BGG account to download file resources manually.
3. Start from `datasets/_bgg/template.csv` if your export format is custom.

## Typical source pages

1. Main files page: `https://boardgamegeek.com/boardgame/31260/agricola/files`
2. Community spreadsheets or card stats uploads linked from that page.
