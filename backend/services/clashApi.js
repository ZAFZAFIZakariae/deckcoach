const axios = require('axios');
const { CR_API_TOKEN, CR_API_BASE_URL, CR_API_TIMEOUT_MS } = require('../config');
const { delay, promisePool } = require('../utils/pool');

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
const PLAYER_CONCURRENCY = 4;
const RATE_LIMIT_BACKOFF_MS = 1000;
const MIN_PAGE_SIZE = 20;
const FALLBACK_COUNTRY_CODES = ['US', 'FR', 'ES', 'DE', 'GB'];
const FALLBACK_COUNTRY_NAMES = ['United States', 'France', 'Spain', 'Germany', 'United Kingdom'];
let cardCatalogPromise = null;

function getApiErrorDetails(error) {
  const status = error?.response?.status;
  const reason = error?.response?.data?.reason;
  const message = error?.response?.data?.message;
  return { status, reason, message };
}

function isRankingsNotFound(error) {
  const { status, reason, message } = getApiErrorDetails(error);
  const combined = `${reason || ''} ${message || ''}`.toLowerCase();
  return status === 404 && combined.includes('rankings not found for location');
}

function isForbidden(error) {
  return getApiErrorDetails(error).status === 403;
}

function isRateLimited(error) {
  return getApiErrorDetails(error).status === 429;
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

async function findFallbackLocation() {
  assertApiToken();
  let afterCursor = null;
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
    const match = items.find(item => {
      const code = item?.countryCode?.toUpperCase();
      const name = item?.name?.trim();
      return (code && FALLBACK_COUNTRY_CODES.includes(code)) ||
        (name && FALLBACK_COUNTRY_NAMES.includes(name));
    });

    if (match?.id) {
      return {
        id: match.id,
        name: match.name,
        countryCode: match.countryCode
      };
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
  throw new Error(`Unable to find a fallback country location in Clash Royale API.${detail}`);
}

async function getRankedPlayers({
  playerLimit = 50,
  pageSize = 200,
  locationId = null,
  locationLabel = 'global'
} = {}) {
  assertApiToken();
  const players = [];
  let afterCursor = null;
  let currentPageSize = pageSize;
  let maxPlayers = playerLimit;
  let rateLimitHits = 0;

  while (players.length < maxPlayers) {
    const params = new URLSearchParams({ limit: `${currentPageSize}` });
    if (afterCursor) {
      params.set('after', afterCursor);
    }

    let response;
    let items = [];

    try {
      response = await fetchRankedPlayers(params, locationId);
      items = response.data?.items ?? [];
    } catch (error) {
      if (isRateLimited(error)) {
        rateLimitHits += 1;
        console.warn(`[ClashApi] Rate limited while fetching rankings for ${locationLabel}. Backing off and reducing sample size.`);
        await delay(RATE_LIMIT_BACKOFF_MS * rateLimitHits);
        currentPageSize = Math.max(MIN_PAGE_SIZE, Math.floor(currentPageSize / 2));
        maxPlayers = Math.max(MIN_PAGE_SIZE, Math.floor(maxPlayers / 2));
        if (rateLimitHits > 2) {
          break;
        }
        continue;
      }

      if (isForbidden(error)) {
        throw new Error('Clash Royale API request forbidden (403). Check CR_API_TOKEN or IP allowlist.');
      }

      if (isRankingsNotFound(error)) {
        return {
          players: [],
          rankingsUnavailable: true,
          warning: `Rankings not found for ${locationLabel}.`
        };
      }

      throw error;
    }

    if (!afterCursor && items.length === 0) {
      console.warn(`[ClashApi] Rankings returned zero players for ${locationLabel}.`);
      break;
    }

    console.log(`[ClashApi] Fetched ${items.length} ranked players from ${locationLabel}.`);
    players.push(...items);

    const nextCursor = response.data?.paging?.cursors?.after;
    if (nextCursor) {
      afterCursor = nextCursor;
    } else {
      break;
    }
  }

  const warning = rateLimitHits > 0
    ? `Rate limited while fetching rankings for ${locationLabel}; sample size reduced.`
    : null;

  return {
    players: players.slice(0, maxPlayers),
    rankingsUnavailable: false,
    warning
  };
}

async function getPopularDecks(deckLimit = 10) {
  assertApiToken();
  const params = new URLSearchParams({ limit: `${deckLimit}` });

  try {
    const response = await apiClient.get(`/decks/popular?${params.toString()}`, {
      headers: {
        Authorization: `Bearer ${CR_API_TOKEN}`
      }
    });

    const items = response.data?.items ?? [];
    const decks = items.map(item => {
      const cards = item?.cards || item?.deck || item?.deckCards || item?.cardsList;
      if (!Array.isArray(cards)) {
        return null;
      }
      const cardNames = cards.map(card => card?.name || card).filter(Boolean);
      if (cardNames.length !== 8) {
        return null;
      }
      return {
        cards: cardNames.sort((a, b) => a.localeCompare(b)),
        count: item?.count || item?.usage || 1,
        archetype: item?.archetype || 'Unknown'
      };
    }).filter(Boolean);

    if (decks.length > 0) {
      console.log(`[ClashApi] Using popular decks endpoint with ${decks.length} decks.`);
    }

    return decks;
  } catch (error) {
    if (isForbidden(error)) {
      throw new Error('Clash Royale API request forbidden (403). Check CR_API_TOKEN or IP allowlist.');
    }
    if (isRateLimited(error)) {
      console.warn('[ClashApi] Rate limited while fetching popular decks. Falling back to player sampling.');
      await delay(RATE_LIMIT_BACKOFF_MS);
      return [];
    }
    if (error?.response?.status === 404) {
      console.info('[ClashApi] Popular decks endpoint not available. Falling back to player sampling.');
      return [];
    }
    console.warn('[ClashApi] Failed to fetch popular decks. Falling back to player sampling.', error?.response?.data || error.message);
    return [];
  }
}

/**
 * Fetches player profile information by player tag.
 * Includes stats like name, level, trophies, best trophies, current arena, etc.
 */
async function getPlayerProfile(playerTag) {
  assertApiToken();
  // Ensure the tag is URL-encoded (API expects %23 instead of # in the URL)
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
  const result = await getRankedPlayers({
    playerLimit,
    pageSize,
    locationLabel: 'global',
    locationId: null
  });

  if (result.rankingsUnavailable) {
    console.warn('[ClashApi] Global rankings not available. getTopPlayers returned an empty list.');
    return [];
  }

  return result.players;
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

async function getPlayerDeck(tag) {
  try {
    const profile = await getPlayerProfile(tag);
    const deck = profile?.currentBattleDeck || profile?.currentDeck;
    if (Array.isArray(deck) && deck.length === 8) {
      return deck.map(card => card.name).filter(Boolean);
    }
  } catch (error) {
    if (isForbidden(error)) {
      throw new Error('Clash Royale API request forbidden (403). Check CR_API_TOKEN or IP allowlist.');
    }
    if (isRateLimited(error)) {
      console.warn(`[ClashApi] Rate limited while fetching profile for ${tag}. Skipping.`);
      await delay(RATE_LIMIT_BACKOFF_MS);
      return null;
    }
    console.warn(`[ClashApi] Failed to fetch profile for ${tag}. Falling back to battle log.`, error?.response?.data || error.message);
  }

  try {
    return await getBattleLog(tag);
  } catch (error) {
    if (isRateLimited(error)) {
      console.warn(`[ClashApi] Rate limited while fetching battle log for ${tag}. Skipping.`);
      await delay(RATE_LIMIT_BACKOFF_MS);
      return null;
    }
    console.warn(`[ClashApi] Failed to fetch battle log for ${tag}.`, error?.response?.data || error.message);
    return null;
  }
}

async function getTopDecks(playerLimit = 50) {
  const popularDecks = await getPopularDecks(10);
  if (popularDecks.length > 0) {
    return {
      decks: popularDecks,
      source: 'popular-decks',
      warning: null
    };
  }

  const globalResult = await getRankedPlayers({
    playerLimit,
    pageSize: 200,
    locationLabel: 'global',
    locationId: null
  });

  let players = globalResult.players;
  let source = 'global-rankings';
  let warning = globalResult.warning;

  if (players.length === 0) {
    console.warn('[ClashApi] Global rankings unavailable. Falling back to country rankings.');
    const fallbackLocation = await findFallbackLocation();
    const fallbackLabel = fallbackLocation.name || fallbackLocation.countryCode || fallbackLocation.id;
    const fallbackResult = await getRankedPlayers({
      playerLimit,
      pageSize: 200,
      locationLabel: fallbackLabel,
      locationId: fallbackLocation.id
    });

    players = fallbackResult.players;
    source = 'fallback-location';
    warning = [globalResult.warning, fallbackResult.warning]
      .filter(Boolean)
      .join(' | ') || warning;
  }

  if (players.length === 0) {
    return {
      decks: [],
      source: 'fallback',
      warning: warning || 'Unable to fetch ranked players for deck sampling.'
    };
  }

  const deckMap = new Map();

  await promisePool(players.slice(0, playerLimit), async player => {
    if (!player?.tag) {
      return null;
    }
    const cards = await getPlayerDeck(player.tag);
    await delay(REQUEST_DELAY_MS);
    if (!cards || cards.length !== 8) {
      return null;
    }
    const canonicalCards = [...cards].sort((a, b) => a.localeCompare(b));
    const key = canonicalCards.join('|');
    const entry = deckMap.get(key) ?? { cards: canonicalCards, count: 0, archetype: 'Unknown' };
    entry.count += 1;
    deckMap.set(key, entry);
    return null;
  }, { concurrency: PLAYER_CONCURRENCY });

  const decks = Array.from(deckMap.values()).sort((a, b) => b.count - a.count);
  if (decks.length === 0) {
    return {
      decks: [],
      source,
      warning: warning || 'No decks could be built from sampled players.'
    };
  }

  return {
    decks,
    source,
    warning
  };
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
