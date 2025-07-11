import React from 'react';
import { useState, useEffect } from 'react';

const TodaysSummary = ({ commits, repositoryId, date }) => {
  const [summary, setSummary] = useState('');
  //const [summaryDate, setSummaryDate]= useState()

  const summaryData = async () => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/ai/daily-summary`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            commits: commits,
            repositoryId: repositoryId,
            date: date,
          }),
        }
      );

      // console.log(response.json())
      const result = await response.json();
      console.log(result);
      setSummary(result.data.summary);
    } catch (error) {
      return error;
    }
  };

  useEffect(() => {
    if (commits && commits.length > 0) {
      summaryData();
    }
  }, [commits, repositoryId, date]);

  //possible for button colors
  const ProperCommits = {
    feature: { color: 'bg-green-100 text-green-800', label: 'Feature' },
    bug: { color: 'bg-red-100 text-red-800', label: 'Bug Fix' },
    refactor: { color: 'bg-blue-100 text-blue-800', label: 'Refactor' },
    docs: { color: 'bg-purple-100 text-purple-800', label: 'Docs' },
    test: { color: 'bg-yellow-100 text-yellow-800', label: 'Test' },
    chore: { color: 'bg-gray-100 text-gray-800', label: 'Chore' },
  };

  return (
    <div className='p-4'>
      {/* put on the left of summary component */}
      <div className='flex justify-items-start font-bold'>
        Today's Development Summary
      </div>
      {/* Creates box with background color and purple shadow at the left */}
      <div className=' relative flex flex-row justify-between items-center rounded-lg text-[#5b56dd] bg-[#272633] shadow-[-4px_0_0_0px] m-3'>
        <button className='btn bg-[#44905e] '>feat</button>

        {/*   puts this summery to the left next to button */}
        <h1 className='flex-1 p-2'>{summary} </h1>
        {/* if date want to be center just get ride of the absolute and relative */}
        <span className=' absolute top-2 right-2 text-xs text-gray-500 flex items-start'>
          {date}
          {/* {new Date().toLocaleDateString()} */}

          {/* {new Date(commit.date).toLocaleDateString()} */}
        </span>
      </div>
    </div>
  );
};

export default TodaysSummary;
// // working on getting this is today summary to the left

// //<button className='btn bg-[#44905e] '></button>
