import type { CardRecord, CardType, DatasetPackage } from "./contracts";
import { canonicalIdFromParts, normalizeCardType, normalizeEdition } from "./normalize";

const asString = (value: unknown): string | undefined => (typeof value === "string" ? value.trim() : undefined);
const asRecord = (value: unknown): Record<string, unknown> | undefined =>
  value && typeof value === "object" ? (value as Record<string, unknown>) : undefined;

const asStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string").map((item) => item.trim());
};

interface CandidateCardShape {
  id?: unknown;
  literalID?: unknown;
  printedID?: unknown;
  playAgricolaCardID?: unknown;
  name?: unknown;
  nameEn?: unknown;
  nameJa?: unknown;
  title?: unknown;
  cardName?: unknown;
  card_type?: unknown;
  cardType?: unknown;
  type?: unknown;
  revision?: unknown;
  deck?: unknown;
  cardSet?: unknown;
  edition?: unknown;
  version?: unknown;
  text?: unknown;
  description?: unknown;
  effect?: unknown;
  prerequisites?: unknown;
  prerequisite?: unknown;
  aliases?: unknown;
}

const normalizeCardTypeKey = (value: string): CardType => {
  const key = value.toLocaleLowerCase().trim();
  if (key.startsWith("occupation")) {
    return "occupation";
  }
  if (key.startsWith("minor_improvement")) {
    return "minor_improvement";
  }
  if (key.startsWith("major_improvement")) {
    return "major_improvement";
  }

  return normalizeCardType(key);
};

const toCardType = (value: unknown): CardType => {
  const direct = asString(value);
  if (direct) {
    return normalizeCardTypeKey(direct);
  }

  const record = asRecord(value);
  const key = asString(record?.key) ?? asString(record?.nameEn);
  return normalizeCardTypeKey(key ?? "occupation");
};

const toDeck = (candidate: CandidateCardShape): string => {
  const directDeck = asString(candidate.deck) ?? asString(candidate.cardSet);
  if (directDeck) {
    return directDeck;
  }

  const deckRecord = asRecord(candidate.deck);
  const deckKey = asString(deckRecord?.key);
  if (deckKey) {
    const short = deckKey.split("_").pop();
    if (short) {
      return short.toUpperCase();
    }
  }

  const deckName = asString(deckRecord?.nameEn);
  if (deckName) {
    const extracted = deckName.match(/^([A-Z]+)-Deck$/i)?.[1];
    if (extracted) {
      return extracted.toUpperCase();
    }
  }

  return "UNK";
};

const toEdition = (candidate: CandidateCardShape, deck: string): "old" | "revised" | "mixed" => {
  const revision = asRecord(candidate.revision);
  const revisionKey = asString(revision?.key);
  if (revisionKey === "AG1") {
    return "old";
  }
  if (revisionKey === "AG2") {
    return "revised";
  }

  return normalizeEdition(asString(candidate.edition) ?? asString(candidate.version) ?? "mixed", deck);
};

const toName = (candidate: CandidateCardShape): string | null =>
  asString(candidate.nameEn) ??
  asString(candidate.name) ??
  asString(candidate.title) ??
  asString(candidate.cardName) ??
  asString(candidate.nameJa) ??
  null;

export const parseAgricolaDbCandidate = (candidate: CandidateCardShape): CardRecord | null => {
  const name = toName(candidate);
  if (!name) {
    return null;
  }

  let cardType: CardType;
  try {
    cardType = toCardType(candidate.cardType ?? candidate.card_type ?? candidate.type);
  } catch {
    return null;
  }
  const deck = toDeck(candidate);
  const edition = toEdition(candidate, deck);
  const text = asString(candidate.text) ?? asString(candidate.description) ?? asString(candidate.effect) ?? "";
  const prerequisites = asString(candidate.prerequisite) ?? asString(candidate.prerequisites) ?? "Not available.";
  const nameJa = asString(candidate.nameJa);
  const aliases = asStringArray(candidate.aliases);
  if (nameJa && nameJa !== name && !aliases.includes(nameJa)) {
    aliases.push(nameJa);
  }

  const metadata: Record<string, string | number | boolean> = {};
  const playAgricolaCardID = asString(candidate.playAgricolaCardID);
  const literalID = asString(candidate.literalID);
  const printedID = asString(candidate.printedID);
  const revision = asRecord(candidate.revision);
  const revisionKey = asString(revision?.key);
  if (playAgricolaCardID) {
    metadata.playAgricolaCardID = playAgricolaCardID;
  }
  if (literalID) {
    metadata.literalID = literalID;
  }
  if (printedID) {
    metadata.printedID = printedID;
  }
  if (revisionKey) {
    metadata.revisionKey = revisionKey;
  }

  return {
    canonicalId: canonicalIdFromParts(edition, cardType, name),
    name,
    aliases,
    cardType,
    deck,
    edition,
    text,
    prerequisites,
    metadata: Object.keys(metadata).length > 0 ? metadata : undefined
  };
};

