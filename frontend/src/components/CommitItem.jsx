import React from 'react';

const CommitItem = ({ commit, selectedRepo }) => {
  // Format commit date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Get commit type color based on message
  const getCommitTypeColor = (message) => {
    const lowerMessage = message.toLowerCase();
    if (lowerMessage.includes('feat') || lowerMessage.includes('feature')) return 'bg-green-500';
    if (lowerMessage.includes('fix') || lowerMessage.includes('bug')) return 'bg-red-500';
    if (lowerMessage.includes('docs')) return 'bg-blue-500';
    if (lowerMessage.includes('style')) return 'bg-purple-500';
    if (lowerMessage.includes('refactor')) return 'bg-yellow-500';
    if (lowerMessage.includes('test')) return 'bg-pink-500';
    return 'bg-gray-500';
  };

  // Get commit type icon
  const getCommitIcon = (message) => {
    const lowerMessage = message.toLowerCase();
    if (lowerMessage.includes('feat') || lowerMessage.includes('feature')) return '✨';
    if (lowerMessage.includes('fix') || lowerMessage.includes('bug')) return '🐛';
    if (lowerMessage.includes('docs')) return '📚';
    if (lowerMessage.includes('style')) return '💎';
    if (lowerMessage.includes('refactor')) return '🔧';
    if (lowerMessage.includes('test')) return '🧪';
    return '📝';
  };

  // Truncate long commit messages
  const truncateMessage = (message, maxLength = 80) => {
    if (message.length <= maxLength) return message;
    return message.substring(0, maxLength) + '...';
  };

  return (
    <div className='bg-[#272633] border border-slate-600 rounded-lg p-4 hover:border-slate-500 transition-colors'>
      <div className='flex items-start gap-3'>
        {/* Commit Type Indicator */}
        <div className={`${getCommitTypeColor(commit.message)} w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0`}>
          {getCommitIcon(commit.message)}
        </div>
        
        {/* Commit Details */}
        <div className='flex-1 min-w-0'>
          {/* Commit Message */}
          <div className='text-white font-medium mb-1'>
            {truncateMessage(commit.message)}
          </div>
          
          {/* Commit Metadata */}
          <div className='flex flex-wrap gap-4 text-sm text-gray-400'>
            <span>
              👤 {commit.author.name}
            </span>
            <span>
              📅 {formatDate(commit.author.date)}
            </span>
            <span>
              🔗 {commit.sha}
            </span>
            {commit.stats && (
              <span>
                <span className='text-green-400'>+{commit.stats.additions}</span>
                {' '}
                <span className='text-red-400'>-{commit.stats.deletions}</span>
              </span>
            )}
          </div>
        </div>
        
        {/* View Button */}
        <div className='flex-shrink-0'>
          <a
            href={commit.url}
            target='_blank'
            rel='noopener noreferrer'
            className='px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors'
          >
            View
          </a>
        </div>
      </div>
    </div>
  );
};

export default CommitItem;
