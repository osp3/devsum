import React from 'react';

const TodaysSummary = () => {
  const ProperCommits = {};

  return (
    <div className='p-4'>
      <div className='flex justify-items-start font-bold'>
        Today's Development Summary
      </div>

      <div className=' flex flex-row justify-between items-center rounded-lg text-[#5b56dd] bg-[#272633] shadow-[-4px_0_0_0px] w-95 h-15 m-4'>
        <button className='btn bg-[#44905e] '>feat</button>

        <h1 className='flex justify-items-end p-1'>this is todays summary</h1>

        <span className='text-xs text-gray-500 flex justify-end'>
          {' '}
          date
          {/* {new Date(commit.date).toLocaleDateString()} */}
        </span>
      </div>
    </div>
  );
};

export default TodaysSummary;
// working on getting this is today summary to the left
