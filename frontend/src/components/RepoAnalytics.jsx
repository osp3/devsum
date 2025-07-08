import React from 'react';
import UserHeader from './UserHeader';
import RepoHeader from './RepoHeader.jsx';
import RepoMetricDisplay from './RepoMetricDisplay.jsx';
import RecentCommits from './RecentCommits.jsx';

const RepoAnalytics = () => {
  return (
    <div>
      <UserHeader />
      <RepoHeader />
      <RepoMetricDisplay />
      <RecentCommits />
    </div>
  );
};

export default RepoAnalytics;
