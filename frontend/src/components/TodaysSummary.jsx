import React from 'react';
import { useState, useEffect } from 'react';

const TodaysSummary = ({ commitData, commitLoading, commitError, fetchDailySummary }) => {
  const [currentDate] = useState(new Date().toISOString().split('T')[0]);

  // If no data yet and not loading, trigger fetch (only happens once per session)
  useEffect(() => {
    if (!commitData && !commitLoading && !commitError) {
      fetchDailySummary();
    }
  }, [commitData, commitLoading, commitError, fetchDailySummary]);

  // Color mapping for commit types
  const commitTypeColors = {
    feat: 'bg-green-500 text-white',
    fix: 'bg-red-500 text-white',
    docs: 'bg-blue-500 text-white',
    style: 'bg-purple-500 text-white',
    refactor: 'bg-yellow-500 text-black',
    test: 'bg-orange-500 text-white',
    chore: 'bg-gray-500 text-white',
    perf: 'bg-pink-500 text-white',
    ci: 'bg-indigo-500 text-white',
    build: 'bg-teal-500 text-white',
    revert: 'bg-red-700 text-white',
  };

  const getTypeColor = (type) => commitTypeColors[type] || 'bg-gray-400 text-white';

  return (
    <div className='p-4 h-full flex flex-col'>
      <div className='flex justify-between items-center mb-4'>
        <h2 className='text-xl font-bold text-white'>Today's Commits</h2>
        <span className='text-sm text-gray-400'>{currentDate}</span>
      </div>

      {commitLoading && (
        <div className='text-center py-4'>
          <div className='text-gray-400'>Loading commits...</div>
        </div>
      )}

      {commitError && (
        <div className='text-center py-4'>
          <div className='text-red-400'>Error: {commitError}</div>
        </div>
      )}

      {commitData && commitData.commitCount === 0 && (
        <div className='text-center py-8'>
          <div className='text-gray-400 text-lg'>No commits found for today</div>
          <div className='text-gray-500 text-sm'>Take a well-deserved break! 🎉</div>
        </div>
      )}

      {commitData && commitData.commitCount > 0 && (
        <div className='flex-1 flex flex-col overflow-hidden'>
          {/* Summary stats */}
          <div className='bg-[#2a2a3e] rounded-lg p-3 mb-4 flex-shrink-0'>
            <div className='text-sm text-gray-300'>
              📊 {commitData.commitCount} commits across {commitData.repositoryCount} repositories
            </div>
          </div>

          {/* Scrollable commits container */}
          <div className='flex-1 overflow-y-auto overflow-x-hidden'>
            {/* Display formatted commits if available */}
            {commitData.formattedCommits && commitData.formattedCommits.byRepository ? (
              /* Commits grouped by repository */
              <div className='space-y-4 pr-2'>
                {Object.entries(commitData.formattedCommits.byRepository).map(([repoName, repoCommits]) => (
                  <div key={repoName} className='mb-6'>
                    <h3 className='text-lg font-semibold text-[#5b56dd] mb-3 flex items-center'>
                      📁 {repoName} <span className='ml-2 text-sm text-gray-400'>({repoCommits.length} commits)</span>
                    </h3>
                    
                    <div className='space-y-2'>
                      {repoCommits.map((commit, index) => (
                        <div key={`${commit.sha}-${index}`} className='bg-[#272633] rounded-lg p-3 border-l-4 border-[#5b56dd]'>
                          <div className='flex items-start space-x-3'>
                            {/* Commit type badge */}
                            <span className={`px-2 py-1 rounded text-xs font-medium ${getTypeColor(commit.type)} flex-shrink-0`}>
                              {commit.type}
                            </span>
                            
                            {/* Commit details */}
                            <div className='flex-1 min-w-0'>
                              <div className='text-white font-medium text-sm truncate'>
                                {commit.formatted}
                              </div>
                              <div className='text-gray-400 text-xs mt-1 flex items-center space-x-4'>
                                <span>#{commit.sha}</span>
                                <span>{commit.author}</span>
                                <span>{new Date(commit.date).toLocaleTimeString('en-US', { 
                                  hour: '2-digit', 
                                  minute: '2-digit' 
                                })}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* Fallback: Display summary text if formatted commits not available */
              <div className='bg-[#272633] rounded-lg p-4'>
                <h3 className='text-lg font-semibold text-[#5b56dd] mb-3'>Daily Summary</h3>
                <pre className='text-gray-300 text-sm whitespace-pre-wrap font-mono overflow-x-auto'>
                  {commitData.summary}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TodaysSummary;
// // working on getting this is today summary to the left

// //<button className='btn bg-[#44905e] '></button>
