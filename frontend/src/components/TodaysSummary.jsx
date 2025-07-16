import React from 'react';

const TodaysSummary = ({ yesterdaySummary, summaryLoading, summaryError }) => {
  if (summaryLoading) return <div className='p-4 text-white'>Loading...</div>;
  if (summaryError)
    return <div className='p-4 text-red-400'>Error: {summaryError}</div>;
  if (!yesterdaySummary)
    return <div className='p-4 text-gray-400'>No summary available</div>;

  return (
   <div className='p-2'>
      <div className='flex justify-items-start font-bold text-white'>
       Summary
      </div>
      {/* add a height of 90  to the scroll bar with a padding od 2*/}
      <div className='max-h-130  overflow-y-auto pr-2'>
        <div className='flex flex-col justify-between items-center rounded-lg  text-sm text-[#5b56dd] bg-[#272633] shadow-[-4px_0_0_0px] m-3'>
          {/* <button className='btn bg-[#44905e] text-white px-3 py-1 rounded'>
            {yesterdaySummary.repositoryCount} repos
          </button> */}

          
          <h1 className='flex-1 p-2 text-white'>{yesterdaySummary.summary}</h1>
         
        </div>

        <div className='max-h-160 overflow-y-auto pr-2'>
          {yesterdaySummary.formattedCommits?.byRepository && 
           Object.entries(yesterdaySummary.formattedCommits.byRepository).map(([repoName, commits]) => (
            <div key={repoName} className='mb-4'>
              {/* Repository Header */}
              <div className='bg-[#1e1d2b] rounded-lg p-3 mb-2'>
                <div className='flex items-center justify-between'>
                  <h2 className='text-white font-semibold text-lg'>{repoName}</h2>
                  
                </div>
              </div>
              
              {/* Commits for this repository */}
              <div className=' relative flex flex-col item center ml-4 space-y-2'>
                {commits.map((commit, index) => (
                  <div key={commit.sha || index} className='bg-[#272633] rounded-lg p-3 border-l-4 border-[#5b56dd]'>
                    <div className='flex items-center gap-2 text-xs text-gray-400'>
                      <h3>{commit.description}</h3>
                      
                      
                      <span className = 'flex-1absolute top-2 right-2 text-xs text-gray-500'>{new Date(commit.date).toLocaleString()}</span>
                      
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TodaysSummary;
