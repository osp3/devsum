import React from 'react';
import UserHeader from './UserHeader';
import RepoGrid from './RepoGrid.jsx';

// Receives shared repository data from App.jsx - no more local fetching needed
const RepoListing = ({ 
  repositories,        // Array of all user repositories (from App.jsx)
  selectedRepo,        // Currently selected repository object
  setSelectedRepo,     // Function to change selected repository
  reposLoading,        // Boolean: true while fetching repositories
  reposError,          // String: error message if repo fetch failed
  refreshRepositories  // Function to manually refresh repository data
}) => {

  // Handle repository selection - updates shared state in App.jsx
  const handleRepoSelect = (repo) => {
    setSelectedRepo(repo);
  };

  // RENDER THE COMPONENT - What the user sees on the page
  return (
    <div className='min-h-screen bg-[#1a1928]'>
      {/* Show user information at the top */}
      <UserHeader />
      
      <div className='container mx-auto px-4 py-8'>
        {/* Header with refresh button */}
        <div className='flex justify-between items-center mb-6'>
          <h1 className='text-3xl font-bold text-white'>Your Repositories</h1>
          <button
            onClick={refreshRepositories}
            disabled={reposLoading}
            className='bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg'
          >
            {reposLoading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        {/* Error handling */}
        {reposError && (
          <div className='bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4'>
            Error: {reposError}
          </div>
        )}

        {/* Loading state */}
        {reposLoading && (
          <div className='text-center py-8'>
            <div className='text-white'>Loading repositories...</div>
          </div>
        )}

        {/* Repository grid */}
        {!reposLoading && !reposError && (
          <RepoGrid
            repositories={repositories}
            selectedRepo={selectedRepo}
            onRepoSelect={handleRepoSelect}
          />
        )}

        {/* Empty state */}
        {!reposLoading && !reposError && repositories.length === 0 && (
          <div className='text-center py-8 text-gray-400'>
            No repositories found. Make sure you have repositories in your GitHub account.
          </div>
        )}
      </div>
    </div>
  );
};

export default RepoListing;
