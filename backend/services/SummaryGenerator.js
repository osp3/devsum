/**
 * Summary generation service
 * Follows Single Responsibility Principle - handles only summary text generation
 */

/**
 * Service for generating formatted development summaries
 */
export class SummaryGenerator {
  /**
   * Generate cumulative daily summary from commits with AI insights
   * @param {Array} commits - Array of formatted commit objects
   * @param {number} repositoryCount - Number of repositories
   * @returns {string} Formatted cumulative summary text
   */
  static generateFormattedSummary(commits, repositoryCount) {
    const summaryLines = [
      'Daily Development Activity Summary',
      '==================================',
      `${commits.length} commits across ${repositoryCount} repositories`,
      ''
    ];

    // Analyze development patterns
    const patterns = this._analyzeCommitPatterns(commits);
    const aiInsights = this._extractAIInsights(commits);
    
    // Add pattern summary
    summaryLines.push('📊 Development Overview:');
    summaryLines.push(`• Primary Activity: ${patterns.primaryActivity}`);
    summaryLines.push(`• Repository Focus: ${patterns.repositoryFocus}`);
    summaryLines.push(`• Commit Types: ${patterns.commitTypes}`);
    summaryLines.push('');
    
    // Add AI insights if available
    if (aiInsights.hasAIAnalysis) {
      summaryLines.push('🤖 AI Analysis Highlights:');
      summaryLines.push(`• ${aiInsights.analyzedCount} commits analyzed with AI`);
      summaryLines.push(`• Average Quality: ${aiInsights.averageQuality}`);
      summaryLines.push(`• Key Improvements: ${aiInsights.improvements}`);
      summaryLines.push('');
    }
    
    // Add repository breakdown
    summaryLines.push('📁 Repository Activity:');
    const commitsByRepo = this.groupCommitsByRepository(commits);
    
    Object.entries(commitsByRepo).forEach(([repoName, repoCommits]) => {
      const repoSummary = this._summarizeRepositoryActivity(repoCommits);
      summaryLines.push(`• ${repoName}: ${repoSummary}`);
    });
    
    summaryLines.push('');
    summaryLines.push('💡 Key Achievements:');
    summaryLines.push(this._generateKeyAchievements(commits, patterns));

    return summaryLines.join('\n').trim();
  }

  /**
   * Analyze commit patterns to understand development focus
   * @param {Array} commits - Array of formatted commit objects
   * @returns {Object} Pattern analysis
   */
  static _analyzeCommitPatterns(commits) {
    const typeCount = {};
    const repoCount = {};
    
    commits.forEach(commit => {
      typeCount[commit.type] = (typeCount[commit.type] || 0) + 1;
      repoCount[commit.repository] = (repoCount[commit.repository] || 0) + 1;
    });
    
    const primaryType = Object.entries(typeCount).sort((a, b) => b[1] - a[1])[0]?.[0] || 'other';
    const primaryRepo = Object.entries(repoCount).sort((a, b) => b[1] - a[1])[0]?.[0] || 'unknown';
    
    const topTypes = Object.entries(typeCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([type, count]) => `${type} (${count})`)
      .join(', ');
    
    return {
      primaryActivity: this._getActivityDescription(primaryType),
      repositoryFocus: repoCount[primaryRepo] > 1 ? `Focused on ${primaryRepo}` : 'Distributed across repositories',
      commitTypes: topTypes,
      typeDistribution: typeCount,
      repositoryDistribution: repoCount
    };
  }

  /**
   * Extract AI insights from commits
   * @param {Array} commits - Array of formatted commit objects
   * @returns {Object} AI insights
   */
  static _extractAIInsights(commits) {
    const commitsWithAI = commits.filter(commit => commit.aiAnalysis);
    
    if (commitsWithAI.length === 0) {
      return { hasAIAnalysis: false };
    }
    
    const totalConfidence = commitsWithAI.reduce((sum, commit) => sum + commit.aiAnalysis.confidence, 0);
    const averageConfidence = totalConfidence / commitsWithAI.length;
    
    const improvements = commitsWithAI.filter(commit => 
      commit.aiAnalysis.suggestedMessage !== commit.formatted
    ).length;
    
    return {
      hasAIAnalysis: true,
      analyzedCount: commitsWithAI.length,
      averageQuality: averageConfidence > 0.7 ? 'High' : averageConfidence > 0.5 ? 'Medium' : 'Low',
      improvements: improvements > 0 ? `${improvements} commits could be improved` : 'All commits well-formatted'
    };
  }

  /**
   * Summarize repository activity
   * @param {Array} commits - Commits for a specific repository
   * @returns {string} Repository summary
   */
  static _summarizeRepositoryActivity(commits) {
    const types = [...new Set(commits.map(c => c.type))];
    const count = commits.length;
    
    if (count === 1) {
      return `${count} commit (${types[0]})`;
    }
    
    return `${count} commits (${types.join(', ')})`;
  }

  /**
   * Generate key achievements summary
   * @param {Array} commits - Array of formatted commit objects
   * @param {Object} patterns - Pattern analysis
   * @returns {string} Key achievements
   */
  static _generateKeyAchievements(commits, patterns) {
    const achievements = [];
    
    if (patterns.typeDistribution.feat > 0) {
      achievements.push(`Added ${patterns.typeDistribution.feat} new features`);
    }
    
    if (patterns.typeDistribution.fix > 0) {
      achievements.push(`Fixed ${patterns.typeDistribution.fix} bugs`);
    }
    
    if (patterns.typeDistribution.refactor > 0) {
      achievements.push(`Refactored ${patterns.typeDistribution.refactor} components`);
    }
    
    if (patterns.typeDistribution.docs > 0) {
      achievements.push(`Updated documentation ${patterns.typeDistribution.docs} times`);
    }
    
    if (achievements.length === 0) {
      achievements.push('Maintained codebase with various improvements');
    }
    
    return achievements.join(', ');
  }

  /**
   * Get activity description for commit type
   * @param {string} type - Commit type
   * @returns {string} Activity description
   */
  static _getActivityDescription(type) {
    const descriptions = {
      feat: 'Feature Development',
      fix: 'Bug Fixing',
      refactor: 'Code Refactoring',
      docs: 'Documentation Updates',
      test: 'Testing Improvements',
      style: 'Code Formatting',
      chore: 'Maintenance Tasks'
    };
    
    return descriptions[type] || 'General Development';
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