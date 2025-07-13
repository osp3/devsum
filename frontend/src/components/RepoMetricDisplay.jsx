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

  if (loading) {
    return (
      <div className='w-full max-w-4xl'>
        <h2 className='text-white text-xl mb-4'>📊 Repository Metrics</h2>
        <div className='flex justify-center items-center h-32'>
          <div className='text-gray-300'>Loading metrics...</div>
        </div>
      </div>
    );
  }

  return (
    <div className='w-full max-w-4xl'>
      <h2 className='text-white text-xl mb-4'>📊 Repository Metrics</h2>
      
      {/* First Row - Basic Stats */}
      <div className='grid grid-cols-2 md:grid-cols-4 gap-4 mb-4'>
        <div className='bg-[#272633] border border-slate-600 rounded-lg p-4 text-center'>
          <div className='text-2xl font-bold text-blue-400'>{metrics.totalCommits}</div>
          <div className='text-sm text-gray-300'>Total Commits</div>
        </div>
        
        <div className='bg-[#272633] border border-slate-600 rounded-lg p-4 text-center'>
          <div className='text-2xl font-bold text-green-400'>{metrics.features}</div>
          <div className='text-sm text-gray-300'>✨ Features</div>
        </div>
        
        <div className='bg-[#272633] border border-slate-600 rounded-lg p-4 text-center'>
          <div className='text-2xl font-bold text-red-400'>{metrics.bugFixes}</div>
          <div className='text-sm text-gray-300'>🐛 Bug Fixes</div>
        </div>
        
        <div className='bg-[#272633] border border-slate-600 rounded-lg p-4 text-center'>
          <div className='text-2xl font-bold text-purple-400'>{metrics.uniqueAuthors}</div>
          <div className='text-sm text-gray-300'>👥 Contributors</div>
        </div>
      </div>

      {/* Second Row - Additional Stats */}
      <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
        <div className='bg-[#272633] border border-slate-600 rounded-lg p-4 text-center'>
          <div className='text-2xl font-bold text-yellow-400'>{metrics.refactors}</div>
          <div className='text-sm text-gray-300'>🔧 Refactors</div>
        </div>
        
        <div className='bg-[#272633] border border-slate-600 rounded-lg p-4 text-center'>
          <div className='text-2xl font-bold text-blue-400'>{metrics.docs}</div>
          <div className='text-sm text-gray-300'>📚 Docs</div>
        </div>
        
        <div className='bg-[#272633] border border-slate-600 rounded-lg p-4 text-center'>
          <div className='text-2xl font-bold text-green-400'>+{metrics.totalAdditions}</div>
          <div className='text-sm text-gray-300'>Lines Added</div>
        </div>
        
        <div className='bg-[#272633] border border-slate-600 rounded-lg p-4 text-center'>
          <div className='text-2xl font-bold text-red-400'>-{metrics.totalDeletions}</div>
          <div className='text-sm text-gray-300'>Lines Removed</div>
        </div>
      </div>

      {/* Repository Info */}
      {selectedRepo && (
        <div className='mt-4 bg-[#272633] border border-slate-600 rounded-lg p-4'>
          <div className='text-gray-300 text-sm'>
            <strong>Repository:</strong> {selectedRepo.fullName} | 
            <strong> Language:</strong> {selectedRepo.language || 'Not specified'} | 
            <strong> Last Updated:</strong> {new Date(selectedRepo.updatedAt).toLocaleDateString()}
          </div>
        </div>
      )}
    </div>
  );
};

export default RepoMetricDisplay;
