import { z } from "zod";

const CardTypeSchema = z.enum(["occupation", "minor_improvement", "major_improvement"]);
const EditionSchema = z.enum(["old", "revised", "mixed"]);

const ImportStatusSchema = z.object({
  sourceMode: z.string().min(1).optional(),
  sourceRows: z.number().int().nonnegative().optional(),
  importedCards: z.number().int().nonnegative().optional(),
  matchedCards: z.number().int().nonnegative().optional(),
  unmatchedCards: z.number().int().nonnegative().optional(),
  fallbackUsed: z.boolean().optional(),
  note: z.string().optional()
});

export const DatasetManifestSchema = z.object({
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
  importStatus: ImportStatusSchema.optional()
});

export const CardRecordSchema = z.object({
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

export const StatRecordSchema = z.object({
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
  manifest: DatasetManifestSchema,
  cards: z.array(CardRecordSchema),
  stats: z.array(StatRecordSchema)
});

export const DatasetIndexSchema = z.object({
  datasets: z.array(
    z.object({
      id: z.string().min(1),
      file: z.string().min(1),
      manifest: DatasetManifestSchema
    })
  )
});
