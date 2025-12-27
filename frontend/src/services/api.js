const API_BASE_URL = "http://localhost:3001/api";  // base URL for the backend (assuming it runs on port 3001)

/**
 * Fetch player data and suggestions from the backend.
 * @param {string} tag - The player tag (with or without #).
 * @returns {Promise<Object>} - JSON response containing profile, cards, suggestions.
 */
async function fetchPlayerData(tag) {
  // Ensure no leading/trailing whitespace and encode special characters
  const encodedTag = encodeURIComponent(tag.trim());
  const response = await fetch(`${API_BASE_URL}/player/${encodedTag}`);
  if (!response.ok) {
    let message = `API request failed with status ${response.status}`;
    try {
      const payload = await response.json();
      if (payload?.error) {
        message = payload.error;
      }
    } catch (err) {
      // ignore JSON parse errors and keep default message
    }
    throw new Error(message);
  }
  return response.json();
}

async function fetchTopDecks() {
  const response = await fetch(`${API_BASE_URL}/top-decks`);
  if (!response.ok) {
    let message = `API request failed with status ${response.status}`;
    try {
      const payload = await response.json();
      if (payload?.error) {
        message = payload.error;
      }
    } catch (err) {
      // ignore JSON parse errors and keep default message
    }
    throw new Error(message);
  }
  const payload = await response.json();
  return payload.decks || [];
}

export const api = { fetchPlayerData, fetchTopDecks };
