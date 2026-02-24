import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { App } from "./App";

const datasetIndex = {
  datasets: [
    {
      id: "a",
      file: "/datasets/a.json",
      manifest: {
        id: "a",
        label: "Dataset A",
        version: "1",
        sourceName: "Source A",
        sourceUrl: "https://example.com/a",
        edition: "old",
        comparabilityGroup: "group_a",
        generatedAt: "2026-02-24T10:00:00.000Z",
        licenseNote: "x",
        hasFullCardText: true,
        hasStats: true
      }
    },
    {
      id: "b",
      file: "/datasets/b.json",
      manifest: {
        id: "b",
        label: "Dataset B",
        version: "1",
        sourceName: "Source B",
        sourceUrl: "https://example.com/b",
        edition: "revised",
        comparabilityGroup: "group_b",
        generatedAt: "2026-02-24T10:00:00.000Z",
        licenseNote: "x",
        hasFullCardText: true,
        hasStats: true
      }
    }
  ]
};

const datasetA = {
  manifest: datasetIndex.datasets[0].manifest,
  cards: [
    {
      canonicalId: "old:occupation:plow_driver",
      name: "Plow Driver",
      aliases: ["Plough Driver"],
      cardType: "occupation",
      deck: "K",
      edition: "old",
      text: "Plow text"
    }
  ],
  stats: [
    {
      canonicalId: "old:occupation:plow_driver",
      metricSet: "4p_comp",
      winPct: 20
    }
  ]
};

const datasetB = {
  manifest: datasetIndex.datasets[1].manifest,
  cards: [
    {
      canonicalId: "revised:occupation:sheep_whisperer",
      name: "Sheep Whisperer",
      aliases: [],
      cardType: "occupation",
      deck: "B",
      edition: "revised",
      text: "Sheep text"
    }
  ],
  stats: [
    {
      canonicalId: "revised:occupation:sheep_whisperer",
      metricSet: "4p_comp",
      winPct: 40
    }
  ]
};

beforeEach(() => {
  localStorage.clear();

  const jsonResponse = (payload: unknown, status = 200) =>
    ({
      ok: status >= 200 && status < 300,
      status,
      statusText: status === 200 ? "OK" : "Error",
      json: async () => payload
    }) as Response;

  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = typeof input === "string" ? input : input.toString();
    if (url.includes("/datasets/index.json")) {
      return jsonResponse(datasetIndex);
    }
    if (url.includes("/datasets/a.json")) {
      return jsonResponse(datasetA);
    }
    if (url.includes("/datasets/b.json")) {
      return jsonResponse(datasetB);
    }

    return jsonResponse("not found", 404);
  });

  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("App", () => {
  test("supports search by alias", async () => {
    render(<App />);

    await screen.findAllByText("Plow Driver");
    const search = screen.getByLabelText("Search cards");
    fireEvent.change(search, { target: { value: "plough" } });

    expect((await screen.findAllByText("Plow Driver")).length).toBeGreaterThan(0);
  });

  test("shows comparability warning when switching dataset groups", async () => {
    render(<App />);

    await screen.findAllByText("Plow Driver");
    const datasetSelect = screen.getByLabelText("Dataset");
    fireEvent.change(datasetSelect, { target: { value: "b" } });

    await waitFor(() => {
      expect(screen.getByText(/Comparability warning/i)).toBeTruthy();
    });
  });
});
