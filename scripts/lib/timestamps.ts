export const getGeneratedAt = (): string => process.env.DATASET_GENERATED_AT ?? new Date().toISOString();
