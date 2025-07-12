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
    <div className='p-4'>
      <div className='flex justify-items-start font-bold text-white'>
        Yesterday's Development Summary
      </div>
      <div className='relative rounded-lg text-[#5b56dd] bg-[#272633] shadow-[-4px_0_0_0px] m-3'>
        <div className='flex justify-between items-center p-2 border-b border-gray-600'>
          <button className='btn bg-[#44905e] text-white px-3 py-1 rounded'>
            {yesterdaySummary.repositoryCount} repos
          </button>
          <span className='text-xs text-gray-500'>
            {yesterdaySummary.date}
          </span>
        </div>
        <div className='p-4 text-white text-sm whitespace-pre-wrap font-mono max-h-80 overflow-y-auto'>
          {yesterdaySummary.summary}
        </div>
      </div>
    </div>
  );
};

export default TodaysSummary;