import React from 'react';

const TodaysMetrics = ({
  yesterdaySummary,
 })=> {
  if(!yesterdaySummary)return <div className='p-4 text-gray-400'>No commits available</div>

  return (
    <div className='flex flex-row gap-2 '>
      <div className=' flex-1  flex-item-center rounded-lg   border border-slate-400  text-center  bg-[#272633]  m-4 '>
        <h4 className='justify-items-center text-2xl m-2'>{yesterdaySummary.commitCount}</h4>
        <h1> Yesterday's Commits</h1>
      </div>

      <div className=' flex-1  flex-item-center rounded-lg  border border-slate-400   text-center  bg-[#272633]  m-4 '>
        <h4 className=' justify-items-center text-2xl m-2'>{yesterdaySummary.repositoryCount}</h4>
        <h1>Total Repository</h1>
      </div>

    

    </div>
  );
};

export default TodaysMetrics;
