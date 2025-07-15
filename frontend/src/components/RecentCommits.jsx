import React from 'react';
import CommitItem from './CommitItem.jsx';

// Component to display list of recent commits with loading/error states
const RecentCommits = ({ commits, loading, error, qualityAnalysis, repositoryId }) => {
  // Show loading spinner while fetching commits
  if (loading) {
    return (
      <div className="w-full max-w-4xl">
        <h2 className="text-white text-xl mb-4">Recent Commits</h2>
        <div className="flex justify-center items-center h-32">
          <div className="text-gray-300">Loading commits...</div>
        </div>
      </div>
    );
  }

  // Display error message if commit fetch failed
  if (error) {
    return (
      <div className="w-full max-w-4xl">
        <h2 className="text-white text-xl mb-4">Recent Commits</h2>
        <div className="flex justify-center items-center h-32">
          <div className="text-red-400">Error: {error}</div>
        </div>
      </div>
    );
  }

  // Show empty state when no commits are available
  if (!commits || commits.length === 0) {
    return (
      <div className="w-full max-w-4xl">
        <h2 className="text-white text-xl mb-4">Recent Commits</h2>
        <div className="flex justify-center items-center h-32">
          <div className="text-gray-300">
            No commits found for this repository
          </div>
        </div>
      </div>
    );
  }

  // Determine if quality analysis is available - check for actual properties from backend
  const hasQualityAnalysis = qualityAnalysis && (
    qualityAnalysis.qualityScore !== undefined || 
    qualityAnalysis.issues || 
    qualityAnalysis.insights
  );

  // Check if individual commit analysis (codeAnalysis.insights) is available
  const hasIndividualCommitAnalysis = qualityAnalysis && 
    qualityAnalysis.codeAnalysis && 
    qualityAnalysis.codeAnalysis.insights && 
    qualityAnalysis.codeAnalysis.insights.length > 0;

  console.log('📊 Quality analysis status:', {
    hasQualityAnalysis,
    hasIndividualCommitAnalysis,
    totalInsights: qualityAnalysis?.codeAnalysis?.insights?.length || 0
  });

  // Render commits list
  return (
    <div className='w-full max-w-4xl'>
      <h2 className='text-white text-xl mb-4'>
        Recent Commits ({commits.length})
        {hasQualityAnalysis && (
          <span className='text-sm text-green-400 ml-2'>
            📊 Analysis Available
          </span>
        )}
      </h2>
      
      {/* Map through commits and render individual CommitItem components */}
      <div className='space-y-3'>
        {commits.map((commit) => (
          <CommitItem 
            key={commit.sha} 
            commit={commit} 
            suggestedCommitMessage={commit.suggestedMessage}
            hasQualityAnalysis={hasIndividualCommitAnalysis} // Only show if individual analysis available
            qualityAnalysis={qualityAnalysis} // Pass the actual analysis data
            repositoryId={repositoryId}
          />
        ))}
      </div>
    </div>
  );
};

export default RecentCommits;


//- took out commit items don't think its we need it
 
//flex-3  border border-slate-400 rounded-2xl w-150 h-120 p-4


//  <div>
//       <h1>RECENT COMMITS</h1>
      
//       <CommitItem />

      
//     </div>