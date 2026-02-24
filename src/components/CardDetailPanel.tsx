import { formatNumber, formatPercent } from "../data/format";
import type { CardRecord, DatasetManifest, StatRecord } from "../data/types";

interface CardDetailPanelProps {
  card: CardRecord | null;
  stat: StatRecord | null;
  datasetManifest: DatasetManifest | null;
}

const DetailRow = ({ label, value }: { label: string; value: string }) => (
  <div className="detail-row">
    <span>{label}</span>
    <strong>{value}</strong>
  </div>
);

interface DetailMetric {
  label: string;
  value: string;
}

const metricRows = (stat: StatRecord | null): DetailMetric[] => {
  if (!stat) {
    return [];
  }

  const rows: Array<DetailMetric | null> = [
    typeof stat.dealPct === "number" ? { label: "Deal %", value: formatPercent(stat.dealPct) } : null,
    typeof stat.dealtCount === "number" ? { label: "Dealt", value: formatNumber(stat.dealtCount) } : null,
    typeof stat.playedPct === "number" ? { label: "Played %", value: formatPercent(stat.playedPct) } : null,
    typeof stat.playedCount === "number" ? { label: "Played", value: formatNumber(stat.playedCount) } : null,
    typeof stat.winPct === "number" ? { label: "Win %", value: formatPercent(stat.winPct) } : null,
    typeof stat.wonCount === "number" ? { label: "Won", value: formatNumber(stat.wonCount) } : null,
    typeof stat.draftedCount === "number" ? { label: "Drafted", value: formatNumber(stat.draftedCount) } : null,
    typeof stat.bannedCount === "number" ? { label: "Banned", value: formatNumber(stat.bannedCount) } : null,
    typeof stat.adp === "number" ? { label: "ADP", value: formatNumber(stat.adp) } : null,
    typeof stat.pwr === "number" ? { label: "PWR", value: formatNumber(stat.pwr) } : null,
    typeof stat.pwrNoLog === "number" ? { label: "PWR (no log)", value: formatNumber(stat.pwrNoLog) } : null,
    typeof stat.sampleSize === "number" ? { label: "Sample", value: formatNumber(stat.sampleSize) } : null
  ];

  return rows.filter((row): row is DetailMetric => Boolean(row));
};

export const CardDetailPanel = ({ card, stat, datasetManifest }: CardDetailPanelProps) => {
  if (!card || !datasetManifest) {
    return (
      <aside className="detail-panel">
        <h2>Card Details</h2>
        <p>Select a card to view full text and current dataset stats.</p>
      </aside>
    );
  }

  const metaBits = [
    card.cardType.replace("_", " "),
    card.deck ? `Deck ${card.deck}` : null,
    card.edition ?? null
  ].filter((value): value is string => Boolean(value));
  const hasText = card.text.trim().length > 0;
  const hasPrerequisites = Boolean(card.prerequisites && !/^not available\.?$/i.test(card.prerequisites.trim()));
  const details = metricRows(stat);
  const metaRows = [
    typeof card.metadata?.expansion === "string" ? { label: "Expansion", value: card.metadata.expansion } : null,
    typeof card.metadata?.playerCount === "string" ? { label: "Player Count", value: card.metadata.playerCount } : null,
    typeof card.metadata?.cost === "string" ? { label: "Cost", value: card.metadata.cost } : null
  ].filter((row): row is DetailMetric => Boolean(row));

  return (
    <aside className="detail-panel">
      <h2>{card.name}</h2>
      {metaBits.length > 0 ? <p className="detail-subtitle">{metaBits.join(" | ")}</p> : null}
      <div className="source-chip-wrap">
        <span className="source-chip">{datasetManifest.sourceName}</span>
        <a href={datasetManifest.sourceUrl} target="_blank" rel="noreferrer">
          Source
        </a>
      </div>
      {metaRows.length > 0 ? (
        <section className="stats-grid" aria-label="Card metadata">
          {metaRows.map((detail) => (
            <DetailRow key={detail.label} label={detail.label} value={detail.value} />
          ))}
        </section>
      ) : null}
      {hasText ? (
        <section className="text-block">
          <h3>Card Text</h3>
          <p>{card.text}</p>
        </section>
      ) : null}
      {hasPrerequisites ? (
        <section className="text-block">
          <h3>Prerequisites</h3>
          <p>{card.prerequisites}</p>
        </section>
      ) : null}
      {details.length > 0 ? (
        <section className="stats-grid" aria-label="Card stats">
          {details.map((detail) => (
            <DetailRow key={detail.label} label={detail.label} value={detail.value} />
          ))}
        </section>
      ) : (
        <p className="status-line">No stats available for this card in this dataset.</p>
      )}
      {stat?.notes ? <p className="notes">Note: {stat.notes}</p> : null}
    </aside>
  );
};
