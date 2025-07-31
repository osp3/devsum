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
    <div className='p-6'>
      <h2 className='text-2xl font-bold text-white mb-6'>
        Your GitHub Repositories
      </h2>

      {/* Search input field */}
      <input
        type='text'
        placeholder='Search repositories...'
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className='w-full max-w-md px-4 py-2 mb-6 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'
      />

      {/* Display count of filtered vs total repositories */}
      <p className='text-white/80 mb-6'>
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
        <p className='text-white/60 text-center mt-8'>
          No repositories found matching "{searchTerm}"
        </p>
      )}
    </div>
  );
};

export default RepoGrid;
