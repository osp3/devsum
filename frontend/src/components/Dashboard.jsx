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

      <div className=' border border-slate-400 rounded-2xl p-4 m-6 max-w-6xl mx-auto'>

        <div className='flex justify-center'>
            <TodaysMetrics />
        </div>
      
      </div>

<div className = 'flex justify-row gap-6 max-w-6xl mx-auto '>

      <div className='flex-3  border border-slate-400 rounded-2xl w-150 h-120 p-4 '>
        <TodaysSummary /> 
        
      </div>
      <div className='flex-1 border border-slate-400 rounded-2xl w-100 h-120 p-4'>
          <TomorrowsPriorities />
        </div>
</div>
      

      <ShowRepoButton />
    </div>
  );
};

export default Dashboard;


//<div className='flex-1 border border-slate-400 rounded-2xl w-100 h-90 p-4 m-6 max-w-6xl mx-auto'>