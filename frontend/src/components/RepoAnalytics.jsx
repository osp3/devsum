import React from 'react';
import UserHeader from './UserHeader';
import RepoHeader from './RepoHeader.jsx';
import RepoMetricDisplay from './RepoMetricDisplay.jsx';
import RecentCommits from './RecentCommits.jsx';

const RepoAnalytics = ({
  yesterdaySummary
}) => {
  return (
    <div className='min-h-screen bg-[#1a1928]'>
      
      <UserHeader />

      <div className='flex justify-center'>
        <RepoHeader yesterdaySummary={yesterdaySummary} />
      </div>

      <div className='  items-center  border border-slate-400   rounded-2xl  p-4 gap-6 max-w-6xl mx-auto '>
        <RepoMetricDisplay />
        
        <div className = 'flex flex-col border-slate-400 rounded-2xl  p-4'>
        <RecentCommits />
        </div>
      </div>
    </div>
  );
};

export default RepoAnalytics;
