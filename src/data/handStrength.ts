import type { CardRecord, HandStrengthHistogram, StatRecord } from "./types";

export interface PwrCardOption {
  canonicalId: string;
  name: string;
  cardType: "occupation" | "minor_improvement";
  pwr: number;
}

export interface PwrSummary {
  average: number;
  median: number;
}

export interface PwrSummaryByGroup {
  all: PwrSummary | null;
  occupation: PwrSummary | null;
  minor: PwrSummary | null;
}

const average = (values: number[]): number => values.reduce((total, value) => total + value, 0) / values.length;

const median = (values: number[]): number => {
  const sorted = [...values].sort((a, b) => a - b);
  const center = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) {
    return sorted[center];
  }
  return (sorted[center - 1] + sorted[center]) / 2;
};

export const summarizePwr = (values: number[]): PwrSummary | null => {
  if (values.length === 0) {
    return null;
  }

  return {
    average: average(values),
    median: median(values)
  };
};

export const summarizeByGroup = (all: number[], occupation: number[], minor: number[]): PwrSummaryByGroup => ({
  all: summarizePwr(all),
  occupation: summarizePwr(occupation),
  minor: summarizePwr(minor)
});

export const collectPwrCardOptions = (
  cards: CardRecord[],
  statsByCardId: Map<string, StatRecord>
): {
  all: PwrCardOption[];
  occupations: PwrCardOption[];
  minors: PwrCardOption[];
} => {
  const options: PwrCardOption[] = [];

  for (const card of cards) {
    if (card.cardType !== "occupation" && card.cardType !== "minor_improvement") {
      continue;
    }

    const stat = statsByCardId.get(card.canonicalId);
    if (typeof stat?.pwr !== "number" || !Number.isFinite(stat.pwr)) {
      continue;
    }

    options.push({
      canonicalId: card.canonicalId,
      name: card.name,
      cardType: card.cardType,
      pwr: stat.pwr
    });
  }

  options.sort((a, b) => a.name.localeCompare(b.name));

  return {
    all: options,
    occupations: options.filter((option) => option.cardType === "occupation"),
    minors: options.filter((option) => option.cardType === "minor_improvement")
  };
};

export const percentileFromHistogram = (histogram: HandStrengthHistogram, value: number): number => {
  const counts = histogram.counts;
  if (counts.length === 0) {
    return 0;
  }

  const total = counts.reduce((sum, count) => sum + count, 0);
  if (total <= 0) {
    return 0;
  }

  if (histogram.min === histogram.max) {
    return value >= histogram.max ? 100 : 0;
  }

  if (value <= histogram.min) {
    return 0;
  }

  if (value >= histogram.max) {
    return 100;
  }

  const bins = counts.length;
  const width = (histogram.max - histogram.min) / bins;
  if (width <= 0) {
    return 0;
  }

  const position = (value - histogram.min) / width;
  let index = Math.floor(position);
  if (index >= bins) {
    index = bins - 1;
  } else if (index < 0) {
    index = 0;
  }

  const countBeforeBin = counts.slice(0, index).reduce((sum, count) => sum + count, 0);
  const withinBinFraction = Math.max(0, Math.min(1, position - index));
  const estimatedCountAtValue = countBeforeBin + counts[index] * withinBinFraction;

  return (estimatedCountAtValue / total) * 100;
};
