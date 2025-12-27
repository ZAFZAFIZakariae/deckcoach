const express = require('express');
const cors = require('cors');
const clashApi = require('./services/clashApi');
const deckAdvisor = require('./services/deckAdvisor');

const app = express();
app.use(cors());
app.use(express.json());  // parse JSON bodies (if needed)

// Main endpoint: get player data and deck recommendations
app.get('/api/player/:tag', async (req, res) => {
  const playerTag = req.params.tag;
  try {
    // Fetch data from Clash Royale API (profile, cards, recent battles)
    const profile = await clashApi.getPlayerProfile(playerTag);
    const cards = await clashApi.getPlayerCards(playerTag);
    const battleLog = await clashApi.getPlayerBattleLog(playerTag);
    // Compute personalized deck suggestions based on the fetched data
    const suggestions = deckAdvisor.recommendDecks(profile, cards, battleLog);
    // Respond with combined data (profile, full card collection, and deck suggestions)
    res.json({
      profile,
      cards,
      suggestions
    });
  } catch (error) {
    console.error('Error in /api/player/:tag:', error);
    const status = error.response?.status || 500;
    const details = error.response?.data?.message;
    const isTimeout = error.code === 'ECONNABORTED';
    const message = details
      ? `Clash Royale API error: ${details}`
      : isTimeout
        ? 'Clash Royale API request timed out. Please try again shortly.'
        : error.message || 'Unknown error';
    res.status(status).json({ error: message });
  }
});

app.get('/api/top-decks', async (req, res) => {
  try {
    const { decks, warning, source } = await clashApi.getTopDecks();
    const cardCatalog = await clashApi.getCardCatalog();
    const cardMap = new Map(
      cardCatalog.map(card => [card.name, card.iconUrls?.medium || card.iconUrls?.small || null])
    );

    const hydratedDecks = decks.map(deck => ({
      cards: deck.cards.map(name => ({
        name,
        iconUrl: cardMap.get(name) || null
      })),
      count: deck.count,
      archetype: deck.archetype || 'Unknown'
    }));

    res.json({ decks: hydratedDecks, warning, source });
  } catch (error) {
    console.error('Error in /api/top-decks:', error);
    const details = error.response?.data?.message;
    const isTimeout = error.code === 'ECONNABORTED';
    const message = details
      ? `Clash Royale API error: ${details}`
      : isTimeout
        ? 'Clash Royale API request timed out. Please try again shortly.'
        : error.message || 'Unknown error';
    res.status(200).json({ decks: [], warning: message, source: 'fallback' });
  }
});

// Start the server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`✅ DeckCoach backend is running on http://localhost:${PORT}`);
});
