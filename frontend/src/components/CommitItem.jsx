import React from 'react';
import { useNavigate } from 'react-router-dom';

// Individual commit display component with props for commit data and AI suggested message
const CommitItem = ({
  commit,
  suggestedCommitMessage,
  hasQualityAnalysis,
  qualityAnalysis,
  repositoryId,
}) => {
  const navigate = useNavigate();

  // Format commit date to readable local format
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  // Handle view analysis button click
  const handleViewAnalysis = () => {
    console.log('🔍 CommitItem handleViewAnalysis triggered');
    console.log('🔍 hasQualityAnalysis:', hasQualityAnalysis);
    console.log('🔍 repositoryId:', repositoryId);
    console.log('🔍 qualityAnalysis:', qualityAnalysis);
    console.log('🔍 commit.sha:', commit.sha);

    if (hasQualityAnalysis && repositoryId && qualityAnalysis) {
      console.log('🔍 Navigating with state:', {
        qualityAnalysis: qualityAnalysis,
        repositoryId: repositoryId,
        commitSha: commit.sha,
      });

      // Pass the quality analysis data through navigation state to avoid re-fetching
      navigate(`/commit-analysis?repo=${repositoryId}&commit=${commit.sha}`, {
        state: {
          qualityAnalysis: qualityAnalysis, // Pass the actual analysis data
          repositoryId: repositoryId,
          commitSha: commit.sha,
        },
      });
    } else {
      console.error('🔍 Cannot navigate - missing data:', {
        hasQualityAnalysis,
        repositoryId,
        hasQualityAnalysisData: !!qualityAnalysis,
      });
    }
  };

  // Determine which message to display - AI suggested or raw commit message
  const getDisplayMessage = () => {
    return suggestedCommitMessage || commit.message;
  };

  // Return Tailwind color classes based on commit type
  const getCommitTypeColor = (message) => {
    const lowerMessage = message.toLowerCase();
    if (lowerMessage.includes('feat') || lowerMessage.includes('feature'))
      return 'text-node-blue border-node-blue/40';
    if (lowerMessage.includes('fix') || lowerMessage.includes('bug'))
      return 'text-node-red border-node-red/30';
    if (lowerMessage.includes('docs')) return 'text-steam border-steam/30';
    if (lowerMessage.includes('style')) return 'text-dough border-dough/30';
    if (lowerMessage.includes('refactor')) return 'text-node-yellow border-node-yellow/40';
    if (lowerMessage.includes('test')) return 'text-dough border-dough/30';
    return 'text-fg/60 border-line'; // Default color for unmatched commit types
  };

  // Return emoji icon based on commit message keywords will no be using icons
  // const getCommitIcon = (message) => {
  //   const lowerMessage = message.toLowerCase();
  //   if (lowerMessage.includes('feat') || lowerMessage.includes('feature'))
  //     return '✨';
  //   if (lowerMessage.includes('fix') || lowerMessage.includes('bug'))
  //     return '🐛';
  //   if (lowerMessage.includes('docs')) return '📚';
  //   if (lowerMessage.includes('style')) return '💎';
  //   if (lowerMessage.includes('refactor')) return '🔧';
  //   if (lowerMessage.includes('test')) return '🧪';
  //   return '📝'; // Default icon for unmatched commit types
  // };

  // Get commit type label
  const getCommitType = (message) => {
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('feat') || lowerMessage.includes('feature'))
      return 'feat';
    if (lowerMessage.includes('fix') || lowerMessage.includes('bug'))
      return 'fix';
    if (lowerMessage.includes('docs')) return 'docs';
    if (lowerMessage.includes('style')) return 'style';
    if (lowerMessage.includes('refactor')) return 'refactor';
    if (lowerMessage.includes('test')) return 'test';
    //if (lowerMessage.includes('merge')) return 'merge';
    if (lowerMessage.includes('cache') || lowerMessage.includes('caching'))
      return 'cache';
    if (lowerMessage.includes('summary')) return 'summary';
    return 'commit';
  };

  // Shorten commit messages that exceed maximum length
  const truncateMessage = (message, maxLength = 300) => {
    if (message.length <= maxLength) return message;
    return message.substring(0, maxLength) + '...';
  };

  // Get the message to display (AI suggested or raw)
  const displayMessage = getDisplayMessage();

  // Render commit item UI
  return (
    <div>
      <div className='relative flex flex-row items-center rounded-lg border border-line bg-inset p-3 pt-7 gap-3'>
        {/* calls function to find commit color and type of commit message */}
        <span
          className={`w-16 shrink-0 rounded border py-0.5 text-center font-geist-mono text-[11px] uppercase ${getCommitTypeColor(
            displayMessage
          )}`}
        >
          {getCommitType(displayMessage)}
        </span>

        <div className='flex items-center gap-3 flex-1 min-w-0'>
          {/* leading-tight make the spacing between lines tighter*/}
          <div className='flex-1 min-w-0'>
            <h1 className='text-sm leading-snug break-words'>
              {truncateMessage(displayMessage)}
            </h1>
            {/* Show indicator if AI suggested message is being displayed */}
            {suggestedCommitMessage && (
              <div className='flex items-center gap-2 mt-1'>
                <span className='font-geist-mono text-xs text-fg/50 break-words'>
                  Original: {truncateMessage(commit.message, 500)}
                </span>
              </div>
            )}
            {/* Author name */}
            <p className='text-fg/60 text-xs mt-1'>{commit.author.name}</p>
          </div>
        </div>

        {/* View Analysis button - only shown when quality analysis is available */}
        {hasQualityAnalysis && (
          <button
            onClick={handleViewAnalysis}
            className='btn-secondary shrink-0 border px-3 py-1 text-xs cursor-pointer'
            title={`View detailed analysis for commit ${commit.sha.substring(
              0,
              7
            )}`}
          >
            View Analysis
          </button>
        )}

        <span className='absolute top-2 right-3 font-geist-mono text-[11px] text-fg/50'>
          {formatDate(commit.author.date)}
        </span>
      </div>
    </div>
  );
};

export default CommitItem;
