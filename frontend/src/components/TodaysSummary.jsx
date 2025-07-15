import React from 'react';

const TodaysSummary = ({ 
  yesterdaySummary, 
  summaryLoading, 
  summaryError 
}) => {
  if (summaryLoading) return <div className='p-4 text-white'>Loading...</div>;
  if (summaryError) return <div className='p-4 text-red-400'>Error: {summaryError}</div>;
  if (!yesterdaySummary) return <div className='p-4 text-gray-400'>No summary available</div>;

  return (
    <div className='p-2'>
      <div className='flex justify-items-start font-bold text-white'>
        Yesterday's Development Summary
      </div>
{/* add a height of 90  to the scroll bar with a padding od 2*/}
<div className = 'max-h-90  overflow-y-auto pr-2'>
      <div className='relative flex flex-row justify-between items-center rounded-lg text-[#5b56dd] bg-[#272633] shadow-[-4px_0_0_0px] m-3'>
        <button className='btn bg-[#44905e] text-white px-3 py-1 rounded'>
          {yesterdaySummary.repositoryCount} repos
        </button>
        <h1 className='flex-1 p-2 text-white'>{yesterdaySummary.summary}</h1>
        <span className='absolute top-2 right-2 text-xs text-gray-500'>
          {yesterdaySummary.date}
        </span>
      </div>
     

   
</div>
    </div>
  );
};

export default TodaysSummary;
