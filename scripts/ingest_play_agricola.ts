import { access, readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { loadAliasMap } from "./lib/aliases";
import { parseNorgeHtml } from "./lib/agricolaNorge";
import type { CardRecord, CardType, DatasetPackage, StatRecord } from "./lib/contracts";
import { readJson, publicDatasetsDir, rawDataDir, reportsDir, writeJson, writeText } from "./lib/io";
import { canonicalIdFromParts, normalizeCardType, normalizeEdition, normalizeName } from "./lib/normalize";
import { getGeneratedAt } from "./lib/timestamps";

const DEFAULT_SOURCE_URLS = ["https://play-agricola.com/Agricola/Cards/index.php?id=1174"];
const LOCAL_DIR = path.join(rawDataDir, "play_agricola");
const OUTPUT_DATASET = path.join(publicDatasetsDir, "play_agricola_full_cards.json");
const OUTPUT_UNMATCHED = path.join(reportsDir, "unmatched_cards_play_agricola.json");

interface MatchMaps {
  cardByName: Map<string, CardRecord>;
  cardByTypeAndName: Map<string, CardRecord>;
}

const makeTypeNameKey = (cardType: CardType, normalizedName: string): string => `${cardType}:${normalizedName}`;

const buildCardMaps = (cards: CardRecord[]): MatchMaps => {
  const cardByName = new Map<string, CardRecord>();
  const cardByTypeAndName = new Map<string, CardRecord>();

  for (const card of cards) {
    const normalizedCardName = normalizeName(card.name);
    cardByName.set(normalizedCardName, card);
    cardByTypeAndName.set(makeTypeNameKey(card.cardType, normalizedCardName), card);
    for (const alias of card.aliases) {
      const normalizedAlias = normalizeName(alias);
      cardByName.set(normalizedAlias, card);
      cardByTypeAndName.set(makeTypeNameKey(card.cardType, normalizedAlias), card);
    }
  }

  return { cardByName, cardByTypeAndName };
};

const canReadFile = async (filePath: string): Promise<boolean> => {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
};

const sourceTypeToCardType = (rawType: string | undefined): CardType => {
  if (!rawType) {
    return "occupation";
  }

  const normalized = rawType.replace(/([a-z])([A-Z])/g, "$1 $2").trim();
  try {
    return normalizeCardType(normalized);
  } catch {
    return "occupation";
  }
};

const ensureUniqueCanonicalId = (
  preferredCanonicalId: string,
  sourceCardUuid: string | undefined,
  used: Set<string>
): string => {
  if (!used.has(preferredCanonicalId)) {
    return preferredCanonicalId;
  }

  if (sourceCardUuid) {
    const suffix = sourceCardUuid.replace(/[^a-z0-9]/gi, "").toLowerCase().slice(0, 10);
    const alternative = `${preferredCanonicalId}_${suffix}`;
    if (!used.has(alternative)) {
      return alternative;
    }
  }

  let index = 2;
  while (used.has(`${preferredCanonicalId}_${index}`)) {
    index += 1;
  }
  return `${preferredCanonicalId}_${index}`;
};

const findBestSourceHtml = async (): Promise<{ html: string; sourceUrl?: string; rowCount: number }> => {
  const candidates: Array<{ html: string; sourceUrl?: string; rowCount: number }> = [];

  if (await canReadFile(LOCAL_DIR)) {
    const localFiles = (await readdir(LOCAL_DIR)).filter((file) => file.toLocaleLowerCase().endsWith(".html"));
    for (const file of localFiles) {
      const fullPath = path.join(LOCAL_DIR, file);
      const html = await readFile(fullPath, "utf-8");
      const rowCount = parseNorgeHtml(html).length;
      candidates.push({ html, sourceUrl: `local:${file}`, rowCount });
    }
  }

  const sourceUrls = process.env.PLAY_AGRICOLA_URLS
    ? process.env.PLAY_AGRICOLA_URLS.split(",").map((url) => url.trim()).filter(Boolean)
    : DEFAULT_SOURCE_URLS;

  for (const url of sourceUrls) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        continue;
      }
      const html = await response.text();
      const rowCount = parseNorgeHtml(html).length;
      candidates.push({ html, sourceUrl: url, rowCount });
      const localPath = path.join(LOCAL_DIR, `${normalizeName(url)}.html`);
      await writeText(localPath, html);
    } catch {
      // ignore and continue
    }
  }

  return candidates.sort((a, b) => b.rowCount - a.rowCount)[0] ?? { html: "", rowCount: 0 };
};

