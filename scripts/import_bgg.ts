import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import type { DatasetPackage } from "./lib/contracts";
import { csvRowsToDatasetRecords, parseCsvRows } from "./lib/csvImport";
import { publicDatasetsDir, rootDir, reportsDir, writeJson } from "./lib/io";
import { getGeneratedAt } from "./lib/timestamps";

const bggImportsDir = path.join(rootDir, "datasets", "_bgg");
const DEFAULT_BGG_SOURCE_URL = "https://boardgamegeek.com/boardgame/31260/agricola/files";

const safeId = (fileName: string): string =>
  fileName
    .toLocaleLowerCase()
    .replace(/\.(csv|json)$/, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

const pick = (row: Record<string, string>, keys: string[]): string | undefined => {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return undefined;
};

const normalizeCardType = (raw: string | undefined): string => {
  const value = (raw ?? "").toLocaleLowerCase();
  if (value.includes("major")) {
    return "major_improvement";
  }
  if (value.includes("minor") || value.includes("improvement")) {
    return "minor_improvement";
  }
  return "occupation";
};

const normalizeEdition = (raw: string | undefined, deck: string): string => {
  const value = (raw ?? "").toLocaleLowerCase();
  if (value.includes("revised") || ["A", "B", "C", "D", "M", "L", "CD"].includes(deck.toUpperCase())) {
    return "revised";
  }
  if (value.includes("old") || ["E", "I", "K", "X", "O", "Z"].includes(deck.toUpperCase())) {
    return "old";
  }
  return "mixed";
};

const toTemplateRows = (rows: Array<Record<string, string>>): Array<Record<string, string>> => {
  const normalizedRows: Array<Record<string, string>> = [];
  for (const row of rows) {
    const name = pick(row, ["name", "card_name", "card", "title"]);
    if (!name) {
      continue;
    }
    const deck = pick(row, ["deck", "card_deck", "deck_code"]) ?? "UNK";
    const cardTypeRaw = pick(row, ["card_type", "type", "cardtype"]);
    const editionRaw = pick(row, ["edition", "revision", "version"]);

    normalizedRows.push({
      name,
      card_type: normalizeCardType(cardTypeRaw),
      deck,
      edition: normalizeEdition(editionRaw, deck),
      text: pick(row, ["text", "description", "effect"]) ?? "",
      prerequisites: pick(row, ["prerequisites", "prerequisite"]) ?? "",
      aliases: pick(row, ["aliases", "alias"]) ?? "",
      metric_set: pick(row, ["metric_set", "metric", "source_metric"]) ?? "bgg_import",
      deal_pct: pick(row, ["deal_pct", "deal%", "dealt_pct"]) ?? "",
      played_pct: pick(row, ["played_pct", "played%", "play_pct"]) ?? "",
      win_pct: pick(row, ["win_pct", "win%", "won_pct"]) ?? "",
      dealt_count: pick(row, ["dealt_count", "dealt", "deal_count"]) ?? "",
      drafted_count: pick(row, ["drafted_count", "drafted"]) ?? "",
      played_count: pick(row, ["played_count", "played", "play_count"]) ?? "",
      won_count: pick(row, ["won_count", "won", "win_count"]) ?? "",
      banned_count: pick(row, ["banned_count", "banned"]) ?? "",
      adp: pick(row, ["adp"]) ?? "",
      pwr: pick(row, ["pwr"]) ?? "",
      pwr_no_log: pick(row, ["pwr_no_log", "pwr_nolog"]) ?? "",
      sample_size: pick(row, ["sample_size", "sample", "n"]) ?? "",
      notes: pick(row, ["notes", "note", "comment"]) ?? ""
    });
  }
  return normalizedRows;
};

const run = async (): Promise<void> => {
  let files: string[] = [];
  try {
    files = await readdir(bggImportsDir);
  } catch {
    console.log("bgg_import: datasets/_bgg not found, skipping.");
    return;
  }

  const csvFiles = files.filter((file) => file.toLocaleLowerCase().endsWith(".csv"));
  if (csvFiles.length === 0) {
    console.log("bgg_import: no CSV files found.");
    return;
  }

  const report: Array<{ file: string; inputRows: number; normalizedRows: number; cards: number; stats: number }> = [];

  for (const csvFile of csvFiles) {
    if (csvFile.toLocaleLowerCase() === "template.csv") {
      continue;
    }
    const fullPath = path.join(bggImportsDir, csvFile);
    const csvText = await readFile(fullPath, "utf-8");
    const inputRows = parseCsvRows(csvText);
    const templateRows = toTemplateRows(inputRows);
    const { cards, stats } = csvRowsToDatasetRecords(templateRows);
    const generatedAt = getGeneratedAt();
    const id = `bgg_${safeId(csvFile)}`;

    const dataset: DatasetPackage = {
      manifest: {
        id,
        label: `BGG Import: ${csvFile}`,
        version: generatedAt.slice(0, 10),
        sourceName: "BoardGameGeek (manual export)",
        sourceUrl: process.env.BGG_SOURCE_URL || DEFAULT_BGG_SOURCE_URL,
        edition: "mixed",
        comparabilityGroup: "bgg_manual_import",
        generatedAt,
        licenseNote: "Manual BoardGameGeek export.",
        hasFullCardText: cards.every((card) => card.text.trim().length > 0),
        hasStats: stats.length > 0
      },
      cards,
      stats
    };

    await writeJson(path.join(publicDatasetsDir, `${id}.json`), dataset);
    report.push({
      file: csvFile,
      inputRows: inputRows.length,
      normalizedRows: templateRows.length,
      cards: cards.length,
      stats: stats.length
    });
    console.log(`bgg_import: wrote ${id}.json with ${cards.length} cards.`);
  }

  await writeJson(path.join(reportsDir, "bgg_import_report.json"), report);
};

void run();
