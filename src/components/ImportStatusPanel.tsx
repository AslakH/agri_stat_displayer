import { formatNumber } from "../data/format";
import type { DatasetManifest } from "../data/types";

interface ImportStatusPanelProps {
  manifest: DatasetManifest | null;
}

export const ImportStatusPanel = ({ manifest }: ImportStatusPanelProps) => {
  if (!manifest?.importStatus) {
    return null;
  }

  const status = manifest.importStatus;
  const rows: Array<{ label: string; value: string }> = [];

  if (status.sourceMode) {
    rows.push({ label: "Source mode", value: status.sourceMode });
  }
  if (typeof status.sourceRows === "number") {
    rows.push({ label: "Source rows", value: formatNumber(status.sourceRows) });
  }
  if (typeof status.importedCards === "number") {
    rows.push({ label: "Imported cards", value: formatNumber(status.importedCards) });
  }
  if (typeof status.matchedCards === "number") {
    rows.push({ label: "Matched", value: formatNumber(status.matchedCards) });
  }
  if (typeof status.unmatchedCards === "number") {
    rows.push({ label: "Unmatched", value: formatNumber(status.unmatchedCards) });
  }

  if (rows.length === 0 && !status.note) {
    return null;
  }

  return (
    <section className="import-status" aria-label="Import status">
      <h3>Import Status</h3>
      <div className="import-status-grid">
        {rows.map((row) => (
          <div key={row.label} className="detail-row">
            <span>{row.label}</span>
            <strong>{row.value}</strong>
          </div>
        ))}
      </div>
      {status.note ? <p className="notes">Note: {status.note}</p> : null}
    </section>
  );
};
