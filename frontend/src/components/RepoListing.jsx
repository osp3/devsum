import React from 'react';
import UserHeader from './UserHeader';
import RepoGrid from './RepoGrid.jsx';

// RepoListing serves as a container for the repositories page
// Props:
// repositories: array of GitHub repository objects fetched from API
// setSelectedRepo: function to update selected repository in App.jsx state
const RepoListing = ({
  repositories, // array of all user repositories (from App.jsx)
  setSelectedRepo, // function to change selected repository
}) => {
  console.log('RepoListing received setSelectedRepo:', typeof setSelectedRepo);

  // RENDER THE COMPONENT - What the user sees on the page
  return (
    <div>
      {/* Show user information at the top */}
      <UserHeader />
      <RepoGrid repositories={repositories} setSelectedRepo={setSelectedRepo} />
    </div>
  );
};

export default RepoListing;
