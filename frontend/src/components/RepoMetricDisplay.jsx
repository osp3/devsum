import React from 'react';

const RepoMetricDisplay = ({ selectedRepo, commits, loading }) => {
  // Calculate metrics from commits
  const calculateMetrics = () => {
    if (!commits || commits.length === 0) {
      return {
        totalCommits: 0,
        features: 0,
        bugFixes: 0,
        docs: 0,
        refactors: 0,
        totalAdditions: 0,
        totalDeletions: 0,
        uniqueAuthors: 0
      };
    }

    const metrics = {
      totalCommits: commits.length,
      features: 0,
      bugFixes: 0,
      docs: 0,
      refactors: 0,
      totalAdditions: 0,
      totalDeletions: 0,
      uniqueAuthors: 0
    };

    const authors = new Set();

    commits.forEach(commit => {
      const message = commit.message.toLowerCase();
      
      // Count commit types
      if (message.includes('feat') || message.includes('feature')) metrics.features++;
      if (message.includes('fix') || message.includes('bug')) metrics.bugFixes++;
      if (message.includes('docs')) metrics.docs++;
      if (message.includes('refactor')) metrics.refactors++;
      
      // Count stats
      if (commit.stats) {
        metrics.totalAdditions += commit.stats.additions || 0;
        metrics.totalDeletions += commit.stats.deletions || 0;
      }
      
      // Count unique authors
      if (commit.author && commit.author.name) {
        authors.add(commit.author.name);
      }
    });

    metrics.uniqueAuthors = authors.size;
    return metrics;
  };

  const metrics = calculateMetrics();



  return (
    <div className='flex flex-row '>
      <div className='flex-1 min-w-30 flex-item-center border border-slate-400 rounded-lg m-4 '>
        <h1 className='flex justify-center m-2'>6</h1>
        <h1 className='flex justify-center m-2'>Total commits </h1>
      </div>
      <div className='flex-1 min-w-30 flex-item-center border border-slate-400   rounded-lg m-4 '>
        <h1 className='flex justify-center m-2'>6</h1>
        <h1 className='flex justify-center m-2'>Feature</h1>
      </div>
    </div>
  );
};

export default RepoMetricDisplay;

{
  /* //working on centering everything in individual boxes


//flex1 makes each div take equal spaces , min-w-5 set a min with to the box
 */
}


