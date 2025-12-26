# DeckCoach for Clash Royale

DeckCoach is a split backend/frontend application that analyzes a Clash Royale player profile and collection to recommend meta decks that are playable now, need upgrades, or should be avoided. It fetches live data from the official Clash Royale API and compares it against a curated set of meta decks.

## Features

- Fetch player profile details (trophies, clan, current deck).
- Inspect the full card collection with upgrade status.
- Compute deck recommendations with a fit score and upgrade guidance.
- View recommendations by category: playable now, needs upgrades, or needs a substitution.

## Project Structure

```
/ (project root)
├── backend/
│   ├── package.json
│   ├── config.js
│   ├── data/
│   │   └── metaDecks.json
│   ├── server.js
│   └── routes/
│       └── players.js
└── frontend/
    ├── package.json
    ├── pages/
    │   ├── index.js
    │   ├── cards.js
    │   └── recommendations.js
    ├── components/
    │   ├── ProfileSummary.js
    │   ├── CardList.js
    │   └── DeckSuggestion.js
    └── next.config.js (optional)
```

## Backend (Node.js/Express)

### Setup

```bash
cd backend
npm install
```

### Configuration

Update the Clash Royale API token in `backend/config.js`:

```js
module.exports = {
  CR_API_TOKEN: "YOUR_API_TOKEN_HERE"
};
```

> Note: You must also add your server IP to the allowed list in your Clash Royale API key settings.

### Running the backend

```bash
npm start
```

The backend runs on `http://localhost:3001`.

### API Endpoints

- `GET /api/player/:tag/profile`
  - Fetches basic profile data and current deck.
- `GET /api/player/:tag/cards`
  - Fetches the full card collection and annotates upgrade availability.
- `GET /api/player/:tag/battlelog`
  - Proxies the recent battle log.
- `GET /api/player/:tag/recommendations`
  - Computes deck recommendations with fit scores, missing cards, and upgrade plans.

## Frontend (Next.js/React)

### Setup

```bash
cd frontend
npm install
```

### Running the frontend

```bash
npm run dev
```

The frontend runs on `http://localhost:3000`.

### Pages

- `/` — Enter a player tag to fetch profile info and the top 3 deck recommendations.
- `/cards` — View the full card collection and upgrade status.
- `/recommendations` — View all deck recommendations with detailed upgrade guidance.

## Recommendation Logic (High-Level)

Deck recommendations are computed on the backend by comparing the player’s collection to a curated list of meta decks (`backend/data/metaDecks.json`). Each deck is scored and labeled:

- **Play Now**: All cards owned and at or near the king level.
- **Needs Upgrades**: Playable with small upgrades.
- **With Substitution**: Missing one non-core card and can substitute.
- **Avoid**: Missing core cards or too many underleveled cards.

An upgrade plan is attached to recommend the top 1–2 cards to improve first.

## Development Notes

- The UI is intentionally minimal for clarity.
- All data is fetched live; nothing is persisted server-side.
- Future enhancements could incorporate battle log analysis or persistent profiles.

## Common Issues

- **401/403 from Clash Royale API**: Ensure your API token is correct and your IP is whitelisted.
- **CORS errors**: Confirm the backend is running and available at `localhost:3001`.

## License

This project is provided as-is for learning and local experimentation.
