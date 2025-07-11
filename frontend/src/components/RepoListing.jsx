import React from 'react';
import { useNavigate } from 'react-router-dom';
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
  const navigate = useNavigate();

  // Handle repository selection - updates shared state in App.jsx
  const handleRepoSelect = (repo) => {
    setSelectedRepo(repo);
  };

  // RENDER THE COMPONENT - What the user sees on the page
  return (
    <div className="min-h-screen bg-[#1a1928]">
      {/* Show user information at the top */}
      <UserHeader />
      
      {/* Main content area */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">GitHub Repositories</h1>
              <p className="text-gray-400">Manage and explore your repositories</p>
            </div>
            <button 
              onClick={() => navigate('/dashboard')}
              className="px-4 py-2 bg-[#5b56dd] text-white rounded-lg hover:bg-[#4c47cc] transition-colors"
            >
              ← Back to Dashboard
            </button>
          </div>
        </div>

        {/* Loading state */}
        {reposLoading && (
          <div className="text-center py-12">
            <div className="text-gray-400 text-lg">Loading repositories...</div>
          </div>
        )}

        {/* Error state */}
        {reposError && (
          <div className="text-center py-12">
            <div className="text-red-400 text-lg">Error: {reposError}</div>
            <button 
              onClick={refreshRepositories}
              className="mt-4 px-4 py-2 bg-[#5b56dd] text-white rounded-lg hover:bg-[#4c47cc] transition-colors"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Repository grid */}
        {!reposLoading && !reposError && repositories.length > 0 && (
          <RepoGrid 
            repositories={repositories}
            selectedRepo={selectedRepo}
            onRepoSelect={handleRepoSelect}
          />
        )}

        {/* Empty state */}
        {!reposLoading && !reposError && repositories.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 text-lg">No repositories found</div>
            <p className="text-gray-500 mt-2">Create your first repository on GitHub to see it here!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default RepoListing;
