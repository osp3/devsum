import React from 'react';
import UserHeader from './UserHeader';
import TodaysMetrics from './TodaysMetrics.jsx';
import TodaysSummary from './TodaysSummary.jsx';
import TomorrowsPriorities from './TomorrowsPriorities.jsx';
import ShowRepoButton from './ShowReposButton.jsx';

const Dashboard = () => {
  return (
    <div>
      <UserHeader />
      <TodaysMetrics />
      <TodaysSummary />
      <TomorrowsPriorities />
      <ShowRepoButton />
    </div>
  );
};

export default Dashboard;
