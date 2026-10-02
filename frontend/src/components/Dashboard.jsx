import React from 'react';
import AppShell from './AppShell.jsx';
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
    <AppShell user={user}>
      {/* Top metrics section - repository statistics */}
      <div className='panel p-4 m-4 sm:m-6 max-w-7xl xl:mx-auto'>
        <div className='flex-1 justify-center'>
          <TodaysMetrics
            selectedRepo={selectedRepo}
            reposLoading={reposLoading}
            yesterdaySummary={yesterdaySummary}
          />
        </div>
      </div>

      {/* Main content area - two column layout */}
      <div className='flex flex-col lg:flex-row gap-6 max-w-7xl mx-4 sm:mx-6 xl:mx-auto'>
        {/* Left column - yesterday's development summary */}
        <div className='lg:flex-3 min-w-0 panel lg:h-150 p-4'>
          <TodaysSummary
            yesterdaySummary={yesterdaySummary}
            summaryLoading={summaryLoading}
            summaryError={summaryError}
            refreshSummary={refreshSummary}
          />
        </div>
        {/* Right column - AI-generated task priorities */}
        <div className='lg:flex-1 min-w-0 panel lg:h-150 p-4'>
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
    </AppShell>
  );
};

export default Dashboard;
