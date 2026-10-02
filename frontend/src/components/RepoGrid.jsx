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
    <div className='mx-auto max-w-7xl p-4 sm:p-6'>
      <p className='eyebrow'>Repositories</p>
      <h2 className='mt-2 mb-6 text-3xl font-semibold tracking-[-0.03em]'>
        Your GitHub repositories
      </h2>

      {/* Search input field */}
      <input
        type='search'
        aria-label='Search repositories'
        placeholder='Search repositories...'
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className='field w-full max-w-md mb-4'
      />

      {/* Display count of filtered vs total repositories */}
      <p className='font-geist-mono text-xs text-fg/60 mb-6'>
        Showing {filteredRepos.length} of {repositories.length} repositories
      </p>

      {/* Grid layout for repository cards */}
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
        {filteredRepos.map((repo) => (
          <RepoCard
            key={repo.id}
            repository={repo}
            setSelectedRepo={setSelectedRepo}
          />
        ))}
      </div>

      {/* Show "no results" message when search returns empty and user has typed something */}
      {filteredRepos.length === 0 && searchTerm && (
        <p className='text-fg/60 text-center mt-8'>
          No repositories found matching "{searchTerm}"
        </p>
      )}
    </div>
  );
};

export default RepoGrid;
