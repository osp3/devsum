import React from 'react';
import UserHeader from './UserHeader';
import TodaysMetrics from './TodaysMetrics.jsx';
import TodaysSummary from './TodaysSummary.jsx';
import TomorrowsPriorities from './TomorrowsPriorities.jsx';
import ShowRepoButton from './ShowReposButton.jsx';

const Dashboard = ({
  repositories, // Array of all user repositories
  selectedRepo, // Currently selected repository object
  setSelectedRepo, // Function to change selected repository
  reposLoading, // Boolean: true while fetching repositories
  reposError, // String: error message if repo fetch failed
  refreshRepositories, // Function to manually refresh repository data
  yesterdaySummary, // Yesterday's development summary
  summaryLoading, // Loading state for summary
  summaryError, // Error state for summary
  refreshSummary, // Function to manually refresh summary
  user, // Current authenticated user data
}) => {
  return (
    <div className="min-h-screen bg-[#1a1928]">
      <UserHeader user={user} />
     

      <div className=" border border-slate-400 rounded-2xl p-4 m-6 max-w-6xl mx-auto">
        <div className="flex-1 justify-center">
          <TodaysMetrics 
            selectedRepo={selectedRepo}
            reposLoading={reposLoading}
          />
        </div>
      </div>

      <div className="flex justify-row gap-6 max-w-6xl mx-auto ">
        <div className="flex-3  border border-slate-400 rounded-2xl w-150 h-120 p-4 ">
          <TodaysSummary 
            yesterdaySummary={yesterdaySummary}
            summaryLoading={summaryLoading}
            summaryError={summaryError}
            refreshSummary={refreshSummary}
          />
        </div>
        <div className="flex-1 border border-slate-400 rounded-2xl w-100 h-120 p-4">
          <TomorrowsPriorities 
            yesterdaySummary={yesterdaySummary}
          />
        </div>
      </div>

      <ShowRepoButton />
      <h1>Dashboard</h1>
      <p>🎉 Successfully logged in with GitHub!</p>
    </div>
  );
};

export default Dashboard;
