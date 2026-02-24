import type { CardType, Edition } from "../data/types";

interface FiltersBarProps {
  query: string;
  onQueryChange: (query: string) => void;
  cardTypes: CardType[];
  cardType: CardType | "all";
  onCardTypeChange: (value: CardType | "all") => void;
  showDeckFilter: boolean;
  deck: string | "all";
  onDeckChange: (value: string | "all") => void;
  showEditionFilter: boolean;
  edition: Edition | "all";
  onEditionChange: (value: Edition | "all") => void;
  editions: Edition[];
  decks: string[];
}

const CARD_TYPE_LABELS: Record<CardType, string> = {
  occupation: "Occupation",
  minor_improvement: "Minor Improvement",
  major_improvement: "Major Improvement"
};

const EDITION_LABELS: Record<Edition, string> = {
  old: "Old",
  revised: "Revised",
  mixed: "Mixed"
};

export const FiltersBar = ({
  query,
  onQueryChange,
  cardTypes,
  cardType,
  onCardTypeChange,
  showDeckFilter,
  deck,
  onDeckChange,
  showEditionFilter,
  edition,
  onEditionChange,
  editions,
  decks
}: FiltersBarProps) => (
  <section className="filters-wrap">
    <label className="field search-field">
      <span className="field-label">Card Search</span>
      <input
        type="search"
        value={query}
        placeholder="Search by name, alias, or text"
        aria-label="Search cards"
        onChange={(event) => onQueryChange(event.target.value)}
      />
    </label>
    <div className="filters-grid">
      <label className="field">
        <span className="field-label">Type</span>
        <select value={cardType} onChange={(event) => onCardTypeChange(event.target.value as CardType | "all")}>
          <option value="all">All Types</option>
          {cardTypes.map((typeOption) => (
            <option key={typeOption} value={typeOption}>
              {CARD_TYPE_LABELS[typeOption]}
            </option>
          ))}
        </select>
      </label>
      {showDeckFilter ? (
        <label className="field">
          <span className="field-label">Deck</span>
          <select value={deck} onChange={(event) => onDeckChange(event.target.value)}>
            <option value="all">All Decks</option>
            {decks.map((deckOption) => (
              <option key={deckOption} value={deckOption}>
                {deckOption}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      {showEditionFilter ? (
        <label className="field">
          <span className="field-label">Edition</span>
          <select value={edition} onChange={(event) => onEditionChange(event.target.value as Edition | "all")}>
            <option value="all">All Editions</option>
            {editions.map((editionOption) => (
              <option key={editionOption} value={editionOption}>
                {EDITION_LABELS[editionOption]}
              </option>
            ))}
          </select>
        </label>
      ) : null}
    </div>
  </section>
);
