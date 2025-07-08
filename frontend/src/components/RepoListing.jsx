import React from 'react';
import UserHeader from './UserHeader';
import RepoGrid from './RepoGrid.jsx';
import RepoCard from './RepoCard.jsx';

const RepoListing = () => {
  return (
    <div>
      <UserHeader />
      <RepoGrid />
      <RepoCard />
    </div>
  );
};

export default RepoListing;
