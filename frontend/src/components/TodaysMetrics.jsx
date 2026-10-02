import React from 'react';

const TodaysMetrics = ({ yesterdaySummary }) => {
  if (!yesterdaySummary)
    return <div className='p-4 text-fg/60'>No commits available</div>;

  return (
    <div>
      {/* Daily Metrics Header */}
      <p className='eyebrow mb-4 text-center'>Daily metrics</p>

      <div className='flex flex-row gap-4'>
        <div className='flex-1 rounded-lg border border-line bg-inset p-4 text-center'>
          <p className='text-3xl font-semibold tracking-tight'>
            {yesterdaySummary.commitCount}
          </p>
          <p className='mt-1 font-geist-mono text-xs uppercase tracking-[0.14em] text-fg/60'>Commits</p>
        </div>

        <div className='flex-1 rounded-lg border border-line bg-inset p-4 text-center'>
          <p className='text-3xl font-semibold tracking-tight'>
            {yesterdaySummary.repositoryCount}
          </p>
          <p className='mt-1 font-geist-mono text-xs uppercase tracking-[0.14em] text-fg/60'>Repositories</p>
        </div>
      </div>
    </div>
  );
};

export default TodaysMetrics;
