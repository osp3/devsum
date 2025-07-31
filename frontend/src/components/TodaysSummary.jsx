import React, { useState, useEffect } from 'react';
import LoadingProgressIndicator from './LoadingProgressIndicator.jsx';
import { useProgressTracking } from '../hooks/useProgressTracking.js';

const TodaysSummary = ({
  yesterdaySummary,
  summaryLoading,
  summaryError,
  jobId = null,
}) => {
  const [loadingProgress, setLoadingProgress] = useState(0);

  // Real progress tracking (when jobId is provided)
  const {
    progress: realProgress,
    message: realMessage,
    error: progressError,
  } = useProgressTracking(jobId, 1000, !!jobId && summaryLoading);

  // Simulate progress when loading starts (fallback when no jobId)
  useEffect(() => {
    if (summaryLoading && !jobId) {
      setLoadingProgress(0);
      const interval = setInterval(() => {
        setLoadingProgress((prev) => {
          if (prev >= 95) {
            clearInterval(interval);
            return 95; // Stop at 95% until actual completion
          }
          // Simulate realistic progress curve (faster at start, slower near end)
          const increment = prev < 30 ? 8 : prev < 70 ? 4 : 2;
          return Math.min(95, prev + increment);
        });
      }, 800); // Update every 800ms

      return () => clearInterval(interval);
    } else {
      setLoadingProgress(100); // Complete when loading finishes
    }
  }, [summaryLoading, jobId]);

  if (summaryLoading) {
    // Use real progress if available, otherwise fall back to simulated
    const currentProgress = jobId ? realProgress : loadingProgress;
    const currentMessage =
      jobId && realMessage ? realMessage : 'Generating summary...';

    return (
      <div className='p-2'>
        <div className='flex justify-items-start font-bold text-white mb-4'>
          Summary
        </div>
        <LoadingProgressIndicator
          message={currentMessage}
          size='medium'
          showSpinner={true}
          showProgressBar={true}
          progress={currentProgress}
        />
        {/* Show additional progress info for real tracking */}
        {jobId && realMessage && (
          <div className='text-center text-xs text-gray-400 mt-2'>
            {realMessage}
          </div>
        )}
        {progressError && (
          <div className='text-center text-xs text-red-400 mt-2'>
            Progress Error: {progressError}
          </div>
        )}
      </div>
    );
  }

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
        <div className='flex flex-col justify-between items-center rounded-lg  text-sm text-[#5b56dd] bg-[#272633] shadow-[-2px_0_0_0px] m-3'>
          {/* <button className='btn bg-[#44905e] text-white px-3 py-1 rounded'>
            {yesterdaySummary.repositoryCount} repos
          </button> */}

          <h1 className='flex-1 p-2 text-white'>{yesterdaySummary.summary}</h1>
        </div>

        <div className='max-h-160 overflow-y-auto pr-2'>
          {yesterdaySummary.formattedCommits?.byRepository &&
            Object.entries(yesterdaySummary.formattedCommits.byRepository).map(
              ([repoName, commits]) => (
                <div key={repoName} className='mb-4'>
                  {/* Repository Header */}
                  <div className='bg-[#1e1d2b] rounded-lg p-3 mb-2'>
                    <div className='flex items-center justify-between'>
                      <h2 className='text-white font-semibold text-lg'>
                        {repoName}
                      </h2>
                    </div>
                  </div>

                  {/* Commits for this repository */}
                  <div className='flex justify-between flex-col ml-4 space-y-2'>
                    {commits.map((commit, index) => (
                      <div
                        key={commit.sha || index}
                        className='bg-[#272633] rounded-lg p-3 border-l-2 border-[#5b56dd]'
                      >
                        <div className=' flex justify-between  flex-row gap-2 text-xs text-gray-400'>
                          <h3>{commit.description}</h3>
                          <span className='text-xs text-gray-500 whitespace-nowrap'>
                            {new Date(commit.date).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            )}
        </div>
      </div>
    </div>
  );
};

export default TodaysSummary;
