import connectDB from '../../config/database.js';
import PromptBuilder from '../prompts/PromptBuilder.js';
import { DailySummary } from '../../models/aiModels.js';
import { callOpenAI, defaultOptions } from '../ai/OpenAIClientManager.js';
import { parseSummaryResponse } from '../ai/AIResponseParser.js';
import { generateSummary as fallbackSummary, groupByCategory } from '../ai/AIFallbackStrategies.js';

/**
 * Summary Generator - Functional Pattern
 * Handles daily development summary generation with caching
 */

let initialized = false;
let promptBuilder = null;

/**
 * Initialize the generator (lazy initialization)
 */
const init = async () => {
  if (!initialized) {
    await connectDB();
    promptBuilder = new PromptBuilder();
    initialized = true;
    console.log('Summary Generator initialized');
  }
};

/**
 * Generate daily development summary with caching
 * @param {Array} commits - Array of commits for the day
 * @param {string} repositoryId - Repository identifier
 * @param {string} userApiKey - User's OpenAI API key
 * @param {string} userModel - User's preferred model
 * @param {Date} date - Date for the summary
 * @param {boolean} forceRefresh - Force regeneration
 * @returns {Promise<string>} Daily summary text
 */
export const generateDailySummary = async (commits, repositoryId, userApiKey, userModel = 'gpt-4o-mini', date = new Date(), forceRefresh = false) => {
  await init();
  const dateStr = date.toISOString().split('T')[0];

  try {
    // Check for cached summary unless force refresh requested
    if (!forceRefresh) {
      const existing = await DailySummary.findOne({
        date: dateStr,
        repositoryId: repositoryId
      }).lean();

      if (existing) {
        console.log(`📦 SummaryGenerator: Using CACHED summary for ${dateStr} (repositoryId: ${repositoryId})`);
        console.log(`📦 Cache hit - Summary preview: "${existing.summary.substring(0, 100)}..."`);
        return existing.summary;
      } else {
        console.log(`📦 SummaryGenerator: No cached summary found for ${dateStr} - will generate fresh`);
      }
    } else {
      console.log(`🔄 SummaryGenerator: Force refresh requested - bypassing cache for ${dateStr} (repositoryId: ${repositoryId})`);
    }

    // Generate new summary with AI
    console.log(`🤖 SummaryGenerator: Generating FRESH daily summary for ${dateStr} with ${commits.length} commits (repositoryId: ${repositoryId})`);
    const prompt = promptBuilder.createSummaryPrompt(commits);
    const aiResponse = await callOpenAI(prompt, userApiKey, userModel, defaultOptions.summaryGeneration);
    const summary = parseSummaryResponse(aiResponse);
    
    console.log(`🤖 SummaryGenerator: Fresh summary generated - Preview: "${summary.substring(0, 100)}..."`);

    // Store in database for future requests
    await storeSummary(dateStr, repositoryId, summary, commits);

    console.log(`💾 SummaryGenerator: Fresh summary stored in cache for ${dateStr}`);
    return summary;
  } catch (error) {
    console.error('Summary generation failed:', error.message);
    return fallbackSummary(commits);
  }
};

/**
 * Get summary history for a repository
 * @param {string} repositoryId - Repository identifier
 * @param {number} days - Number of days to look back
 * @returns {Promise<Array>} Historical summaries
 */
export const getSummaryHistory = async (repositoryId, days = 30) => {
  await init();
  
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    const summaries = await DailySummary.find({
      repositoryId: repositoryId,
      date: { $gte: cutoffDate.toISOString().split('T')[0] }
    })
    .sort({ date: -1 })
    .lean();

    return summaries.map(summary => ({
      date: summary.date,
      summary: summary.summary,
      commitCount: summary.commitCount,
      categories: summary.categories,
      createdAt: summary.createdAt
    }));
  } catch (error) {
    console.error('Failed to get summary history:', error.message);
    return [];
  }
};

/**
 * Get summary statistics for a repository
 * @param {string} repositoryId - Repository identifier
 * @param {number} days - Number of days to analyze
 * @returns {Promise<Object>} Summary statistics
 */
export const getSummaryStats = async (repositoryId, days = 30) => {
  await init();
  
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    const summaries = await DailySummary.find({
      repositoryId: repositoryId,
      date: { $gte: cutoffDate.toISOString().split('T')[0] }
    }).lean();

    const totalDays = summaries.length;
    const totalCommits = summaries.reduce((sum, s) => sum + (s.commitCount || 0), 0);
    const avgCommitsPerDay = totalDays > 0 ? Math.round(totalCommits / totalDays) : 0;
    
    // Aggregate categories across all summaries
    const allCategories = {};
    summaries.forEach(summary => {
      if (summary.categories) {
        Object.entries(summary.categories).forEach(([category, count]) => {
          allCategories[category] = (allCategories[category] || 0) + count;
        });
      }
    });

    return {
      totalDays,
      totalCommits,
      avgCommitsPerDay,
      categories: allCategories,
      periodStart: cutoffDate.toISOString().split('T')[0],
      periodEnd: new Date().toISOString().split('T')[0]
    };
  } catch (error) {
    console.error('Failed to get summary stats:', error.message);
    return {
      totalDays: 0,
      totalCommits: 0,
      avgCommitsPerDay: 0,
      categories: {},
      periodStart: null,
      periodEnd: null
    };
  }
};

