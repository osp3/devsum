/**
 * Summary Prompt Builder - Functional Pattern
 * Functions for creating summary generation AI prompts
 * Pure functions for reliable summary prompt generation
 */

import { groupByCategory, getTotalRepositories, separateCommitsByAnalysis } from './PromptUtils.js';

/**
 * Create summary prompt - chooses between enhanced and basic based on available data
 * @param {Array} commits - Array of commit objects
 * @returns {string} Summary generation prompt for AI
 */
export const createSummaryPrompt = (commits) => {
  const categories = groupByCategory(commits);
  const { hasAIAnalysis } = separateCommitsByAnalysis(commits);

  if (hasAIAnalysis) {
    return createEnhancedSummaryPrompt(commits, categories);
  } else {
    return createBasicSummaryPrompt(commits, categories);
  }
};

/**
 * Create enhanced summary prompt using AI analysis data
 * @param {Array} commits - Array of commit objects
 * @param {Object} categories - Commits grouped by category
 * @returns {string} Enhanced summary prompt for AI
 */
export const createEnhancedSummaryPrompt = (commits, categories) => {
  const { analyzed, unanalyzed } = separateCommitsByAnalysis(commits);
  const totalRepositories = getTotalRepositories(commits);
  
  const aiAnalysisSection = analyzed.length > 0 ? `
AI-ANALYZED COMMITS (${analyzed.length} commits):
${analyzed.map(c => `
- Original: "${c.message}"
- AI Suggested: "${c.aiAnalysis.suggestedMessage}"
- Description: ${c.aiAnalysis.suggestedDescription}
- Analysis: ${c.aiAnalysis.commitAnalysis}
- Quality Impact: ${c.aiAnalysis.confidence > 0.7 ? 'High' : c.aiAnalysis.confidence > 0.5 ? 'Medium' : 'Low'}
- Repository: ${c.repository}`).join('\n')}
  `.trim() : '';

  const basicCommitsSection = unanalyzed.length > 0 ? `
ADDITIONAL COMMITS (${unanalyzed.length} commits):
${Object.entries(groupByCategory(unanalyzed)).map(([cat, commits]) =>
  `${cat.toUpperCase()}: ${commits.length} commits\n${commits.map(c => `- ${c.message} (${c.repository})`).join('\n')}`
).join('\n\n')}
  `.trim() : '';

  return `
Generate a comprehensive daily development summary based on AI analysis of individual commits.

OVERVIEW: ${commits.length} total commits across ${totalRepositories} repositories

${aiAnalysisSection}

${basicCommitsSection}

SUMMARY REQUIREMENTS:
1. Synthesize the AI analysis to highlight key developments and patterns
2. Focus on actual code changes and their impact (not just commit messages)
3. Group related work across repositories when relevant
4. Mention code quality insights from AI analysis
5. Highlight significant features, fixes, or improvements
6. Keep it professional but engaging

Write a 4-6 sentence summary that captures:
- Most impactful changes based on AI analysis
- Overall development patterns and focus areas
- Code quality and improvement trends
- Cross-repository work coordination if applicable

Start with "Yesterday's development work focused on..." and provide actionable insights.
  `.trim();
};

/**
 * Create basic summary prompt when only commit messages are available
 * @param {Array} commits - Array of commit objects
 * @param {Object} categories - Commits grouped by category
 * @returns {string} Basic summary prompt for AI
 */
export const createBasicSummaryPrompt = (commits, categories) => {
  return `
Generate a brief, friendly daily summary of development work.

YESTERDAY'S COMMITS:
${Object.entries(categories).map(([cat, commits]) =>
  `${cat.toUpperCase()}: ${commits.length} commits\n${commits.map(c => `- ${c.message}`).join('\n')}`
).join('\n\n')}

Write a 2-3 sentence summary focusing on:
- main accomplishments
- types of work done
- Overall progress

Keep it positive and professional. Start with "Today you..."
  `.trim();
};

/**
 * Create prompt for weekly summary generation
 * @param {Array} commits - Array of commit objects from the week
 * @returns {string} Weekly summary prompt for AI
 */
