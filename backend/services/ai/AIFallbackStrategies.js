/**
 * AI Fallback Strategies - Functional Pattern
 * Provides rule-based alternatives when AI services are unavailable
 * Fast execution, deterministic results, always available
 */

/**
 * Categorize commits using keyword-based rules
 * @param {Array} commits - Array of commit objects
 * @returns {Array} Commits with category, confidence, and reason
 */
export const categorizeCommits = (commits) => {
  console.log('Using fallback keyword categorization');

  return commits.map(commit => {
    const msg = commit.message.toLowerCase();
    let category = 'other';
    let confidence = 0.6;
    let reason = 'Keyword-based fallback';

    // Rule-based categorization
    if (msg.includes('fix') || msg.includes('bug') || msg.includes('error')) {
      category = 'bugfix';
      reason = 'Contains fix/bug/error keywords';
    } else if (msg.includes('feat') || msg.includes('add') || msg.includes('new')) {
      category = 'feature';
      reason = 'Contains feature/add/new keywords';
    } else if (msg.includes('refactor') || msg.includes('clean') || msg.includes('improve')) {
      category = 'refactor';
      reason = 'Contains refactor/clean/improve keywords';
    } else if (msg.includes('doc') || msg.includes('readme')) {
      category = 'docs';
      reason = 'Contains documentation keywords';
    } else if (msg.includes('test') || msg.includes('spec')) {
      category = 'test';
      reason = 'Contains test/spec keywords';
    }

    return {
      ...commit,
      category,
      confidence,
      aiReason: reason
    };
  });
};

/**
 * Generate simple template-based summary
 * @param {Array} commits - Array of commit objects
 * @returns {string} Fallback summary
 */
export const generateSummary = (commits) => {
  console.log('Using fallback template-based summary');
  
  const categories = groupByCategory(commits);
  const total = commits.length;
  const categoryNames = Object.keys(categories);
  
  if (total === 0) {
    return "No commits found for this period.";
  }
  
  if (total === 1) {
    return `You made 1 commit. Keep up the good work!`;
  }
  
  const categoryText = categoryNames.length > 0 
    ? ` across different areas: ${categoryNames.join(', ')}`
    : '';
    
  return `You made ${total} commits${categoryText}. Keep up the great work!`;
};

/**
 * Generate fallback commit message suggestion
 * @param {string} currentMessage - Current commit message
 * @param {string} diffContent - Diff content for analysis
 * @returns {Object} Commit message suggestion
 */
export const suggestCommitMessage = (currentMessage = '', diffContent = '') => {
  console.log('Using fallback commit message suggestion');

  let suggestedType = 'chore';
  let description = 'update code';

  // Rule-based type detection from diff content
  if (diffContent.includes('test') || diffContent.includes('spec')) {
    suggestedType = 'test';
    description = 'add or update tests';
  } else if (diffContent.includes('README') || diffContent.includes('docs/')) {
    suggestedType = 'docs';
    description = 'update documentation';
  } else if (diffContent.includes('fix') || diffContent.includes('bug')) {
    suggestedType = 'fix';
    description = 'resolve issue';
  } else if (diffContent.includes('function') || diffContent.includes('class')) {
    suggestedType = 'feat';
    description = 'add new functionality';
  }

  // Generate conventional format message
  const fallbackSuggestion = currentMessage.trim()
    ? `${suggestedType}: ${currentMessage}`
    : `${suggestedType}: ${description}`;

  return {
    original: currentMessage,
    suggested: fallbackSuggestion,
    improved: true,
    analysis: {
      method: 'fallback',
      diffSize: diffContent.length,
      generatedAt: new Date().toISOString()
    }
  };
};

/**
 * Generate fallback task suggestions
 * @param {Array} commits - Array of recent commits
 * @returns {Array} Basic task suggestions
 */
export const generateTasks = (commits) => {
  console.log('Using fallback task generation');
  
  const tasks = [
    {
      title: 'Review recent changes',
      description: "Look over recent commits and plan next steps",
      priority: "medium",
      estimatedTime: "30 minutes",
      basedOn: 'recent_commits',
      repositories: ['current']
    }
  ];
  
  // Add more specific tasks based on commit patterns
  if (commits.some(c => c.message.toLowerCase().includes('test'))) {
    tasks.push({
      title: 'Expand test coverage',
      description: "Add more tests based on recent test-related commits",
      priority: "medium",
      estimatedTime: "45 minutes",
      basedOn: 'test_commits',
      repositories: ['current']
    });
  }
  
  if (commits.some(c => c.message.toLowerCase().includes('fix'))) {
    tasks.push({
      title: 'Code review and quality check',
      description: "Review recent fixes to prevent similar issues",
      priority: "high",
      estimatedTime: "60 minutes",
      basedOn: 'fix_commits',
      repositories: ['current']
    });
  }
  
  return tasks;
};

/**
 * Analyze commit diff with simple heuristics
 * @param {Object} commit - Commit object
 * @param {string} diff - Diff content
 * @returns {Object} Fallback commit analysis
 */
export const analyzeCommitDiff = (commit, diff) => {
  const diffSize = diff.length;
  const message = commit.message || 'No message';
  
  // Simple heuristics for commit type detection
  let suggestedType = 'chore';
  let description = 'Code changes made';
  
  if (message.toLowerCase().includes('fix') || message.toLowerCase().includes('bug')) {
    suggestedType = 'fix';
    description = 'Bug fixes and corrections';
  } else if (message.toLowerCase().includes('feat') || message.toLowerCase().includes('add')) {
    suggestedType = 'feat';
    description = 'New feature or functionality added';
  } else if (message.toLowerCase().includes('refactor') || message.toLowerCase().includes('clean')) {
    suggestedType = 'refactor';
    description = 'Code refactoring and improvements';
  } else if (message.toLowerCase().includes('doc')) {
    suggestedType = 'docs';
    description = 'Documentation updates';
  } else if (message.toLowerCase().includes('test')) {
    suggestedType = 'test';
    description = 'Testing updates';
  }

  return {
    diffSize,
    suggestedMessage: `${suggestedType}: ${message.split('\n')[0].slice(0, 50)}`,
    suggestedDescription: description,
    commitAnalysis: `Fallback analysis: ${suggestedType} commit with ${diffSize} characters of changes`,
    confidence: 0.4,
    analysisDate: new Date().toISOString()
  };
};

/**
 * Helper function to group commits by category
 * @param {Array} commits - Array of commits
 * @returns {Object} Commits grouped by category
 */
export const groupByCategory = (commits) => {
  return commits.reduce((groups, commit) => {
    const category = commit.category || 'other';
    if (!groups[category]) groups[category] = [];
    groups[category].push(commit);
    return groups;
  }, {});
};

/**
 * Assess if a commit message is improved
 * @param {string} original - Original commit message
 * @param {string} suggested - Suggested commit message
 * @returns {boolean} True if suggestion is an improvement
 */
export const isMessageImproved = (original, suggested) => {
  // Any suggestion is improvement if no original
  if (!original || original.trim().length === 0) {
    return true;
  }

  // Check for conventional format
  const hasConventionalFormat = /^(feat|fix|docs|style|refactor|test|chore)(\(.+\))?:/.test(suggested);
  
  // Check if more descriptive
  const isMoreDescriptive = suggested.length > original.length + 10;
  
  // Check if original is basic/lazy
  const originalIsBasic = /^(fix|update|change|wip)$/i.test(original.trim());

  return hasConventionalFormat || isMoreDescriptive || originalIsBasic;
}; 