import React, { useState } from 'react';
import RepoCard from './RepoCard';

// RepoGrid displays a searchable list of GitHub repositories
// Props:
// repositories: array of repository objects from GitHub API
// setSelectedRepo: function to update selected repository in App.jsx state
const RepoGrid = ({ repositories, setSelectedRepo }) => {
  // Local state to store the current search input
  const [searchTerm, setSearchTerm] = useState('');

  // Filter repositories based on search term
  // Searches both repository name and description (case-insensitive)
  const filteredRepos = repositories.filter(
    (repo) =>
      // Check if repo name contains search term
      repo.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      // Check if repo description exists and contains search term
      (repo.description &&
        repo.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div>
      <h2>Your GitHub Repositories</h2>

      {/* Search input field */}
      <input
        type='text'
        placeholder='Search repositories...'
        value={searchTerm} // value comes from state
        onChange={(e) => setSearchTerm(e.target.value)} // update search state on input change
        style={{ padding: '8px', marginBottom: '20px', width: '300px' }}
      />

      {/* Display count of filtered vs total repositories */}
      <p>
        Showing {filteredRepos.length} of {repositories.length} repositories
      </p>

      {/* Render a RepoCard for each filtered repository */}
      {filteredRepos.map((repo) => (
        <RepoCard
          key={repo.id} // GitHub repo ID
          repository={repo} // pass entire repository object to card
          setSelectedRepo={setSelectedRepo} // pass down function to update selected repo
        />
      ))}

      {/* Show "no results" message when search returns empty and user has typed something */}
      {filteredRepos.length === 0 && searchTerm && (
        <p>No repositories found matching "{searchTerm}"</p>
      )}
    </div>
  );
};

export default RepoGrid;
