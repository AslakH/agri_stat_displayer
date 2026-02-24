import { z } from "zod";

export type CardType = "occupation" | "minor_improvement" | "major_improvement";
export type Edition = "old" | "revised" | "mixed";

export interface ImportStatus {
  sourceMode?: string;
  sourceRows?: number;
  importedCards?: number;
  matchedCards?: number;
  unmatchedCards?: number;
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

export const CardTypeSchema = z.enum(["occupation", "minor_improvement", "major_improvement"]);
export const EditionSchema = z.enum(["old", "revised", "mixed"]);

export const ManifestSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  version: z.string().min(1),
  sourceName: z.string().min(1),
  sourceUrl: z.string().url(),
  edition: EditionSchema,
  comparabilityGroup: z.string().min(1),
  generatedAt: z.string().datetime({ offset: true }),
  licenseNote: z.string().min(1),
  hasFullCardText: z.boolean(),
  hasStats: z.boolean(),
  importStatus: z
    .object({
      sourceMode: z.string().min(1).optional(),
      sourceRows: z.number().int().nonnegative().optional(),
      importedCards: z.number().int().nonnegative().optional(),
      matchedCards: z.number().int().nonnegative().optional(),
      unmatchedCards: z.number().int().nonnegative().optional(),
      note: z.string().optional()
    })
    .optional()
});

export const CardSchema = z.object({
  canonicalId: z.string().min(1),
  name: z.string().min(1),
  aliases: z.array(z.string()),
  cardType: CardTypeSchema,
  deck: z.string().min(1).optional(),
  edition: EditionSchema.optional(),
  text: z.string(),
  prerequisites: z.string().optional(),
  metadata: z.record(z.union([z.string(), z.number(), z.boolean()])).optional()
});

export const StatSchema = z.object({
  canonicalId: z.string().min(1),
  metricSet: z.string().min(1),
  dealPct: z.number().optional(),
  playedPct: z.number().optional(),
  winPct: z.number().optional(),
  dealtCount: z.number().int().nonnegative().optional(),
  draftedCount: z.number().int().nonnegative().optional(),
  playedCount: z.number().int().nonnegative().optional(),
  wonCount: z.number().int().nonnegative().optional(),
  bannedCount: z.number().int().nonnegative().optional(),
  adp: z.number().optional(),
  pwr: z.number().optional(),
  pwrNoLog: z.number().optional(),
  sampleSize: z.number().int().nonnegative().optional(),
  notes: z.string().optional()
});

export const DatasetPackageSchema = z.object({
  manifest: ManifestSchema,
  cards: z.array(CardSchema),
  stats: z.array(StatSchema)
});

export interface DatasetIndexEntry {
  id: string;
  file: string;
  manifest: DatasetManifest;
}
