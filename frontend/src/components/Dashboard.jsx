import React from 'react';
import UserHeader from './UserHeader';
import TodaysMetrics from './TodaysMetrics.jsx';
import TodaysSummary from './TodaysSummary.jsx';
import TomorrowsPriorities from './TomorrowsPriorities.jsx';
import ShowRepoButton from './ShowReposButton.jsx';

// Main dashboard component with comprehensive app state management
const Dashboard = ({
  //repositories, // Array of all user repositories
  selectedRepo, // Currently selected repository object
  // setSelectedRepo, // Function to change selected repository
  reposLoading, // Boolean: true while fetching repositories
  //reposError, // String: error message if repo fetch failed
  //refreshRepositories, // Function to manually refresh repository data
  yesterdaySummary, // Yesterday's development summary
  summaryLoading, // Loading state for summary
  summaryError, // Error state for summary
  refreshSummary, // Function to manually refresh summary
  taskSuggestions, // AI-generated task suggestions
  tasksLoading, // Loading state for tasks
  tasksError, // Error state for tasks
  refreshTasks, // Function to refresh task suggestions
  user, // Current authenticated user data
}) => {
  return (
    <div
      className='min-h-screen'
      style={{
        background:
          'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
      }}
    >
      {/* Navigation header with user info and controls */}
      <UserHeader user={user} />

      {/* Top metrics section - repository statistics */}
      <div className=' border border-slate-400 rounded-2xl p-4 m-6 max-w-7xl mx-auto'>
        <div className='flex-1 justify-center'>
          <TodaysMetrics
            selectedRepo={selectedRepo}
            reposLoading={reposLoading}
            yesterdaySummary={yesterdaySummary}
          />
        </div>
      </div>

      {/* Main content area - two column layout */}
      <div className='flex justify-row gap-6 max-w-7xl mx-auto '>
        {/* Left column - yesterday's development summary */}
        <div className='flex-3  border border-slate-400 rounded-2xl w-150 h-150 p-4  '>
          <TodaysSummary
            yesterdaySummary={yesterdaySummary}
            summaryLoading={summaryLoading}
            summaryError={summaryError}
            refreshSummary={refreshSummary}
          />
        </div>
        {/* Right column - AI-generated task priorities */}
        <div className='flex-1 border border-slate-400 rounded-2xl w-100 h-150 p-4'>
          <TomorrowsPriorities
            taskSuggestions={taskSuggestions}
            tasksLoading={tasksLoading}
            tasksError={tasksError}
            refreshTasks={refreshTasks}
          />
        </div>
      </div>

      {/* Footer elements - repository navigation and status */}
      <ShowRepoButton />

      {/* <p>🎉 Successfully logged in with GitHub!</p> */}
    </div>
  );
};

export default Dashboard;
