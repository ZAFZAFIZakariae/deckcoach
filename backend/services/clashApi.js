const axios = require('axios');
const { CR_API_TOKEN, CR_API_BASE_URL } = require('../config');

function assertApiToken() {
  if (!CR_API_TOKEN || CR_API_TOKEN === "<YOUR_API_TOKEN>") {
    throw new Error(
      "Missing CR_API_TOKEN. Create a .env file in backend/ with CR_API_TOKEN from the Clash Royale developer portal."
    );
  }
}

// Create a pre-configured Axios instance for Clash Royale API
const apiClient = axios.create({
  baseURL: CR_API_BASE_URL,
  timeout: 5000,
  headers: {
    "Authorization": `Bearer ${CR_API_TOKEN}`  // attach token to every request:contentReference[oaicite:3]{index=3}
  }
});

/**
 * Fetches player profile information by player tag.
 * Includes stats like name, level, trophies, best trophies, current arena, etc.
 */
async function getPlayerProfile(playerTag) {
  assertApiToken();
  // Ensure the tag is URL-encoded (API expects %23 instead of # in the URL):contentReference[oaicite:4]{index=4}
  const encodedTag = encodeURIComponent(playerTag.startsWith('#') ? playerTag : `#${playerTag}`);
  const response = await apiClient.get(`/players/${encodedTag}`);
  return response.data;  // returns an object with player profile details
}

/**
 * Fetches the player's card collection (all owned cards with levels and counts).
 * If the API does not provide a direct "cards" endpoint, this could be part of profile or another approach.
 */
async function getPlayerCards(playerTag) {
  assertApiToken();
  const encodedTag = encodeURIComponent(playerTag.startsWith('#') ? playerTag : `#${playerTag}`);
  const response = await apiClient.get(`/players/${encodedTag}/cards`);
  // The API might return an object with an "items" array for cards
  return response.data.items || response.data;
}

/**
 * Fetches the player's recent battle log (list of recent matches).
 * This can be used to analyze the player's history (e.g., favorite archetypes, common opponents).
 */
async function getPlayerBattleLog(playerTag) {
  assertApiToken();
  const encodedTag = encodeURIComponent(playerTag.startsWith('#') ? playerTag : `#${playerTag}`);
  const response = await apiClient.get(`/players/${encodedTag}/battlelog`);
  return response.data;  // returns an array of battle objects
}

module.exports = { getPlayerProfile, getPlayerCards, getPlayerBattleLog };
