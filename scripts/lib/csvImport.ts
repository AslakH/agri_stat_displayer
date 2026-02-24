import { parse } from "csv-parse/sync";
import type { CardRecord, DatasetPackage, StatRecord } from "./contracts";
import { canonicalIdFromParts, normalizeCardType, normalizeEdition } from "./normalize";

const REQUIRED_COLUMNS = ["name", "card_type", "deck", "edition"] as const;

const asNumber = (value: string | undefined): number | undefined => {
  if (!value) {
    return undefined;
  }

  const normalized = value.trim().replace(",", ".");
  if (!normalized) {
    return undefined;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const asInteger = (value: string | undefined): number | undefined => {
  const parsed = asNumber(value);
  if (parsed === undefined) {
    return undefined;
  }
  return Number.isInteger(parsed) ? parsed : Math.round(parsed);
};

export const parseCsvRows = (csvText: string): Array<Record<string, string>> =>
  parse(csvText, {
    columns: true,
    skip_empty_lines: true,
    trim: true
  }) as Array<Record<string, string>>;

const ensureColumns = (rows: Array<Record<string, string>>): void => {
  if (rows.length === 0) {
    return;
  }

  const first = rows[0];
  for (const column of REQUIRED_COLUMNS) {
    if (!(column in first)) {
      throw new Error(`CSV is missing required column "${column}".`);
    }
  }
};

export const csvRowsToDatasetRecords = (
  rows: Array<Record<string, string>>
): Pick<DatasetPackage, "cards" | "stats"> => {
  ensureColumns(rows);

  const cards: CardRecord[] = [];
  const stats: StatRecord[] = [];

  for (const row of rows) {
    const name = row.name?.trim();
    if (!name) {
      continue;
    }

    const cardType = normalizeCardType(row.card_type);
    const deck = row.deck.trim();
    const edition = normalizeEdition(row.edition, deck);
    const canonicalId = canonicalIdFromParts(edition, cardType, name);

    const aliases = (row.aliases ?? "")
      .split(";")
      .map((alias) => alias.trim())
      .filter(Boolean);

    cards.push({
      canonicalId,
      name,
      aliases,
      cardType,
      deck,
      edition,
      text: row.text?.trim() ?? "",
      prerequisites: row.prerequisites?.trim() || undefined
    });

    const stat: StatRecord = {
      canonicalId,
      metricSet: row.metric_set?.trim() || "csv_import",
      dealPct: asNumber(row.deal_pct),
      playedPct: asNumber(row.played_pct),
      winPct: asNumber(row.win_pct),
      dealtCount: asInteger(row.dealt_count),
      draftedCount: asInteger(row.drafted_count),
      playedCount: asInteger(row.played_count),
      wonCount: asInteger(row.won_count),
      bannedCount: asInteger(row.banned_count),
      adp: asNumber(row.adp),
      pwr: asNumber(row.pwr),
      pwrNoLog: asNumber(row.pwr_no_log),
      sampleSize: asInteger(row.sample_size),
      notes: row.notes?.trim() || undefined
    };

    const hasStat = Object.entries(stat).some(
      ([key, value]) => key !== "canonicalId" && key !== "metricSet" && value !== undefined
    );
    if (hasStat) {
      stats.push(stat);
    }
  }

  return { cards, stats };
};
