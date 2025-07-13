import React from 'react';

const RepoHeader = ({ selectedRepo }) => {
  if (!selectedRepo) {
    return (
      <div className='flex flex-col'>
        <div className='border border-slate-400 rounded-2xl p-4 m-6 max-w-6xl mx-auto'>
          <h1 className='text-white text-xl'>No repository selected</h1>
        </div>
      </div>
    );
  }

  return (
    <div className='flex flex-col'>
      {/* Repository Info Section */}
      <div className='border border-slate-400 rounded-2xl p-4 m-6 max-w-6xl mx-auto'>
        <div className='flex flex-col gap-2'>
          <h1 className='text-white text-2xl font-bold'>{selectedRepo.name}</h1>
          <p className='text-gray-300'>{selectedRepo.fullName}</p>
          {selectedRepo.description && (
            <p className='text-gray-400 text-sm'>{selectedRepo.description}</p>
          )}
          
          <div className='flex gap-4 mt-2'>
            <span className='text-sm text-gray-500'>
              Language: {selectedRepo.language || 'Not specified'}
            </span>
            <span className='text-sm text-gray-500'>
              {selectedRepo.private ? '🔒 Private' : '🌐 Public'}
            </span>
            <span className='text-sm text-gray-500'>
              Updated: {new Date(selectedRepo.updatedAt).toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>

      {/* Analysis Status Section */}
      <div className='border border-slate-400 rounded-2xl p-4 m-6 max-w-6xl mx-auto'>
        <h2 className='text-white text-xl'>
          📊 Analysis for {selectedRepo.name}
        </h2>
        <p className='text-gray-300 mt-2'>
          Viewing commit history and repository analytics
        </p>
      </div>
    </div>
  );
};

export default RepoHeader;
