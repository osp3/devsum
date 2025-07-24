/**
 * Prompt Utils - Functional Pattern
 * Utility functions for prompt building operations
 * Pure functions for reliable prompt generation support
 */

/**
 * Create signature of recent work patterns for smart caching
 * @param {Array} commits - Array of commit objects
 * @returns {string} Work signature for caching
 */
export const createWorkSignature = (commits) => {
  // Step 1: Organize commits into logical categories
  const categories = groupByCategory(commits);
  
  // Step 2: Create signature - organize alphabetical order
  const signature = Object.keys(categories)
    .sort()
    .map(cat => `${cat}:${categories[cat].length}`)
    .join('|');

  return signature;
};

/**
 * Organize commits by category
 * @param {Array} commits - Array of commit objects
 * @returns {Object} Commits grouped by category
 */
export const groupByCategory = (commits) => {
  return commits.reduce((groups, commit) => {
    const category = commit.category || 'other'; // Default for unclassified commits
    if (!groups[category]) groups[category] = []; // Initialize category array if needed
    groups[category].push(commit); // Add commit to appropriate category
    return groups; // Return accumulator for next iteration
  }, {});
};

/**
 * Format commits by category for AI analysis
 * @param {Array} commits - Array of commit objects
 * @returns {string} Formatted commit summary
 */
export const formatCommitsByCategory = (commits) => {
  const commitsByCategory = commits.reduce((groups, commit) => {
    const category = commit.category || 'other';
    if (!groups[category]) groups[category] = [];
    groups[category].push(commit.message);
    return groups;
  }, {});

  return Object.entries(commitsByCategory)
    .map(([category, messages]) => 
      `${category.toUpperCase()} (${messages.length}):\n${messages.map(m => `- ${m}`).join('\n')}`
    )
    .join('\n\n');
};

/**
 * Create numbered list of commit messages for AI analysis
 * @param {Array} commits - Array of commit objects
 * @returns {string} Numbered commit list
 */
export const createNumberedCommitList = (commits) => {
  return commits.map((commit, index) => 
    `${index + 1}. ${commit.message}`
  ).join('\n');
};

/**
 * Get total number of unique repositories from commits
 * @param {Array} commits - Array of commit objects
 * @returns {number} Number of unique repositories
 */
export const getTotalRepositories = (commits) => {
  return new Set(commits.map(c => c.repository)).size;
};

/**
 * Filter commits by whether they have AI analysis
 * @param {Array} commits - Array of commit objects
 * @returns {Object} Object with analyzed and unanalyzed commits
 */
export const separateCommitsByAnalysis = (commits) => {
  const commitsWithAI = commits.filter(c => c.aiAnalysis);
  const commitsWithoutAI = commits.filter(c => !c.aiAnalysis);
  
  return {
    analyzed: commitsWithAI,
    unanalyzed: commitsWithoutAI,
    hasAIAnalysis: commitsWithAI.length > 0
  };
};

/**
 * Truncate diff content to prevent excessive AI costs
 * @param {string} diff - Diff content
 * @param {number} maxLength - Maximum length (default: 2000)
 * @returns {string} Truncated diff
 */
export const truncateDiff = (diff, maxLength = 2000) => {
  if (diff.length <= maxLength) {
    return diff;
  }
  
  return diff.slice(0, maxLength) + '\n... (diff truncated for analysis)';
};

/**
 * Format commit info section for prompts
 * @param {Object} commit - Commit object
 * @returns {string} Formatted commit info
 */
export const formatCommitInfo = (commit) => {
  return `Message: "${commit.message || 'No message'}"
SHA: ${commit.sha?.substring(0, 7) || 'Unknown'}
Author: ${commit.author?.name || 'Unknown'}
Date: ${commit.date || 'Unknown'}`;
}; 