const run = async (): Promise<void> => {
  const agricolaCardsPath = path.join(publicDatasetsDir, "agricolacards_get_cards_local.json");
  const agricolaCardsData = await readJson<DatasetPackage>(agricolaCardsPath);
  const cardMaps = buildCardMaps(agricolaCardsData.cards);
  const aliasMap = await loadAliasMap();

  const source = await findBestSourceHtml();
  if (!source.html || source.rowCount === 0) {
    await writeJson(OUTPUT_UNMATCHED, []);
    console.log("play_agricola: no playable source found. Add HTML files to data/raw/play_agricola.");
    return;
  }

  const parsedRows = parseNorgeHtml(source.html);
  if (parsedRows.length === 0) {
    await writeJson(OUTPUT_UNMATCHED, []);
    console.log("play_agricola: parsed zero rows.");
    return;
  }

  const cards = new Map<string, CardRecord>();
  const stats: StatRecord[] = [];
  const unmatched: Array<{
    name: string;
    normalizedName: string;
    sourceCardType?: string;
    sourceCardUuid?: string;
    sourcePlayAgricolaCardName?: string;
  }> = [];
  const usedCanonicalIds = new Set<string>();

  for (const row of parsedRows) {
    const normalizedName = normalizeName(row.name);
    const aliasTarget = aliasMap.get(normalizedName);
    const lookupName = aliasTarget ?? normalizedName;
    const rowCardType = sourceTypeToCardType(row.sourceCardType);

    const matchedCard =
      cardMaps.cardByTypeAndName.get(makeTypeNameKey(rowCardType, lookupName)) ??
      cardMaps.cardByName.get(lookupName);

    if (matchedCard) {
      const canonicalId = ensureUniqueCanonicalId(matchedCard.canonicalId, row.sourceCardUuid, usedCanonicalIds);
      usedCanonicalIds.add(canonicalId);
      cards.set(canonicalId, { ...matchedCard, canonicalId });
      stats.push({ canonicalId, metricSet: "play_agricola", ...row.stat });
      continue;
    }

    const cardType = sourceTypeToCardType(row.sourceCardType);
    const edition = normalizeEdition("old", row.deckHint);
    const baseCanonicalId = canonicalIdFromParts(edition, cardType, row.name);
    const canonicalId = ensureUniqueCanonicalId(baseCanonicalId, row.sourceCardUuid, usedCanonicalIds);
    usedCanonicalIds.add(canonicalId);

    cards.set(canonicalId, {
      canonicalId,
      name: row.name,
      aliases: row.sourcePlayAgricolaCardName ? [row.sourcePlayAgricolaCardName] : [],
      cardType,
      deck: row.deckHint ?? "UNK",
      edition,
      text: "",
      prerequisites: "Not available."
    });

    stats.push({
      canonicalId,
      metricSet: "play_agricola",
      ...row.stat,
      notes: "No direct metadata-reference match; card added from source row."
    });

    unmatched.push({
      name: row.name,
      normalizedName,
      sourceCardType: row.sourceCardType,
      sourceCardUuid: row.sourceCardUuid,
      sourcePlayAgricolaCardName: row.sourcePlayAgricolaCardName
    });
  }

  const generatedAt = getGeneratedAt();
  const dataset: DatasetPackage = {
    manifest: {
      id: "play_agricola_full_cards",
      label: "Play-Agricola Full Card Stats",
      version: generatedAt.slice(0, 10),
      sourceName: "Play-Agricola",
      sourceUrl: source.sourceUrl ?? DEFAULT_SOURCE_URLS[0],
      edition: "old",
      comparabilityGroup: "play_agricola_counts",
      generatedAt,
      licenseNote: "Derived from source tables. Verify source terms before redistribution.",
      hasFullCardText: Array.from(cards.values()).every((card) => card.text.trim().length > 0),
      hasStats: stats.length > 0
    },
    cards: Array.from(cards.values()).sort((a, b) => a.name.localeCompare(b.name)),
    stats
  };

  await writeJson(OUTPUT_DATASET, dataset);
  await writeJson(OUTPUT_UNMATCHED, unmatched);
  console.log(`play_agricola: wrote ${dataset.stats.length} rows (${unmatched.length} unmatched).`);
};

void run();
