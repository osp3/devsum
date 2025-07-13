import React from 'react';
import CommitItem from './CommitItem.jsx';

const RecentCommits = ({ commits, loading, error, selectedRepo }) => {
  if (loading) {
    return (
      <div className='w-full max-w-4xl'>
        <h2 className='text-white text-xl mb-4'>📝 Recent Commits</h2>
        <div className='flex justify-center items-center h-32'>
          <div className='text-gray-300'>Loading commits...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className='w-full max-w-4xl'>
        <h2 className='text-white text-xl mb-4'>📝 Recent Commits</h2>
        <div className='flex justify-center items-center h-32'>
          <div className='text-red-400'>Error: {error}</div>
        </div>
      </div>
    );
  }

  if (!commits || commits.length === 0) {
    return (
      <div className='w-full max-w-4xl'>
        <h2 className='text-white text-xl mb-4'>📝 Recent Commits</h2>
        <div className='flex justify-center items-center h-32'>
          <div className='text-gray-300'>No commits found for this repository</div>
        </div>
      </div>
    );
  }

  return (
    <div className='w-full max-w-4xl'>
      <h2 className='text-white text-xl mb-4'>
        📝 Recent Commits ({commits.length})
      </h2>
      
      <div className='space-y-3'>
        {commits.map((commit) => (
          <CommitItem 
            key={commit.sha} 
            commit={commit} 
            selectedRepo={selectedRepo}
          />
        ))}
      </div>
    </div>
  );
};

export default RecentCommits;
