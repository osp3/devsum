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
  user, // current authenticated user data
}) => {
  console.log('RepoListing received setSelectedRepo:', typeof setSelectedRepo);

  // RENDER THE COMPONENT - What the user sees on the page
  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)' }}>
      {/* Show user information at the top */}
      <UserHeader user={user} />
      <RepoGrid repositories={repositories} setSelectedRepo={setSelectedRepo} />
    </div>
  );
};

export default RepoListing;
