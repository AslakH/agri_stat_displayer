import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import type { DatasetIndexEntry, DatasetPackage } from "./lib/contracts";
import { publicDatasetsDir, writeJson } from "./lib/io";
import { validateDatasetPackage } from "./lib/validate";

const REQUIRED_DATASET_IDS = new Set(["agricolacards_get_cards_local", "agricola_norge_full_4p_play_agricola"]);

const run = async (): Promise<void> => {
  const files = await readdir(publicDatasetsDir);
  const datasetFiles = files.filter((file) => file.endsWith(".json") && file !== "index.json");
  if (datasetFiles.length === 0) {
    throw new Error("No dataset JSON files found in public/datasets.");
  }

  const entries: DatasetIndexEntry[] = [];
  const errors: string[] = [];
  const seenIds = new Set<string>();

  for (const file of datasetFiles) {
    const fullPath = path.join(publicDatasetsDir, file);
    const payload = JSON.parse(await readFile(fullPath, "utf-8")) as DatasetPackage;
    const fileErrors = validateDatasetPackage(payload).map((message) => `${file}: ${message}`);
    errors.push(...fileErrors);

    if (seenIds.has(payload.manifest.id)) {
      errors.push(`${file}: duplicate dataset manifest id "${payload.manifest.id}".`);
    }
    seenIds.add(payload.manifest.id);

    entries.push({
      id: payload.manifest.id,
      file: `/datasets/${file}`,
      manifest: payload.manifest
    });
  }

  for (const requiredId of REQUIRED_DATASET_IDS) {
    if (!seenIds.has(requiredId)) {
      errors.push(`Missing required dataset "${requiredId}".`);
    }
  }

  if (errors.length > 0) {
    console.error("dataset validation failed:");
    for (const error of errors) {
      console.error(` - ${error}`);
    }
    process.exitCode = 1;
    return;
  }

  const sortedEntries = entries.sort((a, b) => a.manifest.label.localeCompare(b.manifest.label));
  await writeJson(path.join(publicDatasetsDir, "index.json"), { datasets: sortedEntries });

  console.log(`dataset validation passed for ${sortedEntries.length} datasets.`);
};

void run();
