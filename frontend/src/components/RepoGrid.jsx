import React from 'react';
import RepoCard from './RepoCard';

const RepoGrid = ({ repositories }) => {
  return (
    <div>
      <h2>Repositories ({repositories.length})</h2>
      {repositories.map((repo) => (
        <RepoCard key={repo.id} repository={repo} />
      ))}
    </div>
  );
};

export default RepoGrid;
