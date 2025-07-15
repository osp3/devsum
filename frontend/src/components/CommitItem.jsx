import React from 'react';

// Individual commit display component with props for commit data and AI suggested message
const CommitItem = ({ commit, suggestedCommitMessage }) => {
  // Format commit date to readable local format
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return (
      date.toLocaleDateString() +
      ' ' +
      date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    );
  };

  // Determine which message to display - AI suggested or raw commit message
  const getDisplayMessage = () => {
    return suggestedCommitMessage || commit.message;
  };

  // Return Tailwind background color class based on commit type
  const getCommitTypeColor = (message) => {
    const lowerMessage = message.toLowerCase();
    if (lowerMessage.includes('feat') || lowerMessage.includes('feature'))
      return 'bg-green-500';
    if (lowerMessage.includes('fix') || lowerMessage.includes('bug'))
      return 'bg-red-500';
    if (lowerMessage.includes('docs')) return 'bg-blue-500';
    if (lowerMessage.includes('style')) return 'bg-purple-500';
    if (lowerMessage.includes('refactor')) return 'bg-yellow-500';
    if (lowerMessage.includes('test')) return 'bg-pink-500';
    return 'bg-gray-500'; // Default color for unmatched commit types
  };

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
    if (lowerMessage.includes('merge')) return 'merge';
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
      <div className='relative flex flex-row items-center rounded-lg text-[#5b56dd] bg-[#272633] shadow-[-4px_0_0_0px] p-3 gap-3'>
        {/* calls function to find commit color and type of commit message */}
        <button
          className={`btn ${getCommitTypeColor(
            displayMessage
          )} text-white px-3 py-1 rounded flex items-center gap-2 min-w-fit text-xs font-medium`}
        >
          <span>{getCommitType(displayMessage)}</span>
        </button>
        
        <div className='flex items-center gap-3 flex-1'>
          {/* leading-tight make the spacing between lines tighter*/}
          <div className='flex-1'>
            <h1 className='text-white text-md leading-tight'>
              {truncateMessage(displayMessage)}
            </h1>
            {/* Show indicator if AI suggested message is being displayed */}
            {suggestedCommitMessage && (
              <div className='flex items-center gap-2 mt-1'>
                <span className='text-xs text-gray-500'>
                  Original: {truncateMessage(commit.message, 500)}
                </span>
              </div>
            )}
            {/* Author name */}
            <p className='text-grey-400 text-sm mt-1'>{commit.author.name}</p>
          </div>
        </div>

        <span className='flex-1absolute top-2 right-2 text-xs text-gray-500'>
          {formatDate(commit.author.date)}
        </span>
      </div>
    </div>
  );
};

export default CommitItem;
