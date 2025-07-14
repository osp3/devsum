/**
 * Commit formatting utilities
 * Follows Single Responsibility Principle - handles only commit message parsing and formatting
 */

/**
 * Parse conventional commit format or create default structure
 * @param {string} message - Raw commit message
 * @param {string} repoName - Repository name for default scope
 * @returns {Object} { type, scope, description }
 */
export function parseConventionalCommit(message, repoName) {
  const firstLine = message.split('\n')[0];
  const conventionalMatch = firstLine.match(/^(\w+)(\(.+\))?\s*:\s*(.+)/);
  
  if (conventionalMatch) {
    return {
      type: conventionalMatch[1],
      scope: conventionalMatch[2] ? conventionalMatch[2].slice(1, -1) : repoName,
      description: conventionalMatch[3]
    };
  }
  
  // Create conventional format from raw message
  return {
    type: 'feat',
    scope: repoName,
    description: firstLine
  };
}

/**
 * Format commit object with all required fields and optional AI analysis
 * @param {Object} commit - Raw commit from GitHub API
 * @param {Object} repo - Repository object
 * @param {Object} aiAnalysis - Optional AI analysis of the commit
 * @returns {Object} Formatted commit object
 */
export function formatCommitObject(commit, repo, aiAnalysis = null) {
  const parsed = parseConventionalCommit(commit.message || '', repo.name);
  
  const formattedCommit = {
    type: parsed.type,
    scope: parsed.scope,
    description: parsed.description,
    formatted: `${parsed.type}(${parsed.scope}): ${parsed.description}`,
    repository: repo.name,
    sha: commit.sha.substring(0, 7),
    author: commit.author?.name || commit.author || 'Unknown',
    date: commit.date || commit.author?.date,
    url: `https://github.com/${repo.fullName}/commit/${commit.sha}`
  };
  
  // Add AI analysis if provided
  if (aiAnalysis) {
    formattedCommit.aiAnalysis = {
      diffSize: aiAnalysis.diffSize,
      suggestedMessage: aiAnalysis.suggestedMessage,
      suggestedDescription: aiAnalysis.suggestedDescription,
      commitAnalysis: aiAnalysis.commitAnalysis,
      confidence: aiAnalysis.confidence,
      analysisDate: aiAnalysis.analysisDate
    };
  }
  
  return formattedCommit;
}

/**
 * Generate fake MongoDB ObjectId for compatibility
 * @returns {string}
 */
export function generateFakeObjectId() {
  return new Date().getTime().toString(16) + Math.random().toString(16).slice(2);
} 