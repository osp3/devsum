/**
 * Summary generation service
 * Follows Single Responsibility Principle - handles only summary text generation
 */

/**
 * Service for generating formatted development summaries
 */
export class SummaryGenerator {
  /**
   * Generate formatted summary text from commits
   * @param {Array} commits - Array of formatted commit objects
   * @param {number} repositoryCount - Number of repositories
   * @returns {string} Formatted summary text
   */
  static generateFormattedSummary(commits, repositoryCount) {
    const summaryLines = [
      'Daily Development Summary',
      '========================',
      `${commits.length} commits across ${repositoryCount} repositories`,
      ''
    ];

    const commitsByRepo = this.groupCommitsByRepository(commits);
    
    Object.entries(commitsByRepo).forEach(([repoName, repoCommits]) => {
      summaryLines.push(`${repoName} (${repoCommits.length} commits)`);
      repoCommits.forEach(commit => {
        const time = new Date(commit.date).toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: true 
        });
        summaryLines.push(`  • ${commit.formatted} [${commit.sha}] (${time})`);
      });
      summaryLines.push('');
    });

    return summaryLines.join('\n').trim();
  }

  /**
   * Group commits by repository name
   * @param {Array} commits - Array of commit objects
   * @returns {Object} Object with repository names as keys
   */
  static groupCommitsByRepository(commits) {
    return commits.reduce((acc, commit) => {
      if (!acc[commit.repository]) {
        acc[commit.repository] = [];
      }
      acc[commit.repository].push(commit);
      return acc;
    }, {});
  }

  /**
   * Structure formatted commits for API response
   * @param {Array} commits - Array of formatted commit objects
   * @returns {Object} Structured commit data
   */
  static structureFormattedCommits(commits) {
    return {
      total: commits.length,
      byRepository: this.groupCommitsByRepository(commits),
      allCommits: commits
    };
  }
} 