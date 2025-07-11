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
    <div>
      {/* Show user information at the top */}
      <UserHeader />
    </div>
  );
};

export default RepoListing;
