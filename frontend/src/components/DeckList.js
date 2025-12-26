import React from 'react';

function DeckList({ decks }) {
  if (!decks || decks.length === 0) {
    return <p>No deck recommendations available.</p>;
  }
  // We'll show the top 3 decks for the user
  const topDecks = decks.slice(0, 3);

  return (
    <div className="DeckList" style={{ marginBottom: '2em' }}>
      <h2>Top Deck Recommendations</h2>
      {topDecks.map((deck, index) => (
        <div className="DeckSuggestion" key={index} style={{ padding: '1em', marginBottom: '1em', border: '1px solid #eee' }}>
          <h3>{deck.name} <small>({deck.archetype})</small></h3>
          <p><strong>Fit Score:</strong> {deck.score}/100</p>
          {deck.missingCards.length > 0 ? (
            // If there are missing cards, list them and note if any are core
            <p style={{ color: 'orangered' }}>
              Missing cards: {deck.missingCards.join(', ')} 
              {deck.missingCards.some(card => deck.keyCards.includes(card)) 
                ? " (⚠️ missing core card!)" 
                : " (substitution possible)"}
            </p>
          ) : (
            <p>
              ✅ All cards available 
              {deck.upgradeNeeded > 0 
                ? ` – ${deck.upgradeNeeded} card${deck.upgradeNeeded>1?"s":""} under-level (upgrade recommended)` 
                : " – All at good levels"}.
            </p>
          )}
          {deck.upgradeSuggestions && deck.upgradeSuggestions.length > 0 && (
            <p><em>Priority Upgrades:</em> {deck.upgradeSuggestions.join(', ')}</p>
          )}
        </div>
      ))}
    </div>
  );
}

export default DeckList;
