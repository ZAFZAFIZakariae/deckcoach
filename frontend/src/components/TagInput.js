import React, { useState } from 'react';

function TagInput({ onSubmit }) {
  const [tag, setTag] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!tag.trim()) return;
    onSubmit(tag.trim());
  };

  return (
    <form onSubmit={handleSubmit} style={{ marginBottom: '1em' }}>
      <input 
        type="text" 
        value={tag} 
        onChange={(e) => setTag(e.target.value)} 
        placeholder="Enter your player tag (e.g., #ABCD123)" 
        style={{ width: '200px', marginRight: '0.5em' }}
      />
      <button type="submit">Get Recommendations</button>
    </form>
  );
}

export default TagInput;
