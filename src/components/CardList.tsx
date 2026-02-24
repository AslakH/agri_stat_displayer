import { formatNumber, formatPercent } from "../data/format";
import type { CardRecord, StatRecord } from "../data/types";

interface CardListProps {
  cards: CardRecord[];
  selectedCardId: string;
  onSelectCard: (id: string) => void;
  statsByCardId: Map<string, StatRecord>;
}

export const CardList = ({ cards, selectedCardId, onSelectCard, statsByCardId }: CardListProps) => {
  if (cards.length === 0) {
    return <p className="empty-state">No cards match your filters in this dataset.</p>;
  }

  return (
    <ul className="card-list" aria-label="Card results">
      {cards.map((card) => {
        const stat = statsByCardId.get(card.canonicalId);
        const winLabel =
          typeof stat?.winPct === "number"
            ? `Win ${formatPercent(stat.winPct)}`
            : typeof stat?.wonCount === "number"
              ? `Won ${formatNumber(stat.wonCount)}`
              : null;
        const playedLabel =
          typeof stat?.playedPct === "number"
            ? `Played ${formatPercent(stat.playedPct)}`
            : typeof stat?.playedCount === "number"
              ? `Played ${formatNumber(stat.playedCount)}`
              : null;
        const pwrLabel = typeof stat?.pwr === "number" ? `PWR ${formatNumber(stat.pwr)}` : null;
        const metaBits = [
          card.cardType.replace("_", " "),
          card.deck ? `Deck ${card.deck}` : null,
          card.edition ?? null
        ].filter((value): value is string => Boolean(value));

        return (
          <li key={card.canonicalId}>
            <button
              type="button"
              className={`card-item ${selectedCardId === card.canonicalId ? "is-selected" : ""}`}
              onClick={() => onSelectCard(card.canonicalId)}
            >
              <span className="card-item-top">
                <strong>{card.name}</strong>
                {metaBits.length > 0 ? <span className="card-meta">{metaBits.join(" | ")}</span> : null}
              </span>
              {winLabel || playedLabel || pwrLabel ? (
                <span className="stat-chips">
                  {winLabel ? <span className="chip">{winLabel}</span> : null}
                  {playedLabel ? <span className="chip">{playedLabel}</span> : null}
                  {pwrLabel ? <span className="chip">{pwrLabel}</span> : null}
                </span>
              ) : null}
            </button>
          </li>
        );
      })}
    </ul>
  );
};
