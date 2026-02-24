import { load } from "cheerio";
import type { StatRecord } from "./contracts";

export interface ParsedNorgeRow {
  name: string;
  sourceCardType?: string;
  sourceCardUuid?: string;
  sourcePlayAgricolaCardName?: string;
  deckHint?: string;
  stat: Omit<StatRecord, "canonicalId" | "metricSet">;
}

const normalizeHeader = (value: string): string =>
  value.toLocaleLowerCase().replace(/\s+/g, " ").trim().replace(/[^a-z0-9_ ]/g, "");

const parseNumber = (value: string): number | undefined => {
  const normalized = value.replace(",", ".").replace(/\s/g, "").trim();
  if (!normalized) {
    return undefined;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const parseInteger = (value: string): number | undefined => {
  const normalized = value.replace(/[,\.\s]/g, "").trim();
  if (!normalized) {
    return undefined;
  }

  const parsed = Number(normalized);
  return Number.isInteger(parsed) ? parsed : undefined;
};

const parsePercent = (value: string): number | undefined => {
  if (!value.includes("%")) {
    return undefined;
  }

  return parseNumber(value.replace("%", ""));
};

interface HeaderIndexes {
  cardName: number;
  cardType?: number;
  cardUuid?: number;
  playAgricolaCardName?: number;
  deck?: number;
  dealPct?: number;
  playedPct?: number;
  winPct?: number;
  dealtCount?: number;
  draftedCount?: number;
  playedCount?: number;
  wonCount?: number;
  bannedCount?: number;
  adp?: number;
  pwr?: number;
  pwrNoLog?: number;
  sampleSize?: number;
}

const resolveHeaderIndexes = (headers: string[]): HeaderIndexes => {
  const indexOf = (predicate: (value: string) => boolean): number | undefined => {
    const idx = headers.findIndex(predicate);
    return idx >= 0 ? idx : undefined;
  };

  return {
    cardName: indexOf((header) => header === "card_name") ?? indexOf((header) => header.includes("card name")) ?? 0,
    cardType: indexOf((header) => header === "card_type"),
    cardUuid: indexOf((header) => header === "card_uuid"),
    playAgricolaCardName: indexOf((header) => header.includes("play_agricola_card_name")),
    deck: indexOf((header) => header.includes("deck")),
    dealPct: indexOf((header) => header === "deal%"),
    playedPct: indexOf((header) => header === "played%"),
    winPct: indexOf((header) => header === "win%"),
    dealtCount: indexOf((header) => header === "dealt"),
    draftedCount: indexOf((header) => header === "drafted"),
    playedCount: indexOf((header) => header === "played"),
    wonCount: indexOf((header) => header === "won"),
    bannedCount: indexOf((header) => header === "banned"),
    adp: indexOf((header) => header === "adp"),
    pwr: indexOf((header) => header === "pwr"),
    pwrNoLog: indexOf((header) => header === "pwr_no_log"),
    sampleSize: indexOf((header) => header.includes("sample"))
  };
};

const inferDeckFromPlayAgricolaName = (value: string | undefined): string | undefined => {
  if (!value) {
    return undefined;
  }

  const normalized = value.toLocaleLowerCase();
  if (normalized.startsWith("xoccup-") || normalized.startsWith("xminor-")) {
    return "X";
  }
  if (normalized.startsWith("lfoccup-") || normalized.startsWith("lfminor-")) {
    return "LF";
  }
  if (normalized.startsWith("eoccup-") || normalized.startsWith("eminor-")) {
    return "E";
  }
  if (normalized.startsWith("ioccup-") || normalized.startsWith("iminor-")) {
    return "I";
  }
  if (normalized.startsWith("koccup-") || normalized.startsWith("kminor-")) {
    return "K";
  }

  return undefined;
};

export const parseNorgeRowFromCells = (cells: string[], indexes: HeaderIndexes): ParsedNorgeRow | null => {
  const name = cells[indexes.cardName]?.trim();
  if (!name) {
    return null;
  }

  const sourcePlayAgricolaCardName =
    indexes.playAgricolaCardName !== undefined ? cells[indexes.playAgricolaCardName]?.trim() : undefined;

  const dealtCount = indexes.dealtCount !== undefined ? parseInteger(cells[indexes.dealtCount] ?? "") : undefined;
  const draftedCount =
    indexes.draftedCount !== undefined ? parseInteger(cells[indexes.draftedCount] ?? "") : undefined;
  const playedCount = indexes.playedCount !== undefined ? parseInteger(cells[indexes.playedCount] ?? "") : undefined;
  const wonCount = indexes.wonCount !== undefined ? parseInteger(cells[indexes.wonCount] ?? "") : undefined;
  const bannedCount = indexes.bannedCount !== undefined ? parseInteger(cells[indexes.bannedCount] ?? "") : undefined;

  // Some sources publish percentages, others publish raw counts.
  const dealPct =
    indexes.dealPct !== undefined
      ? parsePercent(cells[indexes.dealPct] ?? "")
      : indexes.dealtCount !== undefined
        ? parsePercent(cells[indexes.dealtCount] ?? "")
        : undefined;
  const playedPct =
    indexes.playedPct !== undefined
      ? parsePercent(cells[indexes.playedPct] ?? "")
      : indexes.playedCount !== undefined
        ? parsePercent(cells[indexes.playedCount] ?? "")
        : undefined;
  const winPct =
    indexes.winPct !== undefined
      ? parsePercent(cells[indexes.winPct] ?? "")
      : indexes.wonCount !== undefined
        ? parsePercent(cells[indexes.wonCount] ?? "")
        : undefined;

  return {
    name,
    sourceCardType: indexes.cardType !== undefined ? cells[indexes.cardType]?.trim() : undefined,
    sourceCardUuid: indexes.cardUuid !== undefined ? cells[indexes.cardUuid]?.trim() : undefined,
    sourcePlayAgricolaCardName,
    deckHint:
      (indexes.deck !== undefined ? cells[indexes.deck]?.trim() : undefined) ??
      inferDeckFromPlayAgricolaName(sourcePlayAgricolaCardName),
    stat: {
      dealPct,
      playedPct,
      winPct,
      dealtCount,
      draftedCount,
      playedCount,
      wonCount,
      bannedCount,
      adp: indexes.adp !== undefined ? parseNumber(cells[indexes.adp] ?? "") : undefined,
      pwr: indexes.pwr !== undefined ? parseNumber(cells[indexes.pwr] ?? "") : undefined,
      pwrNoLog: indexes.pwrNoLog !== undefined ? parseNumber(cells[indexes.pwrNoLog] ?? "") : undefined,
      sampleSize:
        indexes.sampleSize !== undefined
          ? parseInteger(cells[indexes.sampleSize] ?? "")
          : dealtCount
    }
  };
};

const tableRowsToCells = (tableHtml: string): { headers: string[]; rows: string[][] } => {
  const $ = load(tableHtml);
  const table = $("table").first();
  const headers = table
    .find("thead th")
    .toArray()
    .map((node) => normalizeHeader($(node).text()));

  let bodyRows = table.find("tbody tr").toArray();
  if (bodyRows.length === 0) {
    bodyRows = table.find("tr").not("thead tr").toArray();
  }

  const rows = bodyRows.map((row) =>
    $(row)
      .find("td, th")
      .toArray()
      .map((cell) => $(cell).text().replace(/\s+/g, " ").trim())
  );

  return { headers, rows };
};

export const parseNorgeHtml = (html: string): ParsedNorgeRow[] => {
  const { headers, rows } = tableRowsToCells(html);
  if (rows.length === 0) {
    return [];
  }

  const normalizedHeaders = headers.length > 0 ? headers : rows.shift()!.map(normalizeHeader);
  const indexes = resolveHeaderIndexes(normalizedHeaders);

  return rows
    .map((cells) => parseNorgeRowFromCells(cells, indexes))
    .filter((row): row is ParsedNorgeRow => Boolean(row));
};
