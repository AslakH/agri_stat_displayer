import { useEffect, useMemo, useState } from "react";
import { CardDetailPanel } from "../components/CardDetailPanel";
import { CardList } from "../components/CardList";
import { DatasetSwitcher } from "../components/DatasetSwitcher";
import { FiltersBar } from "../components/FiltersBar";
import { ImportStatusPanel } from "../components/ImportStatusPanel";
import { loadDatasetIndex, loadDatasetPackage } from "../data/loadDatasets";
import { collectCardTypes, collectEditions, filterCards } from "../data/search";
import type { CardType, DatasetIndexEntry, DatasetPackage, Edition, StatRecord } from "../data/types";

const STORAGE_SELECTED_DATASET = "agri_selected_dataset";

const toStatsMap = (stats: StatRecord[]): Map<string, StatRecord> => {
  const map = new Map<string, StatRecord>();
  for (const stat of stats) {
    map.set(stat.canonicalId, stat);
  }
  return map;
};

const snapshotDateLabel = (generatedAt: string): string => {
  const parsed = new Date(generatedAt);
  if (Number.isNaN(parsed.getTime())) {
    return generatedAt;
  }

  return parsed.toISOString().slice(0, 10);
};

export const App = () => {
  const [datasetIndex, setDatasetIndex] = useState<DatasetIndexEntry[]>([]);
  const [datasetMap, setDatasetMap] = useState<Record<string, DatasetPackage>>({});
  const [selectedDatasetId, setSelectedDatasetId] = useState("");
  const [selectedCardId, setSelectedCardId] = useState("");
  const [query, setQuery] = useState("");
  const [cardType, setCardType] = useState<CardType | "all">("all");
  const [edition, setEdition] = useState<Edition | "all">("all");
  const [error, setError] = useState<string | null>(null);
  const [isIndexLoading, setIsIndexLoading] = useState(true);
  const [isDatasetLoading, setIsDatasetLoading] = useState(false);

  useEffect(() => {
    let isCancelled = false;

    const load = async () => {
      try {
        setIsIndexLoading(true);
        setError(null);
        const index = await loadDatasetIndex();
        if (isCancelled) {
          return;
        }

        setDatasetIndex(index);
        if (index.length === 0) {
          setError("No datasets were found in /public/datasets.");
          return;
        }

        const persisted = window.localStorage.getItem(STORAGE_SELECTED_DATASET);
        const nextSelected = persisted && index.some((entry) => entry.id === persisted) ? persisted : index[0].id;
        setSelectedDatasetId(nextSelected);
      } catch (caughtError) {
        if (!isCancelled) {
          setError(caughtError instanceof Error ? caughtError.message : "Failed to load dataset index.");
        }
      } finally {
        if (!isCancelled) {
          setIsIndexLoading(false);
        }
      }
    };

    void load();

    return () => {
      isCancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selectedDatasetId) {
      return;
    }

    window.localStorage.setItem(STORAGE_SELECTED_DATASET, selectedDatasetId);
  }, [selectedDatasetId]);

  useEffect(() => {
    if (!selectedDatasetId || datasetMap[selectedDatasetId]) {
      return;
    }

    const entry = datasetIndex.find((item) => item.id === selectedDatasetId);
    if (!entry) {
      return;
    }

    let isCancelled = false;
    const load = async () => {
      try {
        setIsDatasetLoading(true);
        setError(null);
        const dataset = await loadDatasetPackage(entry);
        if (!isCancelled) {
          setDatasetMap((current) => ({ ...current, [entry.id]: dataset }));
        }
      } catch (caughtError) {
        if (!isCancelled) {
          setError(caughtError instanceof Error ? caughtError.message : `Failed to load dataset ${entry.id}.`);
        }
      } finally {
        if (!isCancelled) {
          setIsDatasetLoading(false);
        }
      }
    };

    void load();

    return () => {
      isCancelled = true;
    };
  }, [datasetIndex, datasetMap, selectedDatasetId]);

  const selectedDataset = selectedDatasetId ? datasetMap[selectedDatasetId] ?? null : null;

  const filteredCards = useMemo(() => {
    if (!selectedDataset) {
      return [];
    }

    return filterCards(selectedDataset.cards, {
      query,
      type: cardType,
      deck: "all",
      edition
    });
  }, [cardType, edition, query, selectedDataset]);

  useEffect(() => {
    if (filteredCards.length === 0) {
      setSelectedCardId("");
      return;
    }

    if (!filteredCards.some((card) => card.canonicalId === selectedCardId)) {
      setSelectedCardId(filteredCards[0].canonicalId);
    }
  }, [filteredCards, selectedCardId]);

  const statsByCardId = useMemo(() => {
    if (!selectedDataset) {
      return new Map<string, StatRecord>();
    }

    return toStatsMap(selectedDataset.stats);
  }, [selectedDataset]);

  const selectedCard = useMemo(() => {
    if (!selectedDataset || !selectedCardId) {
      return null;
    }

    return selectedDataset.cards.find((card) => card.canonicalId === selectedCardId) ?? null;
  }, [selectedCardId, selectedDataset]);

  const selectedStat = selectedCardId ? statsByCardId.get(selectedCardId) ?? null : null;
  const cardTypeOptions = selectedDataset ? collectCardTypes(selectedDataset.cards) : [];
  const editionOptions = selectedDataset ? collectEditions(selectedDataset.cards) : [];
  const showEditionFilter = editionOptions.length > 0;
  const isNorgeDataset = selectedDataset?.manifest.id === "agricola_norge_full_4p_play_agricola";

  useEffect(() => {
    if (cardType !== "all" && !cardTypeOptions.includes(cardType)) {
      setCardType("all");
    }
  }, [cardType, cardTypeOptions]);

  useEffect(() => {
    if (edition !== "all" && (!showEditionFilter || !editionOptions.includes(edition))) {
      setEdition("all");
    }
  }, [edition, editionOptions, showEditionFilter]);

  return (
    <div className="app-shell">
      <header className="top-bar">
        <div className="title-wrap">
          <h1>Agricola Card Stats</h1>
          <p className="subtitle">
            General Agricola card lookup with card text, statistics, and multiple datasets that may report different values.
          </p>
        </div>

        <p className="warning-banner">Values vary by dataset source. Compare cards within the same dataset only.</p>

        <DatasetSwitcher
          datasets={datasetIndex}
          selectedDatasetId={selectedDatasetId}
          onSelectDataset={(id) => setSelectedDatasetId(id)}
        />

        {selectedDataset ? (
          <div className="dataset-meta">
            <span className="source-chip dataset-group-chip">
              Dataset: {selectedDataset.manifest.sourceName} (Snapshot {snapshotDateLabel(selectedDataset.manifest.generatedAt)})
            </span>
            <a href={selectedDataset.manifest.sourceUrl} target="_blank" rel="noreferrer">
              Source
            </a>
          </div>
        ) : null}
      </header>

      <main className="content">
        <section className="lookup-panel">
          <FiltersBar
            query={query}
            onQueryChange={setQuery}
            cardTypes={cardTypeOptions}
            cardType={cardType}
            onCardTypeChange={setCardType}
            showEditionFilter={showEditionFilter}
            edition={edition}
            onEditionChange={setEdition}
            editions={editionOptions}
          />

          {isIndexLoading || isDatasetLoading ? <p className="status-line">Loading datasets...</p> : null}
          {error ? <p className="error-line">{error}</p> : null}
          <p className="status-line">
            {selectedDataset ? `${filteredCards.length} cards shown from ${selectedDataset.manifest.label}` : "No dataset selected"}
          </p>
          <CardList
            cards={filteredCards}
            selectedCardId={selectedCardId}
            onSelectCard={setSelectedCardId}
            statsByCardId={statsByCardId}
          />
        </section>

        <CardDetailPanel card={selectedCard} stat={selectedStat} datasetManifest={selectedDataset?.manifest ?? null} />
      </main>

      {isNorgeDataset ? (
        <section className="stats-help" aria-label="Statistics guide">
          <p className="stats-help-title">Stat Guide (Agricola Norge)</p>
          <p className="stats-help-text">
            Dealt = seen in draft, Drafted = picked in draft, Played = card was played, Won = winner had the card, Banned
            = removed before draft, ADP = average draft position (lower is earlier), Samples (n) = number of source
            observations.
          </p>
          <p className="stats-help-text">
            PWR (Power) = (100/7) * (Drafted/Dealt) * (Played/Drafted) * (Won/Played). This simplifies to about 14.29 *
            (Won/Dealt), so PWR reflects both card popularity (draft/play rates) and how often the card ends up played by a
            winner.
          </p>
        </section>
      ) : null}

      <ImportStatusPanel manifest={selectedDataset?.manifest ?? null} />
    </div>
  );
};
