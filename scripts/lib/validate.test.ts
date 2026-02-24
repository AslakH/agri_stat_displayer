import { describe, expect, test } from "vitest";
import type { DatasetPackage } from "./contracts";
import { validateDatasetPackage } from "./validate";

const baseDataset: DatasetPackage = {
  manifest: {
    id: "x",
    label: "x",
    version: "1",
    sourceName: "src",
    sourceUrl: "https://example.com",
    edition: "old",
    comparabilityGroup: "group_x",
    generatedAt: "2026-02-24T00:00:00.000Z",
    licenseNote: "non-commercial",
    hasFullCardText: true,
    hasStats: true
  },
  cards: [
    {
      canonicalId: "old:occupation:clay_worker",
      name: "Clay Worker",
      aliases: [],
      cardType: "occupation",
      deck: "I",
      edition: "old",
      text: "text"
    }
  ],
  stats: [
    {
      canonicalId: "old:occupation:clay_worker",
      metricSet: "4p_comp",
      winPct: 25
    }
  ]
};

describe("dataset validation", () => {
  test("passes on valid dataset", () => {
    expect(validateDatasetPackage(baseDataset)).toHaveLength(0);
  });

  test("flags duplicates and invalid ranges", () => {
    const broken: DatasetPackage = {
      ...baseDataset,
      cards: [...baseDataset.cards, { ...baseDataset.cards[0] }],
      stats: [{ ...baseDataset.stats[0], winPct: 120 }]
    };

    const errors = validateDatasetPackage(broken);
    expect(errors.join(" ")).toMatch(/Duplicate card canonicalId/i);
    expect(errors.join(" ")).toMatch(/Invalid winPct/i);
  });
});
