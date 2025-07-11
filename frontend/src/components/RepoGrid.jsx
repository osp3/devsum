import React from 'react';
import RepoCard from './RepoCard';

const RepoGrid = ({ repositories, selectedRepo, onRepoSelect }) => {
  return (
    <div>
      {/* Header with repository count */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-white">
          Repositories ({repositories.length})
        </h2>
      </div>

      {/* Grid layout for repository cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {repositories.map((repo) => (
          <RepoCard 
            key={repo.id} 
            repository={repo}
            isSelected={selectedRepo?.id === repo.id}
            onSelect={() => onRepoSelect(repo)}
          />
        ))}
      </div>
    </div>
  );
};

export default RepoGrid;