/**
 * Delete summaries older than specified days
 * @param {number} days - Days to keep
 * @returns {Promise<number>} Number of deleted summaries
 */
export const cleanupOldSummaries = async (days = 90) => {
  await init();
  
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    const result = await DailySummary.deleteMany({
      date: { $lt: cutoffDate.toISOString().split('T')[0] }
    });

    console.log(`🧹 Cleaned up ${result.deletedCount} old summaries (older than ${days} days)`);
    return result.deletedCount;
  } catch (error) {
    console.error('Failed to cleanup old summaries:', error.message);
    return 0;
  }
};

/**
 * Store summary in database
 * @param {string} dateStr - Date string
 * @param {string} repositoryId - Repository identifier
 * @param {string} summary - Summary text
 * @param {Array} commits - Commits for the day
 * @returns {Promise<void>}
 */
const storeSummary = async (dateStr, repositoryId, summary, commits) => {
  try {
    await DailySummary.findOneAndUpdate(
      { date: dateStr, repositoryId: repositoryId },
      {
        date: dateStr,
        repositoryId: repositoryId,
        summary: summary,
        commitCount: commits.length,
        categories: groupByCategory(commits)
      },
      { upsert: true, new: true }
    );
  } catch (error) {
    console.error('Failed to store summary:', error.message);
    // Don't throw - summary generation succeeded, storage failure shouldn't break the flow
  }
};

/**
 * Structure formatted commits for API response (Legacy compatibility)
 * @param {Array} commits - Array of formatted commit objects
 * @returns {Object} Structured commit data
 */
export const structureFormattedCommits = (commits) => {
  return {
    total: commits.length,
    byRepository: groupCommitsByRepository(commits),
    allCommits: commits
  };
};

/**
 * Generate formatted summary from commits (Legacy compatibility)
 * @param {Array} commits - Array of formatted commit objects
 * @param {number} repositoryCount - Number of repositories
 * @returns {string} Formatted summary text
 */
export const generateFormattedSummary = (commits, repositoryCount) => {
  const summaryLines = [
    'Daily Development Activity Summary',
    '==================================',
    `${commits.length} commits across ${repositoryCount} repositories`,
    ''
  ];

  // Analyze development patterns
  const patterns = analyzeCommitPatterns(commits);
  const aiInsights = extractAIInsights(commits);
  
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
  const commitsByRepo = groupCommitsByRepository(commits);
  
  Object.entries(commitsByRepo).forEach(([repoName, repoCommits]) => {
    const repoSummary = summarizeRepositoryActivity(repoCommits);
    summaryLines.push(`• ${repoName}: ${repoSummary}`);
  });
  
  summaryLines.push('');
  summaryLines.push('💡 Key Achievements:');
  summaryLines.push(generateKeyAchievements(commits, patterns));

  return summaryLines.join('\n').trim();
};

/**
 * Group commits by repository name
 * @param {Array} commits - Array of commit objects
 * @returns {Object} Object with repository names as keys
 */
const groupCommitsByRepository = (commits) => {
  return commits.reduce((acc, commit) => {
    if (!acc[commit.repository]) {
      acc[commit.repository] = [];
    }
    acc[commit.repository].push(commit);
    return acc;
  }, {});
};

/**
 * Analyze commit patterns to understand development focus
 * @param {Array} commits - Array of formatted commit objects
 * @returns {Object} Pattern analysis
 */
const analyzeCommitPatterns = (commits) => {
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
    primaryActivity: getActivityDescription(primaryType),
    repositoryFocus: repoCount[primaryRepo] > 1 ? `Focused on ${primaryRepo}` : 'Distributed across repositories',
    commitTypes: topTypes,
    typeDistribution: typeCount,
    repositoryDistribution: repoCount
  };
};

/**
 * Extract AI insights from commits
 * @param {Array} commits - Array of formatted commit objects
 * @returns {Object} AI insights
 */
const extractAIInsights = (commits) => {
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
};

/**
 * Summarize repository activity
 * @param {Array} commits - Commits for a specific repository
 * @returns {string} Repository summary
 */
const summarizeRepositoryActivity = (commits) => {
  const types = [...new Set(commits.map(c => c.type))];
  const count = commits.length;
  
  if (count === 1) {
    return `${count} commit (${types[0]})`;
  }
  
  return `${count} commits (${types.join(', ')})`;
};

/**
 * Generate key achievements summary
 * @param {Array} commits - Array of formatted commit objects
 * @param {Object} patterns - Pattern analysis
 * @returns {string} Key achievements
 */
const generateKeyAchievements = (commits, patterns) => {
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
};

/**
 * Get activity description for commit type
 * @param {string} type - Commit type
 * @returns {string} Activity description
 */
const getActivityDescription = (type) => {
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
}; 