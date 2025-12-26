import React from 'react';
import { Link } from 'react-router-dom';

function CardList({ cards }) {
  if (!cards || cards.length === 0) {
    return <div>No card collection data available.</div>;
  }
  // Sort cards by level (descending)
  const sortedCards = [...cards].sort((a, b) => b.level - a.level);

  return (
    <div className="CardList" style={{ padding: '1em' }}>
      <h2>Your Card Collection</h2>
      <p>Total Unlocked Cards: {cards.length}</p>
      <table border="1" cellPadding="5" cellSpacing="0">
        <thead>
          <tr>
            <th>Card</th>
            <th>Level</th>
            <th>Copies</th>
            <th>Rarity</th>
          </tr>
        </thead>
        <tbody>
          {sortedCards.map(card => (
            <tr key={card.name}>
              <td>{card.name}</td>
              <td>
                {card.level}{card.maxLevel ? ` / ${card.maxLevel}` : ""}
              </td>
              <td>{card.count}</td>
              <td>{card.rarity}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p style={{ marginTop: '1em' }}>
        <Link to="/">← Back to Dashboard</Link>
      </p>
    </div>
  );
}

export default CardList;
