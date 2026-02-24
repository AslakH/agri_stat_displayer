import type { DatasetIndexEntry } from "../data/types";

interface DatasetSwitcherProps {
  datasets: DatasetIndexEntry[];
  selectedDatasetId: string;
  onSelectDataset: (id: string) => void;
}

export const DatasetSwitcher = ({
  datasets,
  selectedDatasetId,
  onSelectDataset
}: DatasetSwitcherProps) => (
  <label className="dataset-switcher">
    <span className="field-label">Dataset</span>
    <select
      aria-label="Dataset"
      value={selectedDatasetId}
      onChange={(event) => onSelectDataset(event.target.value)}
    >
      {datasets.map((entry) => (
        <option key={entry.id} value={entry.id}>
          {entry.manifest.label}
        </option>
      ))}
    </select>
  </label>
);
