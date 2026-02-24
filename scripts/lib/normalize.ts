import type { CardType, Edition } from "./contracts";

const CARD_TYPE_ALIASES: Record<string, CardType> = {
  occupation: "occupation",
  occ: "occupation",
  occupations: "occupation",
  minor: "minor_improvement",
  "minor improvement": "minor_improvement",
  minor_improvement: "minor_improvement",
  minorimprovement: "minor_improvement",
  major: "major_improvement",
  "major improvement": "major_improvement",
  major_improvement: "major_improvement",
  majorimprovement: "major_improvement"
};

const OLD_DECKS = new Set(["E", "I", "K"]);
const REVISED_DECKS = new Set(["A", "B", "C", "D", "M", "CD", "L"]);

export const normalizeName = (value: string): string =>
  value
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .toLocaleLowerCase()
    .trim()
    .replace(/\s+/g, "_");

export const normalizeCardType = (value: string): CardType => {
  const normalized = value.trim().toLocaleLowerCase().replace(/-/g, " ");
  const mapped = CARD_TYPE_ALIASES[normalized];
  if (!mapped) {
    throw new Error(`Unsupported card type: "${value}"`);
  }

  return mapped;
};

export const normalizeEdition = (value: string, deckHint?: string): Edition => {
  const normalized = value.trim().toLocaleLowerCase();
  if (normalized === "old") {
    return "old";
  }

  if (normalized === "revised") {
    return "revised";
  }

  if (normalized === "mixed") {
    return "mixed";
  }

  if (deckHint) {
    const deck = deckHint.trim().toUpperCase();
    if (OLD_DECKS.has(deck)) {
      return "old";
    }
    if (REVISED_DECKS.has(deck)) {
      return "revised";
    }
  }

  return "mixed";
};

export const canonicalIdFromParts = (edition: Edition, cardType: CardType, cardName: string): string =>
  `${edition}:${cardType}:${normalizeName(cardName)}`;
