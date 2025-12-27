const express = require('express');
const cors = require('cors');
const { CR_API_TOKEN } = require('./config');
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

// Start the server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`✅ DeckCoach backend is running on http://localhost:${PORT}`);
});
