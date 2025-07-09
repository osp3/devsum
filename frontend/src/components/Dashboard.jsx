import React from 'react';
import UserHeader from './UserHeader';
import TodaysMetrics from './TodaysMetrics.jsx';
import TodaysSummary from './TodaysSummary.jsx';
import TomorrowsPriorities from './TomorrowsPriorities.jsx';
import ShowRepoButton from './ShowReposButton.jsx';

const Dashboard = () => {
  return (
    <div className='min-h-screen bg-[#1a1928]'>
      <h1>hello this is the main page</h1>
      <UserHeader />
    
        <div className= 'flex  justify-center border border-slate-400 rounded-2xl w-250 h-40 p-4'>
        <TodaysMetrics />
      </div>
      {/* <TodaysMetrics /> */}
      <TodaysSummary />
      <TomorrowsPriorities />
      <ShowRepoButton />
    </div>
  );
};

export default Dashboard;

