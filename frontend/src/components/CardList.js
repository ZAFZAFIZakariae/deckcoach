import React from 'react';
import { Link } from 'react-router-dom';

const UPGRADE_COSTS = {
  1: { common: 1 },
  2: { common: 2 },
  3: { common: 4, rare: 1 },
  4: { common: 10, rare: 2 },
  5: { common: 20, rare: 4 },
  6: { common: 50, rare: 10, epic: 1 },
  7: { common: 100, rare: 20, epic: 2 },
  8: { common: 200, rare: 50, epic: 4 },
  9: { common: 400, rare: 100, epic: 10, legendary: 1 },
  10: { common: 800, rare: 200, epic: 20, legendary: 2 },
  11: { common: 1000, rare: 300, epic: 30, legendary: 4, champion: 1 },
  12: { common: 1500, rare: 400, epic: 50, legendary: 6, champion: 2 },
  13: { common: 2500, rare: 550, epic: 70, legendary: 9, champion: 5 },
  14: { common: 3500, rare: 750, epic: 100, legendary: 12, champion: 8 },
  15: { common: 5500, rare: 1000, epic: 130, legendary: 14, champion: 11 },
  16: { common: 7500, rare: 1400, epic: 180, legendary: 20, champion: 15 },
};

const GLOBAL_LEVEL_OFFSETS = {
  common: 0,
  rare: 2,
  epic: 5,
  legendary: 8,
  champion: 10,
};
const GLOBAL_MAX_LEVEL = 16;

function getGlobalLevel(internalLevel, rarity) {
  const offset = GLOBAL_LEVEL_OFFSETS[rarity] ?? 0;
  return internalLevel + offset;
}

function getUpgradeableLevel(card) {
  const rarity = (card.rarity || '').toLowerCase();
  const maxInternalLevel = card.maxLevel ?? card.level;
  let internalLevel = card.level ?? 0;
  let copies = card.count ?? 0;

  while (internalLevel < maxInternalLevel) {
    const nextInternalLevel = internalLevel + 1;
    const nextGlobalLevel = getGlobalLevel(nextInternalLevel, rarity);
    const cost = UPGRADE_COSTS[nextGlobalLevel]?.[rarity];

    if (!cost || copies < cost) {
      break;
    }

    copies -= cost;
    internalLevel = nextInternalLevel;
  }

  return getGlobalLevel(internalLevel, rarity);
}

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
            <th>Upgradeable To</th>
          </tr>
        </thead>
        <tbody>
          {sortedCards.map(card => {
            const rarity = (card.rarity || '').toLowerCase();
            const currentGlobalLevel = getGlobalLevel(card.level ?? 0, rarity);
            const upgradeableGlobalLevel = getUpgradeableLevel(card);
            const isUpgradeable = upgradeableGlobalLevel > currentGlobalLevel;

            return (
              <tr key={card.name}>
                <td>{card.name}</td>
                <td>
                  {currentGlobalLevel} / {GLOBAL_MAX_LEVEL}
                </td>
                <td>{card.count}</td>
                <td>{card.rarity}</td>
                <td>{isUpgradeable ? <strong>{upgradeableGlobalLevel}</strong> : upgradeableGlobalLevel}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p style={{ marginTop: '1em' }}>
        <Link to="/">← Back to Dashboard</Link>
      </p>
    </div>
  );
}

export default CardList;
