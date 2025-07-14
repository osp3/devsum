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

  return <div>

    <h1>
      Button with color for every commit should be inside
    </h1>
  </div>;
};

export default CommitItem;
