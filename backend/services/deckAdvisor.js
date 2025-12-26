const metaDecks = require('../data/meta_decks.json');

/**
 * Recommend decks for the player based on their collection and recent battles.
 * @param {Object} profile - Player profile data (includes king level, etc.)
 * @param {Array<Object>} cards - Array of the player's card info (name, level, count, rarity, etc.)
 * @param {Array<Object>} battleLog - (Optional) Recent battle log data (not heavily used in this basic implementation)
 * @returns {Array<Object>} List of deck suggestions with scores and additional info
 */
function recommendDecks(profile, cards, battleLog) {
  const kingLevel = profile.expLevel || profile.kingLevel || 0;  // player's King Tower level for reference
  // Build a quick lookup map of player's cards by name for convenience
  const cardMap = {};
  for (let card of cards) {
    cardMap[card.name] = card;
  }

  const suggestions = [];
  for (let deck of metaDecks) {
    const deckCards = deck.cards;
    // Determine which cards (if any) are missing from the player's collection
    const missingCards = deckCards.filter(cardName => !cardMap[cardName]);
    const missingCore = missingCards.some(cardName => deck.keyCards.includes(cardName));

    // Calculate level deficits and potential upgrades
    let totalLevelDeficit = 0;
    let upgradeNeededCount = 0;
    let underleveledCards = [];
    for (let cardName of deckCards) {
      if (cardMap[cardName]) {
        const cardLevel = cardMap[cardName].level;
        // If a card is below the player's king level, consider it under-leveled (needs upgrade for full strength)
        if (kingLevel && cardLevel < kingLevel) {
          upgradeNeededCount += 1;
          underleveledCards.push({ name: cardName, level: cardLevel });
          totalLevelDeficit += (kingLevel - cardLevel);
        }
      }
    }

    // Compute a raw "fit score" out of 100 for this deck
    let score = 100;
    if (missingCore) {
      // Missing a core card is a big issue – heavily penalize (deck likely not playable as intended)
      score -= 50;
    }
    // Each missing card (core or not) reduces the score
    score -= missingCards.length * 10;
    // Penalize for total level deficit (each level below ideal subtracts a couple points)
    score -= totalLevelDeficit * 2;
    if (score < 0) score = 0;  // floor the score at 0 minimum

    // Determine top upgrade suggestions (which underleveled cards to upgrade first)
    underleveledCards.sort((a, b) => a.level - b.level);  // sort by level ascending (lower level = more urgent upgrade)
    const upgradeSuggestions = underleveledCards.slice(0, 2).map(c => c.name);  // suggest up to 2 cards to focus on upgrading

    // Compile the suggestion object for this deck
    suggestions.push({
      name: deck.name,
      archetype: deck.archetype,
      keyCards: deck.keyCards,
      missingCards: missingCards,
      score: Math.round(score),
      upgradeNeeded: upgradeNeededCount,         // how many cards are under-leveled
      upgradeSuggestions: upgradeSuggestions    // which specific cards to upgrade first
    });
  }

  // Optionally, use battleLog data to adjust scores based on the player's personal performance or preferences.
  // For example, if the player frequently plays or wins with a certain archetype, we could boost that deck's score.
  // (This implementation does not yet use battleLog, but this is where such logic could go.)

  // Sort decks by score (highest first) so the best decks for the player are first
  suggestions.sort((a, b) => b.score - a.score);
  return suggestions;
}

module.exports = { recommendDecks };
