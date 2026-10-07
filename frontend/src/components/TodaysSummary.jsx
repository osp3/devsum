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
        <p className='eyebrow mb-4'>Summary</p>
        <LoadingProgressIndicator
          message={currentMessage}
          size='medium'
          showSpinner={true}
          showProgressBar={true}
          progress={currentProgress}
        />
        {/* Show additional progress info for real tracking */}
        {jobId && realMessage && (
          <div className='text-center text-xs text-fg/60 mt-2'>
            {realMessage}
          </div>
        )}
        {progressError && (
          <div className='text-center text-xs text-node-red mt-2'>
            Progress Error: {progressError}
          </div>
        )}
      </div>
    );
  }

  if (summaryError)
    return <div className='p-4 text-node-red'>Error: {summaryError}</div>;
  if (!yesterdaySummary)
    return <div className='p-4 text-fg/60'>No summary available</div>;

  return (
    <div className='p-2'>
      <p className='eyebrow'>Summary</p>
      {/* add a height of 90  to the scroll bar with a padding od 2*/}
      <div className='max-h-130  overflow-y-auto pr-2'>
        <p className='my-3 text-[15px] leading-7 text-fg/85'>{yesterdaySummary.summary}</p>

        <div className='max-h-160 overflow-y-auto pr-2'>
          {yesterdaySummary.pullRequests?.length > 0 && (
            <div className='mb-4'>
              <h2 className='mb-2 border-b border-line pb-2 font-semibold tracking-tight'>
                Pull requests
              </h2>
              <ul className='flex flex-col space-y-2'>
                {yesterdaySummary.pullRequests.map((pr) => (
                  <li
                    key={pr.url}
                    className='flex justify-between gap-2 rounded-lg border border-line bg-inset p-3 text-sm text-fg/70'
                  >
                    <a
                      href={pr.url}
                      target='_blank'
                      rel='noreferrer'
                      className='min-w-0 hover:text-fg'
                    >
                      <span className='font-geist-mono text-xs text-steam'>{pr.repository}#{pr.number}</span> {pr.title}
                    </a>
                    <span className='font-geist-mono text-xs capitalize text-fg/50 whitespace-nowrap'>
                      {pr.action}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {yesterdaySummary.formattedCommits?.byRepository &&
            Object.entries(yesterdaySummary.formattedCommits.byRepository).map(
              ([repoName, commits]) => (
                <div key={repoName} className='mb-4'>
                  {/* Repository Header */}
                  <h2 className='mb-2 border-b border-line pb-2 font-semibold tracking-tight'>
                    {repoName}
                  </h2>

                  {/* Commits for this repository */}
                  <div className='flex justify-between flex-col space-y-2'>
                    {commits.map((commit, index) => (
                      <div
                        key={commit.sha || index}
                        className='rounded-lg border border-line bg-inset p-3'
                      >
                        <div className='flex justify-between flex-row gap-2 text-sm text-fg/70'>
                          <h3>{commit.description}</h3>
                          <span className='font-geist-mono text-xs text-fg/50 whitespace-nowrap'>
                            {new Date(commit.date).toLocaleString('en-US', {
                              month: '2-digit',
                              day: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                              hour12: true,
                            })}
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
