import { describe, expect, test } from "vitest";
import { csvRowsToDatasetRecords, parseCsvRows } from "./csvImport";

describe("csv importer", () => {
  test("creates cards and stats from valid CSV", () => {
    const csv = `name,card_type,deck,edition,win_pct,pwr
Clay Worker,occupation,I,old,25.0,1.2`;

    const rows = parseCsvRows(csv);
    const parsed = csvRowsToDatasetRecords(rows);

    expect(parsed.cards).toHaveLength(1);
    expect(parsed.cards[0].canonicalId).toBe("old:occupation:clay_worker");
    expect(parsed.stats).toHaveLength(1);
    expect(parsed.stats[0].winPct).toBe(25);
  });

  test("throws when required column is missing", () => {
    const csv = `name,deck,edition
Card A,E,old`;
    const rows = parseCsvRows(csv);
    expect(() => csvRowsToDatasetRecords(rows)).toThrow(/required column "card_type"/i);
  });
});
