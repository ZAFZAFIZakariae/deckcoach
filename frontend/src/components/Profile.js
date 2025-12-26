import React from 'react';

function Profile({ profile }) {
  if (!profile) return null;
  return (
    <div className="Profile" style={{ border: '1px solid #ccc', padding: '1em', marginBottom: '1em' }}>
      <h2>Player Profile</h2>
      <p><strong>Name:</strong> {profile.name} &mdash; <em>Tag: {profile.tag}</em></p>
      <p><strong>King Level:</strong> {profile.expLevel || profile.level} 
         {profile.arena ? ` (Arena: ${profile.arena.name})` : ""}</p>
      <p><strong>Trophies:</strong> {profile.trophies} (Best: {profile.bestTrophies})</p>
      {profile.clan && 
        <p><strong>Clan:</strong> {profile.clan.name} ({profile.clan.tag})</p>
      }
      {profile.currentDeck && profile.currentDeck.length > 0 && (
        <div>
          <h4>Your Current Deck</h4>
          <p>{profile.currentDeck.map(card => card.name).join(', ')}</p>
        </div>
      )}
    </div>
  );
}

export default Profile;
