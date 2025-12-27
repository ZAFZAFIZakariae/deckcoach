import React from 'react';

function DeckList({ decks }) {
  if (!decks || decks.length === 0) {
    return <p>No top decks available.</p>;
  }

  return (
    <div className="DeckList" style={{ marginBottom: '2em' }}>
      <h2>Top Decks</h2>
      {decks.map((deck, index) => (
        <div className="DeckSuggestion" key={index} style={{ padding: '1em', marginBottom: '1em', border: '1px solid #eee' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <h3 style={{ margin: 0 }}>Deck #{index + 1}</h3>
            <span style={{ color: '#555' }}>Used {deck.count} time{deck.count === 1 ? '' : 's'}</span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5em', marginTop: '0.75em' }}>
            {deck.cards.map(card => (
              <div key={`${card.name}-${index}`} style={{ textAlign: 'center', width: '70px' }}>
                {card.iconUrl ? (
                  <img
                    src={card.iconUrl}
                    alt={card.name}
                    style={{ width: '64px', height: '64px', objectFit: 'contain' }}
                  />
                ) : (
                  <div style={{ width: '64px', height: '64px', background: '#f2f2f2', borderRadius: '8px' }} />
                )}
                <div style={{ fontSize: '0.75em', marginTop: '0.25em' }}>{card.name}</div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default DeckList;
