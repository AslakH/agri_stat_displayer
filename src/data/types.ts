export type CardType = "occupation" | "minor_improvement" | "major_improvement";
export type Edition = "old" | "revised" | "mixed";

export interface ImportStatus {
  sourceMode?: string;
  sourceRows?: number;
  importedCards?: number;
  matchedCards?: number;
  unmatchedCards?: number;
  fallbackUsed?: boolean;
  note?: string;
}

export interface DatasetManifest {
  id: string;
  label: string;
  version: string;
  sourceName: string;
  sourceUrl: string;
  edition: Edition;
  comparabilityGroup: string;
  generatedAt: string;
  licenseNote: string;
  hasFullCardText: boolean;
  hasStats: boolean;
  importStatus?: ImportStatus;
}

export interface CardRecord {
  canonicalId: string;
  name: string;
  aliases: string[];
  cardType: CardType;
  deck?: string;
  edition?: Edition;
  text: string;
  prerequisites?: string;
  metadata?: Record<string, string | number | boolean>;
}

export interface StatRecord {
  canonicalId: string;
  metricSet: string;
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
  notes?: string;
}

export interface DatasetPackage {
  manifest: DatasetManifest;
  cards: CardRecord[];
  stats: StatRecord[];
}

export interface DatasetIndexEntry {
  id: string;
  file: string;
  manifest: DatasetManifest;
}

export interface DatasetIndexFile {
  datasets: DatasetIndexEntry[];
}
