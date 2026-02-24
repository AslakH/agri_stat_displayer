import type { DatasetPackage } from "./contracts";
import { DatasetPackageSchema } from "./contracts";

const isInRange = (value: number | undefined, min: number, max: number): boolean =>
  value === undefined || (value >= min && value <= max);

export const validateDatasetPackage = (dataset: DatasetPackage): string[] => {
  const errors: string[] = [];
  const parsed = DatasetPackageSchema.safeParse(dataset);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      errors.push(`Schema: ${issue.path.join(".")}: ${issue.message}`);
    }
    return errors;
  }

  const cardIds = new Set<string>();
  for (const card of dataset.cards) {
    if (cardIds.has(card.canonicalId)) {
      errors.push(`Duplicate card canonicalId "${card.canonicalId}"`);
    }
    cardIds.add(card.canonicalId);

    if (card.canonicalId.startsWith("unresolved:")) {
      errors.push(`Unresolved card canonicalId "${card.canonicalId}"`);
    }
  }

  const statIds = new Set<string>();
  for (const stat of dataset.stats) {
    const statKey = `${stat.canonicalId}:${stat.metricSet}`;
    if (statIds.has(statKey)) {
      errors.push(`Duplicate stat key "${statKey}"`);
    }
    statIds.add(statKey);

    if (!isInRange(stat.dealPct, 0, 100)) {
      errors.push(`Invalid dealPct for "${stat.canonicalId}"`);
    }
    if (!isInRange(stat.playedPct, 0, 100)) {
      errors.push(`Invalid playedPct for "${stat.canonicalId}"`);
    }
    if (!isInRange(stat.winPct, 0, 100)) {
      errors.push(`Invalid winPct for "${stat.canonicalId}"`);
    }
    if (stat.sampleSize !== undefined && stat.sampleSize < 0) {
      errors.push(`Invalid sampleSize for "${stat.canonicalId}"`);
    }
    if (stat.dealtCount !== undefined && stat.dealtCount < 0) {
      errors.push(`Invalid dealtCount for "${stat.canonicalId}"`);
    }
    if (stat.draftedCount !== undefined && stat.draftedCount < 0) {
      errors.push(`Invalid draftedCount for "${stat.canonicalId}"`);
    }
    if (stat.playedCount !== undefined && stat.playedCount < 0) {
      errors.push(`Invalid playedCount for "${stat.canonicalId}"`);
    }
    if (stat.wonCount !== undefined && stat.wonCount < 0) {
      errors.push(`Invalid wonCount for "${stat.canonicalId}"`);
    }
    if (stat.bannedCount !== undefined && stat.bannedCount < 0) {
      errors.push(`Invalid bannedCount for "${stat.canonicalId}"`);
    }
    if (stat.canonicalId.startsWith("unresolved:")) {
      errors.push(`Unresolved stat canonicalId "${stat.canonicalId}"`);
    }
  }

  if (dataset.manifest.hasStats && dataset.stats.length === 0) {
    errors.push("Manifest says hasStats=true but stats is empty.");
  }
  if (dataset.manifest.hasFullCardText && dataset.cards.some((card) => card.text.trim().length === 0)) {
    errors.push("Manifest says hasFullCardText=true but one or more cards have empty text.");
  }

  return errors;
};
