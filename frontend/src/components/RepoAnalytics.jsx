import React from 'react';
import UserHeader from './UserHeader';
import RepoHeader from './RepoHeader.jsx';
import RepoMetricDisplay from './RepoMetricDisplay.jsx';
import RecentCommits from './RecentCommits.jsx';

const RepoAnalytics = ({ 
  repositories,        // Array of all user repositories (from App.jsx)
  selectedRepo,        // Currently selected repository object
  setSelectedRepo,     // Function to change selected repository
  reposLoading,        // Boolean: true while fetching repositories
  reposError,          // String: error message if repo fetch failed
  refreshRepositories  // Function to manually refresh repository data
}) => {
  return (
    <div className='min-h-screen bg-[#1a1928]'>
      <h1>repo header</h1>
      <UserHeader />

      <div className='flex justify-center'>
        <RepoHeader />
      </div>

      <div className='flex flex-col  items-center  border border-slate-400   rounded-2xl  p-4 gap-6 max-w-6xl mx-auto '>
        <RepoMetricDisplay />
        <RecentCommits />
      </div>
    </div>
  );
};

export default RepoAnalytics;
