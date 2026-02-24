import { useEffect, useMemo, useState } from "react";
import { formatNumber } from "../data/format";
import {
  collectPwrCardOptions,
  percentileFromHistogram,
  summarizeByGroup,
  type PwrCardOption,
  type PwrSummary
} from "../data/handStrength";
import type { CardRecord, HandStrengthBaseline, StatRecord } from "../data/types";

const OCCUPATION_HAND_SIZE = 7;
const MINOR_HAND_SIZE = 7;

interface HandStrengthPanelProps {
  datasetId: string;
  cards: CardRecord[];
  statsByCardId: Map<string, StatRecord>;
  baseline: HandStrengthBaseline | null;
  baselineLoading: boolean;
  baselineError: string | null;
}

type HandGroupKey = "all" | "occupation" | "minor";

interface HandRow {
  key: HandGroupKey;
  label: string;
}

const HAND_ROWS: HandRow[] = [
  { key: "all", label: "All Cards" },
  { key: "occupation", label: "Occupations" },
  { key: "minor", label: "Minor Improvements" }
];

const includesQuery = (value: string, query: string): boolean =>
  value.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase());

const formatMaybeNumber = (value: number | null | undefined): string => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "N/A";
  }

  return formatNumber(value);
};

const formatPercentile = (value: number | null): string => {
  if (value === null || !Number.isFinite(value)) {
    return "N/A";
  }

  return `${value.toFixed(1)}%`;
};

const toPwrValues = (options: PwrCardOption[]): number[] => options.map((option) => option.pwr);

const selectSummary = (group: HandGroupKey, summary: ReturnType<typeof summarizeByGroup>): PwrSummary | null => {
  if (group === "all") {
    return summary.all;
  }
  if (group === "occupation") {
    return summary.occupation;
  }
  return summary.minor;
};

