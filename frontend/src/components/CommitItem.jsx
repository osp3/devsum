import React from 'react';

// Individual commit display component with props for commit data and selected repo
const CommitItem = ({ commit, selectedRepo }) => {
  // Format commit date to readable local format
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Return Tailwind background color class based on commit type
  const getCommitTypeColor = (message) => {
    const lowerMessage = message.toLowerCase();
    if (lowerMessage.includes('feat') || lowerMessage.includes('feature')) return 'bg-green-500';
    if (lowerMessage.includes('fix') || lowerMessage.includes('bug')) return 'bg-red-500';
    if (lowerMessage.includes('docs')) return 'bg-blue-500';
    if (lowerMessage.includes('style')) return 'bg-purple-500';
    if (lowerMessage.includes('refactor')) return 'bg-yellow-500';
    if (lowerMessage.includes('test')) return 'bg-pink-500';
    return 'bg-gray-500'; // Default color for unmatched commit types
  };

  // Return emoji icon based on commit message keywords
  const getCommitIcon = (message) => {
    const lowerMessage = message.toLowerCase();
    if (lowerMessage.includes('feat') || lowerMessage.includes('feature')) return '✨';
    if (lowerMessage.includes('fix') || lowerMessage.includes('bug')) return '🐛';
    if (lowerMessage.includes('docs')) return '📚';
    if (lowerMessage.includes('style')) return '💎';
    if (lowerMessage.includes('refactor')) return '🔧';
    if (lowerMessage.includes('test')) return '🧪';
    return '📝'; // Default icon for unmatched commit types
  };

  // Shorten commit messages that exceed maximum length
  const truncateMessage = (message, maxLength = 80) => {
    if (message.length <= maxLength) return message;
    return message.substring(0, maxLength) + '...';
  };

  // Placeholder render - actual commit item UI to be implemented
  return <div>

    <h1>
      Button with color for every commit should be inside
    </h1>
  </div>;
};

export default CommitItem;
