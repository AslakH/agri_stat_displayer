import { DatasetIndexSchema, DatasetPackageSchema, HandStrengthBaselineSchema } from "./schemas";
import type { DatasetIndexEntry, DatasetPackage, HandStrengthBaseline } from "./types";

const toPublicUrl = (path: string): string => {
  const base = import.meta.env.BASE_URL ?? "/";
  const normalizedBase = base.endsWith("/") ? base.slice(0, -1) : base;

  if (path.startsWith("/")) {
    return `${normalizedBase}${path}`;
  }

  return `${base}${path}`;
};

export const loadDatasetIndex = async (): Promise<DatasetIndexEntry[]> => {
  const response = await fetch(toPublicUrl("/datasets/index.json"));
  if (!response.ok) {
    throw new Error(`Failed to load dataset index: ${response.status} ${response.statusText}`);
  }

  const payload = await response.json();
  return DatasetIndexSchema.parse(payload).datasets;
};

export const loadDatasetPackage = async (entry: DatasetIndexEntry): Promise<DatasetPackage> => {
  const response = await fetch(toPublicUrl(entry.file));
  if (!response.ok) {
    throw new Error(`Failed to load dataset ${entry.id}: ${response.status} ${response.statusText}`);
  }

  const payload = await response.json();
  return DatasetPackageSchema.parse(payload);
};

export const loadNorgeHandStrengthBaseline = async (): Promise<HandStrengthBaseline> => {
  const response = await fetch(toPublicUrl("/baselines/agricola_norge_hand_strength_baseline.json"));
  if (!response.ok) {
    throw new Error(`Failed to load hand strength baseline: ${response.status} ${response.statusText}`);
  }

  const payload = await response.json();
  return HandStrengthBaselineSchema.parse(payload);
};