export const HandStrengthPanel = ({
  datasetId,
  cards,
  statsByCardId,
  baseline,
  baselineLoading,
  baselineError
}: HandStrengthPanelProps) => {
  const [selectedOccupationIds, setSelectedOccupationIds] = useState<string[]>([]);
  const [selectedMinorIds, setSelectedMinorIds] = useState<string[]>([]);
  const [occupationQuery, setOccupationQuery] = useState("");
  const [minorQuery, setMinorQuery] = useState("");
  const [occupationCandidateId, setOccupationCandidateId] = useState("");
  const [minorCandidateId, setMinorCandidateId] = useState("");
  const [showMethodology, setShowMethodology] = useState(false);

  const pools = useMemo(() => collectPwrCardOptions(cards, statsByCardId), [cards, statsByCardId]);
  const optionById = useMemo(() => new Map(pools.all.map((option) => [option.canonicalId, option])), [pools.all]);
  const selectedOccupationIdSet = useMemo(() => new Set(selectedOccupationIds), [selectedOccupationIds]);
  const selectedMinorIdSet = useMemo(() => new Set(selectedMinorIds), [selectedMinorIds]);

  useEffect(() => {
    setSelectedOccupationIds([]);
    setSelectedMinorIds([]);
    setOccupationQuery("");
    setMinorQuery("");
    setOccupationCandidateId("");
    setMinorCandidateId("");
    setShowMethodology(false);
  }, [cards]);

  const selectedOccupations = useMemo(
    () =>
      selectedOccupationIds
        .map((canonicalId) => optionById.get(canonicalId))
        .filter((option): option is PwrCardOption => Boolean(option)),
    [optionById, selectedOccupationIds]
  );

  const selectedMinors = useMemo(
    () =>
      selectedMinorIds
        .map((canonicalId) => optionById.get(canonicalId))
        .filter((option): option is PwrCardOption => Boolean(option)),
    [optionById, selectedMinorIds]
  );

  const availableOccupations = useMemo(
    () =>
      pools.occupations.filter(
        (option) => !selectedOccupationIdSet.has(option.canonicalId) && includesQuery(option.name, occupationQuery)
      ),
    [occupationQuery, pools.occupations, selectedOccupationIdSet]
  );

  const availableMinors = useMemo(
    () => pools.minors.filter((option) => !selectedMinorIdSet.has(option.canonicalId) && includesQuery(option.name, minorQuery)),
    [minorQuery, pools.minors, selectedMinorIdSet]
  );

  useEffect(() => {
    if (availableOccupations.length === 0) {
      if (occupationCandidateId !== "") {
        setOccupationCandidateId("");
      }
      return;
    }

    if (!availableOccupations.some((option) => option.canonicalId === occupationCandidateId)) {
      setOccupationCandidateId(availableOccupations[0].canonicalId);
    }
  }, [availableOccupations, occupationCandidateId]);

  useEffect(() => {
    if (availableMinors.length === 0) {
      if (minorCandidateId !== "") {
        setMinorCandidateId("");
      }
      return;
    }

    if (!availableMinors.some((option) => option.canonicalId === minorCandidateId)) {
      setMinorCandidateId(availableMinors[0].canonicalId);
    }
  }, [availableMinors, minorCandidateId]);

  const datasetSummary = useMemo(
    () => summarizeByGroup(toPwrValues(pools.all), toPwrValues(pools.occupations), toPwrValues(pools.minors)),
    [pools]
  );

  const handComplete = selectedOccupations.length === OCCUPATION_HAND_SIZE && selectedMinors.length === MINOR_HAND_SIZE;

  const handSummary = useMemo(() => {
    if (!handComplete) {
      return null;
    }

    const occupationValues = toPwrValues(selectedOccupations);
    const minorValues = toPwrValues(selectedMinors);
    return summarizeByGroup(occupationValues.concat(minorValues), occupationValues, minorValues);
  }, [handComplete, selectedMinors, selectedOccupations]);

  const usableBaseline = baseline && baseline.datasetId === datasetId ? baseline : null;
  const methodSimulationCount = usableBaseline ? usableBaseline.simulationCount.toLocaleString() : "100,000";
  const methodHistogramBins = usableBaseline ? usableBaseline.histogramBins.toLocaleString() : "400";
  const methodSeed = usableBaseline ? `${usableBaseline.seed}` : "20260224";
  const percentileByGroup = useMemo(() => {
    if (!usableBaseline || !handSummary) {
      return null;
    }

    return {
      all: {
        average:
          handSummary.all === null
            ? null
            : percentileFromHistogram(usableBaseline.metrics.allAverage, handSummary.all.average),
        median:
          handSummary.all === null ? null : percentileFromHistogram(usableBaseline.metrics.allMedian, handSummary.all.median)
      },
      occupation: {
        average:
          handSummary.occupation === null
            ? null
            : percentileFromHistogram(usableBaseline.metrics.occupationAverage, handSummary.occupation.average),
        median:
          handSummary.occupation === null
            ? null
            : percentileFromHistogram(usableBaseline.metrics.occupationMedian, handSummary.occupation.median)
      },
      minor: {
        average:
          handSummary.minor === null
            ? null
            : percentileFromHistogram(usableBaseline.metrics.minorAverage, handSummary.minor.average),
        median:
          handSummary.minor === null
            ? null
            : percentileFromHistogram(usableBaseline.metrics.minorMedian, handSummary.minor.median)
      }
    };
  }, [handSummary, usableBaseline]);

  if (pools.all.length === 0) {
    return (
      <section className="hand-strength" aria-label="Hand strength">
        <h3>Hand Strength (PWR)</h3>
        <p className="status-line">No PWR data is available for this dataset.</p>
      </section>
    );
  }

  const addOccupation = () => {
    if (!occupationCandidateId || selectedOccupationIds.length >= OCCUPATION_HAND_SIZE) {
      return;
    }
    if (selectedOccupationIdSet.has(occupationCandidateId)) {
      return;
    }
    setSelectedOccupationIds((current) => [...current, occupationCandidateId]);
  };

  const addMinor = () => {
    if (!minorCandidateId || selectedMinorIds.length >= MINOR_HAND_SIZE) {
      return;
    }
    if (selectedMinorIdSet.has(minorCandidateId)) {
      return;
    }
    setSelectedMinorIds((current) => [...current, minorCandidateId]);
  };

  const clearHand = () => {
    setSelectedOccupationIds([]);
    setSelectedMinorIds([]);
  };

  return (
    <section className="hand-strength" aria-label="Hand strength">
      <div className="hand-strength-head">
        <h3>Hand Strength (PWR)</h3>
        <p className="stats-help-text">
          Build a full hand with exactly 7 occupations and 7 minor improvements. Percentiles are relative to random 7+7
          hands from this dataset.
        </p>
        <button
          type="button"
          className="hand-methodology-toggle"
          onClick={() => setShowMethodology((current) => !current)}
          aria-expanded={showMethodology}
        >
          {showMethodology ? "Hide Methodology" : "How Hand Strength Is Calculated"}
        </button>
      </div>

      {showMethodology ? (
        <section className="hand-methodology" aria-label="Hand strength methodology">
          <p className="stats-help-text">
            The feature uses an empirical Monte Carlo baseline instead of assuming a normal distribution.
          </p>
          <ol className="hand-methodology-list">
            <li>
              Start with Agricola Norge cards that have numeric PWR and are either occupations or minor improvements.
            </li>
            <li>
              Build random reference hands by sampling 7 occupations and 7 minors without replacement. Baseline size is{" "}
              {methodSimulationCount} simulated hands with {methodHistogramBins} histogram bins (seed {methodSeed}).
            </li>
            <li>
              For each reference hand, compute six metrics: average and median PWR for all 14 cards, for occupations only,
              and for minors only.
            </li>
            <li>
              Build distributions for those six metrics from the simulation output.
            </li>
            <li>
              For your selected hand, compute the same six metrics and map each value to a percentile in the matching
              baseline distribution.
            </li>
            <li>
              Percentiles are estimated from histogram bins using linear interpolation within the bin. This is a smooth and
              fast approximation of the empirical CDF.
            </li>
          </ol>
          <p className="stats-help-text">
            Interpretation: a 90th percentile hand average means the hand average PWR is higher than about 90% of random
            7+7 hands in this dataset.
          </p>
          <p className="stats-help-text">
            Scope limits: this is card-level only. It does not model player skill, table context, card combos, seats, or
            pick-order dynamics.
          </p>
        </section>
      ) : null}

      <div className="hand-builder-grid">
        <section className="hand-builder-block" aria-label="Occupation hand builder">
          <p className="field-label">
            Occupations ({selectedOccupations.length}/{OCCUPATION_HAND_SIZE})
          </p>
          <label className="field">
            <span className="field-label">Search Occupations</span>
            <input
              type="search"
              value={occupationQuery}
              placeholder="Filter occupations"
              onChange={(event) => setOccupationQuery(event.target.value)}
            />
          </label>
          <div className="hand-add-row">
            <select
              value={occupationCandidateId}
              onChange={(event) => setOccupationCandidateId(event.target.value)}
              disabled={availableOccupations.length === 0 || selectedOccupations.length >= OCCUPATION_HAND_SIZE}
              aria-label="Occupation candidate"
            >
              {availableOccupations.length === 0 ? (
                <option value="">No matching occupations</option>
              ) : (
                availableOccupations.map((option) => (
                  <option key={option.canonicalId} value={option.canonicalId}>
                    {option.name} (PWR {formatNumber(option.pwr)})
                  </option>
                ))
              )}
            </select>
            <button
              type="button"
              className="hand-add-btn"
              onClick={addOccupation}
              disabled={!occupationCandidateId || selectedOccupations.length >= OCCUPATION_HAND_SIZE}
            >
              Add
            </button>
          </div>
          <ul className="hand-picked-list">
            {selectedOccupations.map((option) => (
              <li key={option.canonicalId}>
                <span>{option.name}</span>
                <span className="hand-picked-pwr">PWR {formatNumber(option.pwr)}</span>
                <button
                  type="button"
                  className="hand-remove-btn"
                  onClick={() =>
                    setSelectedOccupationIds((current) => current.filter((canonicalId) => canonicalId !== option.canonicalId))
                  }
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section className="hand-builder-block" aria-label="Minor improvement hand builder">
          <p className="field-label">
            Minor Improvements ({selectedMinors.length}/{MINOR_HAND_SIZE})
          </p>
          <label className="field">
            <span className="field-label">Search Minors</span>
            <input
              type="search"
              value={minorQuery}
              placeholder="Filter minor improvements"
              onChange={(event) => setMinorQuery(event.target.value)}
            />
          </label>
          <div className="hand-add-row">
            <select
              value={minorCandidateId}
              onChange={(event) => setMinorCandidateId(event.target.value)}
              disabled={availableMinors.length === 0 || selectedMinors.length >= MINOR_HAND_SIZE}
              aria-label="Minor improvement candidate"
            >
              {availableMinors.length === 0 ? (
                <option value="">No matching minor improvements</option>
              ) : (
                availableMinors.map((option) => (
                  <option key={option.canonicalId} value={option.canonicalId}>
                    {option.name} (PWR {formatNumber(option.pwr)})
                  </option>
                ))
              )}
            </select>
            <button
              type="button"
              className="hand-add-btn"
              onClick={addMinor}
              disabled={!minorCandidateId || selectedMinors.length >= MINOR_HAND_SIZE}
            >
              Add
            </button>
          </div>
          <ul className="hand-picked-list">
            {selectedMinors.map((option) => (
              <li key={option.canonicalId}>
                <span>{option.name}</span>
                <span className="hand-picked-pwr">PWR {formatNumber(option.pwr)}</span>
                <button
                  type="button"
                  className="hand-remove-btn"
                  onClick={() => setSelectedMinorIds((current) => current.filter((canonicalId) => canonicalId !== option.canonicalId))}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="hand-actions">
        <button
          type="button"
          className="hand-clear-btn"
          onClick={clearHand}
          disabled={selectedOccupationIds.length === 0 && selectedMinorIds.length === 0}
        >
          Clear Hand
        </button>
      </div>

      {!handComplete ? (
        <p className="status-line">
          Select {OCCUPATION_HAND_SIZE} occupations and {MINOR_HAND_SIZE} minor improvements to compute hand strength.
        </p>
      ) : null}
      {baselineLoading ? <p className="status-line">Loading Monte Carlo baseline...</p> : null}
      {baselineError ? <p className="error-line">{baselineError}</p> : null}
      {usableBaseline ? (
        <p className="status-line">
          Baseline: {usableBaseline.simulationCount.toLocaleString()} simulated hands ({usableBaseline.histogramBins} bins).
        </p>
      ) : null}

      <div className="hand-metrics-table-wrap">
        <table className="hand-metrics-table">
          <thead>
            <tr>
              <th scope="col">Group</th>
              <th scope="col">Dataset Avg</th>
              <th scope="col">Dataset Median</th>
              <th scope="col">Hand Avg</th>
              <th scope="col">Hand Median</th>
              <th scope="col">Avg Percentile</th>
              <th scope="col">Median Percentile</th>
            </tr>
          </thead>
          <tbody>
            {HAND_ROWS.map((row) => {
              const datasetGroupSummary = selectSummary(row.key, datasetSummary);
              const handGroupSummary = handSummary ? selectSummary(row.key, handSummary) : null;
              const percentileGroup = percentileByGroup ? percentileByGroup[row.key] : null;

              return (
                <tr key={row.key}>
                  <th scope="row">{row.label}</th>
                  <td>{formatMaybeNumber(datasetGroupSummary?.average)}</td>
                  <td>{formatMaybeNumber(datasetGroupSummary?.median)}</td>
                  <td>{formatMaybeNumber(handGroupSummary?.average)}</td>
                  <td>{formatMaybeNumber(handGroupSummary?.median)}</td>
                  <td>{formatPercentile(percentileGroup?.average ?? null)}</td>
                  <td>{formatPercentile(percentileGroup?.median ?? null)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
};
