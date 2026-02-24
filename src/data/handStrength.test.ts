import { describe, expect, test } from "vitest";
import { percentileFromHistogram, summarizePwr } from "./handStrength";

describe("handStrength", () => {
  test("summarizePwr returns average and median", () => {
    const summary = summarizePwr([1, 2, 3, 4]);
    expect(summary).toEqual({
      average: 2.5,
      median: 2.5
    });
  });

  test("percentileFromHistogram estimates percentile within bins", () => {
    const percentile = percentileFromHistogram(
      {
        min: 0,
        max: 10,
        counts: [10, 10]
      },
      7.5
    );

    expect(percentile).toBeCloseTo(75, 1);
  });
});
