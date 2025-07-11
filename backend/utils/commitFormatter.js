/**
 * Commit Formatter Utility
 * Formats commits into conventional commit format for daily summaries
 */

/**
 * Analyze commit message and determine conventional commit type
 */
function getConventionalType(message) {
  const msg = message.toLowerCase();
  
  // Direct conventional commit pattern
  const conventionalMatch = msg.match(/^(feat|fix|docs|style|refactor|test|chore|perf|ci|build|revert)(\(.+\))?:/);
  if (conventionalMatch) {
    return conventionalMatch[1];
  }
  
  // Keyword-based detection
  if (msg.includes('feat') || msg.includes('feature') || msg.includes('add') || msg.includes('implement')) {
    return 'feat';
  }
  if (msg.includes('fix') || msg.includes('bug') || msg.includes('hotfix') || msg.includes('patch')) {
    return 'fix';
  }
  if (msg.includes('doc') || msg.includes('readme') || msg.includes('comment')) {
    return 'docs';
  }
  if (msg.includes('refactor') || msg.includes('restructure') || msg.includes('cleanup')) {
    return 'refactor';
  }
  if (msg.includes('test') || msg.includes('spec') || msg.includes('coverage')) {
    return 'test';
  }
  if (msg.includes('style') || msg.includes('format') || msg.includes('lint') || msg.includes('prettier')) {
    return 'style';
  }
  if (msg.includes('chore') || msg.includes('update') || msg.includes('bump') || msg.includes('deps')) {
    return 'chore';
  }
  if (msg.includes('perf') || msg.includes('performance') || msg.includes('optimize')) {
    return 'perf';
  }
  if (msg.includes('ci') || msg.includes('pipeline') || msg.includes('workflow')) {
    return 'ci';
  }
  if (msg.includes('build') || msg.includes('webpack') || msg.includes('rollup')) {
    return 'build';
  }
  if (msg.includes('revert')) {
    return 'revert';
  }
  
  // Default to chore for unrecognized patterns
  return 'chore';
}

/**
 * Extract scope from commit message (optional)
 */
function extractScope(message, repositoryName) {
  // Check for existing scope in parentheses
  const scopeMatch = message.match(/\(([^)]+)\):/);
  if (scopeMatch) {
    return scopeMatch[1];
  }
  
  // Try to infer scope from common patterns
  const msg = message.toLowerCase();
  
  // Common scope patterns
  if (msg.includes('api') || msg.includes('endpoint') || msg.includes('route')) return 'api';
  if (msg.includes('ui') || msg.includes('component') || msg.includes('frontend')) return 'ui';
  if (msg.includes('auth') || msg.includes('login') || msg.includes('user')) return 'auth';
  if (msg.includes('db') || msg.includes('database') || msg.includes('migration')) return 'db';
  if (msg.includes('config') || msg.includes('env') || msg.includes('setting')) return 'config';
  if (msg.includes('docker') || msg.includes('deployment') || msg.includes('deploy')) return 'deploy';
  
  // Use repository name as scope if no other scope found
  return repositoryName;
}

/**
 * Clean and format commit description
 */
function formatDescription(message) {
  // Remove conventional commit prefix if it exists
  let description = message.replace(/^(feat|fix|docs|style|refactor|test|chore|perf|ci|build|revert)(\(.+\))?:\s*/, '');
  
  // Remove common prefixes
  description = description.replace(/^(add|update|remove|delete|create|implement|fix)\s*/i, '');
  
  // Capitalize first letter and ensure no trailing period
  description = description.charAt(0).toUpperCase() + description.slice(1);
  description = description.replace(/\.$/, '');
  
  // Truncate if too long
  if (description.length > 72) {
    description = description.substring(0, 69) + '...';
  }
  
  return description;
}

/**
 * Format a single commit in conventional commit format
 */
export function formatCommit(commit) {
  try {
    // Handle different repository property structures
    let repositoryName = 'unknown';
    if (commit.repository) {
      repositoryName = commit.repository.name || commit.repository.fullName || commit.repository;
    }
    
    const type = getConventionalType(commit.message);
    const scope = extractScope(commit.message, repositoryName);
    const description = formatDescription(commit.message);
    
    return {
      type,
      scope,
      description,
      formatted: `${type}(${scope}): ${description}`,
      repository: repositoryName,
      sha: commit.sha ? commit.sha.substring(0, 7) : 'unknown',
      author: commit.author ? commit.author.name : 'unknown',
      date: commit.author ? commit.author.date : new Date().toISOString(),
      url: commit.url || commit.html_url || '#'
    };
  } catch (error) {
    console.error('Error formatting commit:', error.message, 'Commit:', JSON.stringify(commit, null, 2));
    
    // Return a fallback formatted commit
    return {
      type: 'chore',
      scope: 'unknown',
      description: commit.message || 'Unknown commit',
      formatted: `chore(unknown): ${commit.message || 'Unknown commit'}`,
      repository: 'unknown',
      sha: commit.sha ? commit.sha.substring(0, 7) : 'unknown',
      author: 'unknown',
      date: new Date().toISOString(),
      url: '#'
    };
  }
}

/**
 * Format all commits for daily summary
 */
export function formatDailyCommits(commits) {
  try {
    if (!commits || !Array.isArray(commits) || commits.length === 0) {
      return {
        total: 0,
        byRepository: {},
        allCommits: []
      };
    }

    const formattedCommits = commits.map(formatCommit).filter(commit => commit !== null);
    
    // Group by repository for better organization
    const byRepository = formattedCommits.reduce((acc, commit) => {
      const repoName = commit.repository || 'unknown';
      if (!acc[repoName]) {
        acc[repoName] = [];
      }
      acc[repoName].push(commit);
      return acc;
    }, {});
    
    // Sort commits by time (newest first)
    Object.keys(byRepository).forEach(repo => {
      byRepository[repo].sort((a, b) => new Date(b.date) - new Date(a.date));
    });
    
    return {
      total: formattedCommits.length,
      byRepository,
      allCommits: formattedCommits.sort((a, b) => new Date(b.date) - new Date(a.date))
    };
  } catch (error) {
    console.error('Error in formatDailyCommits:', error.message);
    return {
      total: 0,
      byRepository: {},
      allCommits: []
    };
  }
}

/**
 * Generate daily summary text with formatted commits
 */
export function generateCommitListSummary(commits, repositories) {
  const formatted = formatDailyCommits(commits);
  
  let summary = `Daily Development Summary\n`;
  summary += `========================\n`;
  summary += `📊 ${formatted.total} commits across ${repositories.length} repositories\n\n`;
  
  // Group by repository
  Object.entries(formatted.byRepository).forEach(([repoName, repoCommits]) => {
    summary += `📁 ${repoName} (${repoCommits.length} commits)\n`;
    repoCommits.forEach(commit => {
      const time = new Date(commit.date).toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
      summary += `  • ${commit.formatted} [${commit.sha}] (${time})\n`;
    });
    summary += `\n`;
  });
  
  return summary.trim();
} 