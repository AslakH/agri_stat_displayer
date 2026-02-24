import { readFile } from "node:fs/promises";
import path from "node:path";
import type { DatasetPackage } from "./lib/contracts";
import { publicDatasetsDir, rootDir, writeJson } from "./lib/io";
import { getGeneratedAt } from "./lib/timestamps";

const DATASET_ID = "agricola_norge_full_4p_play_agricola";
const INPUT_DATASET_PATH = path.join(publicDatasetsDir, `${DATASET_ID}.json`);
const OUTPUT_BASELINE_PATH = path.join(rootDir, "public", "baselines", "agricola_norge_hand_strength_baseline.json");

const OCCUPATION_HAND_SIZE = 7;
const MINOR_HAND_SIZE = 7;

interface Histogram {
  min: number;
  max: number;
  counts: number[];
}

interface HandStrengthBaselineFile {
  baselineId: "agricola_norge_hand_strength_baseline";
  datasetId: string;
  generatedAt: string;
  simulationCount: number;
  histogramBins: number;
  seed: number;
  handShape: {
    occupation: number;
    minorImprovement: number;
  };
  poolSizes: {
    all: number;
    occupation: number;
    minorImprovement: number;
  };
  metrics: {
    allAverage: Histogram;
    allMedian: Histogram;
    occupationAverage: Histogram;
    occupationMedian: Histogram;
    minorAverage: Histogram;
    minorMedian: Histogram;
  };
}

const asPositiveInt = (value: string | undefined, fallback: number): number => {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const asSeed = (value: string | undefined, fallback: number): number => {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed)) {
    return fallback;
  }

  return parsed >>> 0;
};

const mulberry32 = (seed: number): (() => number) => {
  let state = seed >>> 0;

  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let result = Math.imul(state ^ (state >>> 15), 1 | state);
    result ^= result + Math.imul(result ^ (result >>> 7), 61 | result);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
};

const sampleWithoutReplacement = (values: number[], size: number, random: () => number): number[] => {
  if (size > values.length) {
    throw new Error(`Cannot sample ${size} values from a pool of ${values.length}.`);
  }

  const selected = new Set<number>();
  const poolSize = values.length;
  for (let j = poolSize - size; j < poolSize; j += 1) {
    const t = Math.floor(random() * (j + 1));
    if (selected.has(t)) {
      selected.add(j);
    } else {
      selected.add(t);
    }
  }

  const picked: number[] = [];
  for (const index of selected) {
    picked.push(values[index]);
  }

  return picked;
};

const average = (values: number[]): number => values.reduce((total, value) => total + value, 0) / values.length;

const median = (values: number[]): number => {
  const sorted = [...values].sort((a, b) => a - b);
  const center = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) {
    return sorted[center];
  }
  return (sorted[center - 1] + sorted[center]) / 2;
};

const toHistogram = (values: number[], bins: number): Histogram => {
  if (values.length === 0) {
    throw new Error("Cannot build histogram from an empty value list.");
  }

  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  for (const value of values) {
    if (value < min) {
      min = value;
    }
    if (value > max) {
      max = value;
    }
  }

  const counts = new Array<number>(bins).fill(0);
  if (min === max) {
    counts[0] = values.length;
    return { min, max, counts };
  }

  const range = max - min;
  for (const value of values) {
    let index = Math.floor(((value - min) / range) * bins);
    if (index >= bins) {
      index = bins - 1;
    } else if (index < 0) {
      index = 0;
    }

    counts[index] += 1;
  }

  return { min, max, counts };
};

const run = async (): Promise<void> => {
  const simulationCount = asPositiveInt(process.env.HAND_STRENGTH_SIMULATIONS, 100_000);
  const histogramBins = asPositiveInt(process.env.HAND_STRENGTH_HISTOGRAM_BINS, 400);
  const seed = asSeed(process.env.HAND_STRENGTH_SEED, 20260224);

  const dataset = JSON.parse(await readFile(INPUT_DATASET_PATH, "utf-8")) as DatasetPackage;
  if (dataset.manifest.id !== DATASET_ID) {
    throw new Error(`Unexpected dataset id: ${dataset.manifest.id}. Expected ${DATASET_ID}.`);
  }

  const pwrByCanonicalId = new Map<string, number>();
  for (const stat of dataset.stats) {
    if (typeof stat.pwr === "number" && Number.isFinite(stat.pwr)) {
      pwrByCanonicalId.set(stat.canonicalId, stat.pwr);
    }
  }

  const occupationPwrs: number[] = [];
  const minorPwrs: number[] = [];
  for (const card of dataset.cards) {
    const pwr = pwrByCanonicalId.get(card.canonicalId);
    if (pwr === undefined) {
      continue;
    }

    if (card.cardType === "occupation") {
      occupationPwrs.push(pwr);
    } else if (card.cardType === "minor_improvement") {
      minorPwrs.push(pwr);
    }
  }

  if (occupationPwrs.length < OCCUPATION_HAND_SIZE || minorPwrs.length < MINOR_HAND_SIZE) {
    throw new Error(
      `Not enough cards with PWR. Occupations=${occupationPwrs.length}, minors=${minorPwrs.length}, required=7+7.`
    );
  }

  const random = mulberry32(seed);

  const allAverage = new Array<number>(simulationCount);
  const allMedian = new Array<number>(simulationCount);
  const occupationAverage = new Array<number>(simulationCount);
  const occupationMedian = new Array<number>(simulationCount);
  const minorAverage = new Array<number>(simulationCount);
  const minorMedian = new Array<number>(simulationCount);

  for (let i = 0; i < simulationCount; i += 1) {
    const occupationSample = sampleWithoutReplacement(occupationPwrs, OCCUPATION_HAND_SIZE, random);
    const minorSample = sampleWithoutReplacement(minorPwrs, MINOR_HAND_SIZE, random);
    const allSample = occupationSample.concat(minorSample);

    occupationAverage[i] = average(occupationSample);
    occupationMedian[i] = median(occupationSample);
    minorAverage[i] = average(minorSample);
    minorMedian[i] = median(minorSample);
    allAverage[i] = average(allSample);
    allMedian[i] = median(allSample);
  }

  const baseline: HandStrengthBaselineFile = {
    baselineId: "agricola_norge_hand_strength_baseline",
    datasetId: DATASET_ID,
    generatedAt: getGeneratedAt(),
    simulationCount,
    histogramBins,
    seed,
    handShape: {
      occupation: OCCUPATION_HAND_SIZE,
      minorImprovement: MINOR_HAND_SIZE
    },
    poolSizes: {
      all: occupationPwrs.length + minorPwrs.length,
      occupation: occupationPwrs.length,
      minorImprovement: minorPwrs.length
    },
    metrics: {
      allAverage: toHistogram(allAverage, histogramBins),
      allMedian: toHistogram(allMedian, histogramBins),
      occupationAverage: toHistogram(occupationAverage, histogramBins),
      occupationMedian: toHistogram(occupationMedian, histogramBins),
      minorAverage: toHistogram(minorAverage, histogramBins),
      minorMedian: toHistogram(minorMedian, histogramBins)
    }
  };

  await writeJson(OUTPUT_BASELINE_PATH, baseline);

  console.log(
    `norge_hand_strength_baseline: wrote ${OUTPUT_BASELINE_PATH} (simulations=${simulationCount}, bins=${histogramBins}).`
  );
};

void run();
