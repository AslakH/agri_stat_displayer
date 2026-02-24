import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import type { DatasetPackage } from "./lib/contracts";
import { csvRowsToDatasetRecords, parseCsvRows } from "./lib/csvImport";
import { publicDatasetsDir, rootDir, writeJson } from "./lib/io";
import { getGeneratedAt } from "./lib/timestamps";

const importsDir = path.join(rootDir, "datasets", "_imports");

const safeId = (fileName: string): string =>
  fileName
    .toLocaleLowerCase()
    .replace(/\.csv$/, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

const run = async (): Promise<void> => {
  let files: string[] = [];
  try {
    files = await readdir(importsDir);
  } catch {
    console.log("csv_import: datasets/_imports not found, skipping.");
    return;
  }

  const csvFiles = files.filter((file) => file.toLocaleLowerCase().endsWith(".csv"));
  if (csvFiles.length === 0) {
    console.log("csv_import: no CSV files found.");
    return;
  }

  for (const csvFile of csvFiles) {
    if (csvFile === "template.csv") {
      continue;
    }

    const fullPath = path.join(importsDir, csvFile);
    const csvText = await readFile(fullPath, "utf-8");
    const rows = parseCsvRows(csvText);
    const { cards, stats } = csvRowsToDatasetRecords(rows);
    const id = `custom_${safeId(csvFile)}`;
    const generatedAt = getGeneratedAt();

    const dataset: DatasetPackage = {
      manifest: {
        id,
        label: `Custom CSV: ${csvFile}`,
        version: generatedAt.slice(0, 10),
        sourceName: "Manual CSV Import",
        sourceUrl: `https://local-import.invalid/${encodeURIComponent(csvFile)}`,
        edition: "mixed",
        comparabilityGroup: id,
        generatedAt,
        licenseNote: "Manual CSV import.",
        hasFullCardText: cards.every((card) => card.text.trim().length > 0),
        hasStats: stats.length > 0
      },
      cards,
      stats
    };

    await writeJson(path.join(publicDatasetsDir, `${id}.json`), dataset);
    console.log(`csv_import: wrote ${id}.json with ${cards.length} cards.`);
  }
};

void run();
