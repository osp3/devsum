import React from 'react';

// Component to display repository metrics calculated from commit data
const RepoMetricDisplay = ({
  selectedRepo,
  commits,
  loading,
  yesterdaySummary,
}) => {
  // Calculate various metrics from commits array
  const calculateMetrics = () => {
    // Return default metrics when no commits available
    if (!commits || commits.length === 0) {
      return {
        totalCommits: 0,
        features: 0,
        bugFixes: 0,
        docs: 0,
        refactors: 0,
        test: 0,
        totalAdditions: 0,
        totalDeletions: 0,
        uniqueAuthors: 0,
      };
    }

    // Initialize metrics object with commit count
    const metrics = {
      totalCommits: commits.length,
      features: 0,
      bugFixes: 0,
      docs: 0,
      refactors: 0,
      test: 0,
      totalAdditions: 0,
      totalDeletions: 0,
      uniqueAuthors: 0,
    };

    // Track unique commit authors
    const authors = new Set();

    // Process each commit to extract metrics
    commits.forEach((commit) => {
      const message = commit.message.toLowerCase();

      // Count commit types based on message keywords
      if (message.includes('feat') || message.includes('feature'))
        metrics.features++;
      if (message.includes('fix') || message.includes('bug'))
        metrics.bugFixes++;
      if (message.includes('docs')) metrics.docs++;
      if (message.includes('refactor')) metrics.refactors++;
      if (message.includes('test')) metrics.refactors++;

      // Aggregate code change statistics
      if (commit.stats) {
        metrics.totalAdditions += commit.stats.additions || 0;
        metrics.totalDeletions += commit.stats.deletions || 0;
      }

      // Track unique author names
      if (commit.author && commit.author.name) {
        authors.add(commit.author.name);
      }
    });

    // Set final unique author count
    metrics.uniqueAuthors = authors.size;
    return metrics;
  };

  // Get calculated metrics for display
  const metrics = calculateMetrics();

  // metric cards with values for display

  const metricCard = [
    {
      key: 'totalCommits',
      label: 'Total Commits',
      value: metrics.totalCommits,
      color: 'text-white',
      show: 'true',
    },
    {
      key: 'feature',
      label: 'Feature',
      value: metrics.features,
      show: metrics.features > 0,
    },
    {
      key: 'bugFixes',
      label: 'BugFixes',
      value: metrics.bugFixes,
      show: metrics.bugFixes > 0,
    },
    {
      key: 'docs',
      label: 'Docs',
      value: metrics.docs,
      show: metrics.docs > 0,
    },
    {
      key: ' refactors',
      label: 'Refactors',
      value: metrics.refactors,
      show: metrics.refactors > 0,
    },
    {
      key: 'test',
      label: 'Test',
      value: metrics.test,
      show: metrics.test > 0,
    },
  ];
// filters metric card to be showed in return
  const visibleCards = metricCard.filter((card) => card.show);

  // Render metrics cards in horizontal layout
  return (
    //maps over visible cards array to create component for each metric. it will show only metric cards that contain value > 
    <div className='flex flex-row gap-4 p-4 flex-wrap'>
      {visibleCards.map((card) => (
        <div
          key={card.key}
          className='flex-1 min-w-32 flex flex-col items-center justify-center border border-slate-400 rounded-lg p-4 bg-[#272633]'
        >
          <h1 className={`text-1xl font-bold ${card.color} mb-2`}>
            {card.value}
          </h1>
          <h2 className='text-sm text-gray-400 text-center'>{card.label}</h2>
        </div>
      ))}
    </div>
  );
};

export default RepoMetricDisplay;

// I need to bring from app js yesterday summary
