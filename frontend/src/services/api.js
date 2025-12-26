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
    throw new Error(`API request failed with status ${response.status}`);
  }
  return response.json();
}

export const api = { fetchPlayerData };
