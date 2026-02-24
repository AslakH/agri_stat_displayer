import { describe, expect, test } from "vitest";
import { parseAgricolaDbPayload } from "./agricoladb";

describe("agricoladb parser", () => {
  test("maps payload card rows to CardRecord", () => {
    const payload = {
      cards: [
        {
          name: "Clay Worker",
          cardType: "occupation",
          deck: "I",
          edition: "old",
          text: "Exchange reed for clay."
        }
      ]
    };

    const parsed = parseAgricolaDbPayload(payload);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].canonicalId).toBe("old:occupation:clay_worker");
    expect(parsed[0].cardType).toBe("occupation");
  });
});
