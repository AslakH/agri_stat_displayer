import { describe, expect, test } from "vitest";
import { collectCardTypes, collectDecks, collectEditions, filterCards } from "./search";
import type { CardRecord } from "./types";

const cards: CardRecord[] = [
  {
    canonicalId: "old:occupation:plow_driver",
    name: "Plow Driver",
    aliases: ["Plough Driver"],
    cardType: "occupation",
    deck: "K",
    edition: "old",
    text: "Plow when others plow."
  },
  {
    canonicalId: "old:minor_improvement:loom",
    name: "Loom",
    aliases: [],
    cardType: "minor_improvement",
    deck: "E",
    edition: "old",
    text: "Convert sheep into food."
  }
];

describe("search helpers", () => {
  test("filters by alias and card type", () => {
    const result = filterCards(cards, {
      query: "plough",
      type: "occupation",
      deck: "all",
      edition: "all"
    });

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Plow Driver");
  });

  test("collects unique sorted decks", () => {
    expect(collectDecks(cards)).toEqual(["E", "K"]);
  });

  test("collects available card types and editions", () => {
    expect(collectCardTypes(cards)).toEqual(["occupation", "minor_improvement"]);
    expect(collectEditions(cards)).toEqual(["old"]);
  });
});