export const createWeeklySummaryPrompt = (commits) => {
  const totalRepositories = getTotalRepositories(commits);
  const categories = groupByCategory(commits);
  const { hasAIAnalysis, analyzed } = separateCommitsByAnalysis(commits);

  const commitsByDay = commits.reduce((acc, commit) => {
    const date = new Date(commit.date).toLocaleDateString('en-US', { weekday: 'long' });
    if (!acc[date]) acc[date] = [];
    acc[date].push(commit);
    return acc;
  }, {});

  const dailyBreakdown = Object.entries(commitsByDay)
    .map(([day, dayCommits]) => 
      `${day}: ${dayCommits.length} commits\n${dayCommits.slice(0, 3).map(c => `  - ${c.message}`).join('\n')}${dayCommits.length > 3 ? `\n  ... and ${dayCommits.length - 3} more` : ''}`
    ).join('\n\n');

  return `
Generate a comprehensive weekly development summary.

WEEK OVERVIEW: ${commits.length} total commits across ${totalRepositories} repositories

DAILY BREAKDOWN:
${dailyBreakdown}

CATEGORY SUMMARY:
${Object.entries(categories).map(([cat, commits]) =>
  `${cat.toUpperCase()}: ${commits.length} commits (${Math.round((commits.length / commits.length) * 100)}%)`
).join('\n')}

${hasAIAnalysis ? `
AI QUALITY INSIGHTS:
${analyzed.slice(0, 5).map(c => `
- ${c.aiAnalysis.suggestedMessage} (Quality: ${c.aiAnalysis.confidence > 0.7 ? 'High' : 'Medium'})
  Impact: ${c.aiAnalysis.analysis}`).join('\n')}
` : ''}

INSTRUCTIONS:
1. Provide a high-level summary of the week's development progress
2. Highlight major accomplishments and themes
3. Note any patterns in development activity
4. Mention cross-repository coordination if applicable
5. Include insights about code quality and best practices
6. Keep it professional and actionable

Write a 6-8 sentence summary that captures the week's development narrative.
Start with "This week's development activity..."
  `.trim();
};

/**
 * Create prompt for monthly development report
 * @param {Array} commits - Array of commit objects from the month
 * @returns {string} Monthly report prompt for AI
 */
export const createMonthlyReportPrompt = (commits) => {
  const totalRepositories = getTotalRepositories(commits);
  const categories = groupByCategory(commits);
  
  const weeklyStats = commits.reduce((acc, commit) => {
    const week = Math.ceil(new Date(commit.date).getDate() / 7);
    if (!acc[week]) acc[week] = 0;
    acc[week]++;
    return acc;
  }, {});

  const topContributors = commits.reduce((acc, commit) => {
    const author = commit.author?.name || 'Unknown';
    acc[author] = (acc[author] || 0) + 1;
    return acc;
  }, {});

  const topContributorsList = Object.entries(topContributors)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([author, count]) => `${author}: ${count} commits`)
    .join('\n');

  return `
Generate a comprehensive monthly development report.

MONTH OVERVIEW: ${commits.length} total commits across ${totalRepositories} repositories

WEEKLY ACTIVITY:
${Object.entries(weeklyStats).map(([week, count]) => 
  `Week ${week}: ${count} commits`).join('\n')}

CATEGORY BREAKDOWN:
${Object.entries(categories).map(([cat, commits]) =>
  `${cat.toUpperCase()}: ${commits.length} commits (${Math.round((commits.length / commits.length) * 100)}%)`
).join('\n')}

TOP CONTRIBUTORS:
${topContributorsList}

INSTRUCTIONS:
1. Provide a strategic overview of the month's development progress
2. Identify major themes and accomplishments
3. Analyze development velocity and patterns
4. Highlight significant features, improvements, or architectural changes
5. Note team collaboration and contribution patterns
6. Provide insights for planning next month's work

Write a comprehensive 8-10 sentence report that tells the story of the month's development.
Start with "This month's development achievements include..."
  `.trim();
};

/**
 * Create prompt for repository-specific summary
 * @param {Array} commits - Array of commit objects for specific repository
 * @param {string} repositoryName - Name of the repository
 * @returns {string} Repository summary prompt for AI
 */
export const createRepositorySummaryPrompt = (commits, repositoryName) => {
  const categories = groupByCategory(commits);
  const { hasAIAnalysis, analyzed } = separateCommitsByAnalysis(commits);

  const recentCommits = commits.slice(0, 10);
  
  return `
Generate a focused summary for repository: ${repositoryName}

REPOSITORY ACTIVITY: ${commits.length} commits

CATEGORY BREAKDOWN:
${Object.entries(categories).map(([cat, commits]) =>
  `${cat.toUpperCase()}: ${commits.length} commits`
).join('\n')}

RECENT COMMITS:
${recentCommits.map((commit, index) => 
  `${index + 1}. ${commit.message}${commit.aiAnalysis ? ` (AI: ${commit.aiAnalysis.suggestedMessage})` : ''}`
).join('\n')}

${hasAIAnalysis ? `
CODE QUALITY INSIGHTS:
${analyzed.slice(0, 3).map(c => 
  `- ${c.aiAnalysis.analysis} (Confidence: ${Math.round(c.aiAnalysis.confidence * 100)}%)`
).join('\n')}
` : ''}

INSTRUCTIONS:
1. Focus specifically on this repository's development activity
2. Highlight key features, fixes, and improvements
3. Note any architectural or structural changes
4. Mention code quality trends if available
5. Keep it concise but informative

Write a 3-4 sentence summary specific to ${repositoryName}.
Start with "Development in ${repositoryName} focused on..."
  `.trim();
}; 