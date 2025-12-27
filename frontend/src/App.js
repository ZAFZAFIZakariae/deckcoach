import React, { useEffect, useState } from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import { api } from './services/api';
import TagInput from './components/TagInput';
import Profile from './components/Profile';
import DeckList from './components/DeckList';
import CardList from './components/CardList';

function App() {
  const [playerData, setPlayerData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [topDecks, setTopDecks] = useState([]);
  const [topDecksError, setTopDecksError] = useState("");
  const [topDecksLoading, setTopDecksLoading] = useState(false);

  // Handler to initiate fetching player data from backend
  const handleFetchData = async (playerTag) => {
    setError("");
    setLoading(true);
    try {
      const data = await api.fetchPlayerData(playerTag);
      setPlayerData(data);
    } catch (err) {
      console.error(err);
      setError("Failed to fetch data. Please make sure the tag is correct and try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    const fetchDecks = async () => {
      setTopDecksError("");
      setTopDecksLoading(true);
      try {
        const decks = await api.fetchTopDecks();
        if (mounted) {
          setTopDecks(decks);
        }
      } catch (err) {
        console.error(err);
        if (mounted) {
          setTopDecksError("Failed to load top decks. Please try again later.");
        }
      } finally {
        if (mounted) {
          setTopDecksLoading(false);
        }
      }
    };

    fetchDecks();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="App" style={{ padding: '1em' }}>
      <h1>DeckCoach <small style={{ fontSize: '0.6em' }}>for Clash Royale</small></h1>
      {/* Input form for player tag */}
      <TagInput onSubmit={handleFetchData} />
      
      {/* Error and loading states */}
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {loading && <p>Loading player data...</p>}

      <section style={{ marginTop: '1.5em' }}>
        {topDecksLoading && <p>Loading top decks...</p>}
        {topDecksError && <p style={{ color: 'red' }}>{topDecksError}</p>}
        {!topDecksLoading && !topDecksError && <DeckList decks={topDecks} />}
      </section>
      
      {/* Dashboard view: show profile and top deck suggestions when data is loaded */}
      {playerData && !loading && (
        <div className="dashboard">
          <Profile profile={playerData.profile} />
          {/* Link to navigate to the Cards page to view full collection */}
          <p><Link to="/cards">View All Cards in Collection</Link></p>
        </div>
      )}

      {/* Define routes for main dashboard and cards page */}
      <Routes>
        <Route path="/cards" element={
          playerData ? <CardList cards={playerData.cards} /> : <p>Please load a player profile first.</p>
        } />
        {/* The main route ("/") just shows the dashboard (already rendered above when playerData is available). */}
        <Route path="/" element={null} />
      </Routes>
    </div>
  );
}

export default App;