const CARD_ARRAY_KEYS = [
  "cards",
  "data",
  "cardList",
  "items",
  "results"
] as const;

const pickCardArray = (value: unknown): unknown[] => {
  if (Array.isArray(value)) {
    return value;
  }

  if (!value || typeof value !== "object") {
    return [];
  }

  for (const key of CARD_ARRAY_KEYS) {
    const maybeArray = (value as Record<string, unknown>)[key];
    if (Array.isArray(maybeArray)) {
      return maybeArray;
    }

    const maybeConnection = asRecord(maybeArray);
    const edges = maybeConnection?.edges;
    if (Array.isArray(edges)) {
      return edges
        .map((edge) => asRecord(edge)?.node)
        .filter((node): node is Record<string, unknown> => Boolean(node));
    }
  }

  if ("data" in (value as Record<string, unknown>)) {
    const nested = (value as Record<string, unknown>).data;
    return pickCardArray(nested);
  }

  return [];
};

export const parseAgricolaDbPayload = (payload: unknown): CardRecord[] => {
  const rows = pickCardArray(payload);
  const parsed = rows
    .map((row) => parseAgricolaDbCandidate((row ?? {}) as CandidateCardShape))
    .filter((card): card is CardRecord => Boolean(card));

  const deduplicated = new Map<string, CardRecord>();
  for (const card of parsed) {
    if (!deduplicated.has(card.canonicalId)) {
      deduplicated.set(card.canonicalId, card);
    }
  }

  return Array.from(deduplicated.values()).sort((a, b) => a.name.localeCompare(b.name));
};

export const fallbackAgricolaDbCards = (): DatasetPackage["cards"] => [
  {
    canonicalId: "old:occupation:brushwood_collector",
    name: "Brushwood Collector",
    aliases: ["Brush Collector"],
    cardType: "occupation",
    deck: "E",
    edition: "old",
    text: "When you build fences, you need 1 less wood than usual.",
    prerequisites: "none"
  },
  {
    canonicalId: "old:occupation:clay_worker",
    name: "Clay Worker",
    aliases: [],
    cardType: "occupation",
    deck: "I",
    edition: "old",
    text: "At any time, you can exchange 1 reed for 1 clay.",
    prerequisites: "none"
  },
  {
    canonicalId: "old:occupation:plow_driver",
    name: "Plow Driver",
    aliases: ["Plough Driver"],
    cardType: "occupation",
    deck: "K",
    edition: "old",
    text: "Each time another player plows a field, you may plow 1 field.",
    prerequisites: "none"
  },
  {
    canonicalId: "old:minor_improvement:loom",
    name: "Loom",
    aliases: [],
    cardType: "minor_improvement",
    deck: "E",
    edition: "old",
    text: "At the end of each harvest, you can convert 2 sheep to 3 food.",
    prerequisites: "Pay 2 wood"
  },
  {
    canonicalId: "old:minor_improvement:piglet_shelter",
    name: "Piglet Shelter",
    aliases: [],
    cardType: "minor_improvement",
    deck: "I",
    edition: "old",
    text: "When you play this, immediately place 1 boar in your home.",
    prerequisites: "Pay 1 wood, 1 reed"
  },
  {
    canonicalId: "revised:occupation:field_watchman",
    name: "Field Watchman",
    aliases: [],
    cardType: "occupation",
    deck: "A",
    edition: "revised",
    text: "When you take a sowing action, gain 1 grain from the supply.",
    prerequisites: "none"
  },
  {
    canonicalId: "revised:occupation:sheep_whisperer",
    name: "Sheep Whisperer",
    aliases: [],
    cardType: "occupation",
    deck: "B",
    edition: "revised",
    text: "Each time you gain sheep, gain 1 extra sheep (max once per round).",
    prerequisites: "none"
  },
  {
    canonicalId: "revised:minor_improvement:clay_oven",
    name: "Clay Oven",
    aliases: [],
    cardType: "minor_improvement",
    deck: "D",
    edition: "revised",
    text: "Bake up to 2 grain for 5 food each when using a baking action.",
    prerequisites: "Pay 3 clay, 1 stone"
  },
  {
    canonicalId: "revised:major_improvement:cooking_hearth",
    name: "Cooking Hearth",
    aliases: [],
    cardType: "major_improvement",
    deck: "M",
    edition: "revised",
    text: "Bake bread and convert animals to food at improved rates.",
    prerequisites: "Pay 4 clay"
  }
];
