import React from 'react';

// Individual commit display component with props for commit data and selected repo
const CommitItem = ({ commit, selectedRepo }) => {
  // Format commit date to readable local format
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return (
      date.toLocaleDateString() +
      ' ' +
      date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    );
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

  // Return emoji icon based on commit message keywords
  const getCommitIcon = (message) => {
    const lowerMessage = message.toLowerCase();
    if (lowerMessage.includes('feat') || lowerMessage.includes('feature'))
      return '✨';
    if (lowerMessage.includes('fix') || lowerMessage.includes('bug'))
      return '🐛';
    if (lowerMessage.includes('docs')) return '📚';
    if (lowerMessage.includes('style')) return '💎';
    if (lowerMessage.includes('refactor')) return '🔧';
    if (lowerMessage.includes('test')) return '🧪';
    return '📝'; // Default icon for unmatched commit types
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

  // Placeholder render - actual commit item UI to be implemented
  return (
    <div>
     
        <div className='relative flex flex-row  items-center rounded-lg text-[#5b56dd] bg-[#272633] shadow-[-4px_0_0_0px] p-3 gap-3'>
        {/* calls function to find commit color and type of commit message */}
         <button
          
            className={`btn ${getCommitTypeColor(
              commit.message
            )} text-white px-3 py-1 rounded flex items-center gap-2 min-w-fit text-xs font-medium`}
          >
    
            <span>{getCommitType(commit.message)}</span>
          </button>
          

          
          <div ClassName='flex items-center gap-3 flex-1'>
            {/* leading-tight make the spacing between lines tighter*/}
            <h1 className='text-white text-md leading-tight'>
              
              {truncateMessage(commit.message)}
            </h1>
{/* not sure but in other to align to commit message had to add p-2 instead of p-1 */}
            <p className='text-grey-400 text-sm mt-1 '>{commit.author.name}</p>
          </div>

          <span className=' flex-1absolute top-2 right-2 text-xs text-gray-500'>
            {formatDate(commit.author.date)}
          </span>
        </div>
      </div>
   
  );
};

export default CommitItem;
