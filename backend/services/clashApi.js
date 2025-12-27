const axios = require('axios');
const { CR_API_TOKEN, CR_API_BASE_URL, CR_API_TIMEOUT_MS } = require('../config');

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
  timeout: CR_API_TIMEOUT_MS
});

const REQUEST_DELAY_MS = 100;
let cardCatalogPromise = null;
let globalLocationIdPromise = null;

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function getGlobalLocationId() {
  assertApiToken();
  if (!globalLocationIdPromise) {
    globalLocationIdPromise = (async () => {
      let afterCursor = null;
      let totalChecked = 0;
      let lastResponse = null;

      while (true) {
        const params = new URLSearchParams({ limit: '300' });
        if (afterCursor) {
          params.set('after', afterCursor);
        }
        lastResponse = await apiClient.get(`/locations?${params.toString()}`, {
          headers: {
            Authorization: `Bearer ${CR_API_TOKEN}`
          }
        });
        const items = lastResponse.data?.items ?? [];
        totalChecked += items.length;
        const match = items.find(item => {
          const name = item?.name?.trim().toLowerCase();
          return name === 'global' || name === 'international';
        });
        if (match?.id) {
          return match.id;
        }
        const nextCursor = lastResponse.data?.paging?.cursors?.after;
        if (nextCursor) {
          afterCursor = nextCursor;
        } else {
          break;
        }
      }

      const apiReason = lastResponse?.data?.reason || lastResponse?.data?.message;
      const detail = apiReason ? ` Reason: ${apiReason}` : '';
      throw new Error(`Unable to resolve the global location ID from the Clash Royale API after checking ${totalChecked} locations.${detail}`);
    })().catch(error => {
      globalLocationIdPromise = null;
      throw error;
    });
  }
  return globalLocationIdPromise;
}

async function fetchRankedPlayers(params, locationId) {
  const endpoint = locationId
    ? `/locations/${locationId}/rankings/players`
    : '/locations/global/rankings/players';
  return apiClient.get(`${endpoint}?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${CR_API_TOKEN}`
    }
  });
}

/**
 * Fetches player profile information by player tag.
 * Includes stats like name, level, trophies, best trophies, current arena, etc.
 */
async function getPlayerProfile(playerTag) {
  assertApiToken();
  // Ensure the tag is URL-encoded (API expects %23 instead of # in the URL):contentReference[oaicite:4]{index=4}
  const encodedTag = encodeURIComponent(playerTag.startsWith('#') ? playerTag : `#${playerTag}`);
  const response = await apiClient.get(`/players/${encodedTag}`, {
    headers: {
      Authorization: `Bearer ${CR_API_TOKEN}`
    }
  });
  return response.data;  // returns an object with player profile details
}

/**
 * Fetches the player's card collection (all owned cards with levels and counts).
 * If the API does not provide a direct "cards" endpoint, this could be part of profile or another approach.
 */
async function getPlayerCards(playerTag) {
  assertApiToken();
  const encodedTag = encodeURIComponent(playerTag.startsWith('#') ? playerTag : `#${playerTag}`);
  const response = await apiClient.get(`/players/${encodedTag}`, {
    headers: {
      Authorization: `Bearer ${CR_API_TOKEN}`
    }
  });
  return response.data.cards || [];
}

/**
 * Fetches the player's recent battle log (list of recent matches).
 * This can be used to analyze the player's history (e.g., favorite archetypes, common opponents).
 */
async function getPlayerBattleLog(playerTag) {
  assertApiToken();
  const encodedTag = encodeURIComponent(playerTag.startsWith('#') ? playerTag : `#${playerTag}`);
  const response = await apiClient.get(`/players/${encodedTag}/battlelog`, {
    headers: {
      Authorization: `Bearer ${CR_API_TOKEN}`
    }
  });
  return response.data;  // returns an array of battle objects
}

async function getTopPlayers(playerLimit = 50, pageSize = 200) {
  assertApiToken();
  const players = [];
  let afterCursor = null;
  let locationId = null;

  while (players.length < playerLimit) {
    const params = new URLSearchParams({ limit: `${pageSize}` });
    if (afterCursor) {
      params.set('after', afterCursor);
    }

    let response = await fetchRankedPlayers(params, locationId);
    let items = response.data?.items ?? [];
    if (!afterCursor && items.length === 0) {
      const fallbackLocationId = await getGlobalLocationId();
      if (fallbackLocationId && fallbackLocationId !== locationId) {
        locationId = fallbackLocationId;
        response = await fetchRankedPlayers(params, locationId);
        items = response.data?.items ?? [];
      }
    }
    if (!afterCursor && items.length === 0) {
      const apiReason = response.data?.reason || response.data?.message;
      const detail = apiReason ? ` Reason: ${apiReason}` : '';
      throw new Error(`Clash Royale rankings returned zero players on the first page.${detail}`);
    }
    console.log(`Fetched ${items.length} ranked players from Clash Royale API.`);
    players.push(...items);
    const nextCursor = response.data?.paging?.cursors?.after;
    if (nextCursor) {
      afterCursor = nextCursor;
    } else {
      break;
    }
  }

  return players.slice(0, playerLimit);
}

async function getBattleLog(tag) {
  assertApiToken();
  const encodedTag = encodeURIComponent(tag.startsWith('#') ? tag : `#${tag}`);
  const response = await apiClient.get(`/players/${encodedTag}/battlelog`, {
    headers: {
      Authorization: `Bearer ${CR_API_TOKEN}`
    }
  });
  const battles = response.data ?? [];
  const soloBattle = battles.find(battle => {
    const team = Array.isArray(battle.team) ? battle.team : [];
    const cards = team[0]?.cards;
    const hasDeck = Array.isArray(cards) && cards.length === 8;
    const isSingle = team.length === 1;
    const battleType = typeof battle.type === 'string' ? battle.type.toLowerCase() : '';
    const isTwoVTwo = battleType.includes('2v2');
    return hasDeck && isSingle && !isTwoVTwo;
  });
  if (!soloBattle) {
    return null;
  }
  const team = soloBattle.team ?? [];
  return team[0].cards.map(card => card.name);
}

async function getTopDecks(playerLimit = 50) {
  const players = await getTopPlayers(playerLimit);
  const deckMap = new Map();

  for (const player of players) {
    if (!player?.tag) {
      continue;
    }
    const cards = await getBattleLog(player.tag);
    await delay(REQUEST_DELAY_MS);
    if (!cards || cards.length !== 8) {
      continue;
    }
    const canonicalCards = [...cards].sort((a, b) => a.localeCompare(b));
    const key = canonicalCards.join('|');
    const entry = deckMap.get(key) ?? { cards: canonicalCards, count: 0 };
    entry.count += 1;
    deckMap.set(key, entry);
  }

  return Array.from(deckMap.values()).sort((a, b) => b.count - a.count);
}

async function getCardCatalog() {
  assertApiToken();
  if (!cardCatalogPromise) {
    cardCatalogPromise = apiClient.get('/cards', {
      headers: {
        Authorization: `Bearer ${CR_API_TOKEN}`
      }
    }).catch(error => {
      cardCatalogPromise = null;
      throw error;
    });
  }
  const response = await cardCatalogPromise;
  return response.data?.items ?? [];
}

module.exports = {
  getPlayerProfile,
  getPlayerCards,
  getPlayerBattleLog,
  getTopPlayers,
  getBattleLog,
  getTopDecks,
  getCardCatalog
};
