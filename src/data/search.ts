import type { CardRecord, CardType, Edition } from "./types";

export interface CardFilters {
  query: string;
  type: CardType | "all";
  deck: string | "all";
  edition: Edition | "all";
}

const includesNormalized = (value: string, query: string): boolean =>
  value.toLocaleLowerCase().includes(query.toLocaleLowerCase());

export const matchesCardFilters = (card: CardRecord, filters: CardFilters): boolean => {
  if (filters.type !== "all" && card.cardType !== filters.type) {
    return false;
  }

  if (filters.deck !== "all" && card.deck !== filters.deck) {
    return false;
  }

  if (filters.edition !== "all" && card.edition !== filters.edition) {
    return false;
  }

  const query = filters.query.trim().toLocaleLowerCase();
  if (!query) {
    return true;
  }

  const values = [card.name, card.text, ...card.aliases];
  return values.some((value) => includesNormalized(value, query));
};

export const filterCards = (cards: CardRecord[], filters: CardFilters): CardRecord[] =>
  cards.filter((card) => matchesCardFilters(card, filters));

export const collectDecks = (cards: CardRecord[]): string[] =>
  Array.from(new Set(cards.map((card) => card.deck).filter((deck): deck is string => Boolean(deck)))).sort((a, b) =>
    a.localeCompare(b)
  );

export const collectEditions = (cards: CardRecord[]): Edition[] =>
  ["old", "revised", "mixed"].filter((edition): edition is Edition =>
    cards.some((card) => card.edition === edition)
  );

export const collectCardTypes = (cards: CardRecord[]): CardType[] => {
  const orderedTypes: CardType[] = ["occupation", "minor_improvement", "major_improvement"];
  const available = new Set(cards.map((card) => card.cardType));
  return orderedTypes.filter((type) => available.has(type));
};
