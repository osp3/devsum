import dotenv from 'dotenv';
import connectDB from '../../config/database.js';
import QualityAnalyzer from '../quality/QualityAnalyzer.js';
import { createOpenAIClient } from './OpenAIClientManager.js';
import * as CommitAnalyzer from './AICommitAnalyzer.js';
import * as SummaryGenerator from '../tasks/SummaryGenerator.js';
import * as TaskSuggester from '../tasks/TaskSuggester.js';

/**
 * AI Coordinator - Main Coordinator (Functional Pattern)
 * Delegates to specialized functional services while maintaining backwards compatibility
 * Follows Single Responsibility Principle by coordinating rather than implementing
 */

dotenv.config();

let initialized = false;
let githubService = null; // Will be set when needed for quality analysis

/**
 * Lazy initialization - avoids connecting to database until actually needed
 */
const init = async () => {
  if (!initialized) {
    await connectDB();
    initialized = true;
    console.log('AI Coordinator initialized with functional modules');
  }
};

/**
 * Set GitHubService instance for authenticated API calls
 * @param {Object} githubServiceInstance - GitHub service instance
 */
const setGitHubService = (githubServiceInstance) => {
  githubService = githubServiceInstance;
};

/**
 * Categorize commits with AI analysis and caching
 * Delegates to CommitAnalyzer functional module
 * @param {Array} commits - Array of commit objects
 * @param {string} userApiKey - User's OpenAI API key
 * @param {string} userModel - User's preferred model
 * @returns {Promise<Array>} Commits with categorization
 */
const categorizeCommits = async (commits, userApiKey, userModel = 'gpt-4o-mini') => {
  await init();
  return await CommitAnalyzer.categorizeCommits(commits, userApiKey, userModel);
};

/**
 * Generate daily development summary with caching
 * Delegates to SummaryGenerator functional module
 * @param {Array} commits - Array of commits for the day
 * @param {string} repositoryId - Repository identifier
 * @param {string} userApiKey - User's OpenAI API key
 * @param {string} userModel - User's preferred model
 * @param {Date} date - Date for the summary
 * @param {boolean} forceRefresh - Force regeneration
 * @returns {Promise<string>} Daily summary text
 */
const generateDailySummary = async (commits, repositoryId, userApiKey, userModel = 'gpt-4o-mini', date = new Date(), forceRefresh = false) => {
  await init();
  return await SummaryGenerator.generateDailySummary(commits, repositoryId, userApiKey, userModel, date, forceRefresh);
};

/**
 * Generate task suggestions based on recent commits
 * Delegates to TaskSuggester functional module
 * @param {Array} recentCommits - Array of recent commit objects
 * @param {string} repositoryId - Repository identifier
 * @param {string} userApiKey - User's OpenAI API key
 * @param {string} userModel - User's preferred model
 * @param {boolean} forceRefresh - Force regeneration
 * @returns {Promise<Array>} Array of task suggestions
 */
const generateTaskSuggestions = async (recentCommits, repositoryId, userApiKey, userModel = 'gpt-4o-mini', forceRefresh = false) => {
  await init();
  return await TaskSuggester.generateTaskSuggestions(recentCommits, repositoryId, userApiKey, userModel, forceRefresh);
};

/**
 * Suggest improved commit message
 * Delegates to CommitAnalyzer functional module
 * @param {string} diffContent - Diff content for analysis
 * @param {string} userApiKey - User's OpenAI API key
 * @param {string} userModel - User's preferred model
 * @param {string} currentMessage - Current commit message
 * @param {string} repositoryId - Repository identifier
 * @returns {Promise<Object>} Commit message suggestion
 */
const suggestCommitMessage = async (diffContent, userApiKey, userModel = 'gpt-4o-mini', currentMessage = '', repositoryId = null) => {
  await init();
  return await CommitAnalyzer.suggestCommitMessage(diffContent, userApiKey, userModel, currentMessage, repositoryId);
};

/**
 * Get analysis history for a repository
 * Delegates to CommitAnalyzer functional module
 * @param {string} repositoryId - Repository identifier
 * @param {number} days - Number of days to look back
 * @returns {Promise<Array>} Historical analysis data
 */
const getAnalysisHistory = async (repositoryId, days = 30) => {
  await init();
  return await CommitAnalyzer.getCommitAnalysisHistory(repositoryId, days);
};

/**
 * Analyze code quality for commits
 * Uses existing QualityAnalyzer class (maintains compatibility)
 * @param {Array} commits - Array of commits
 * @param {string} repositoryId - Repository identifier
 * @param {string} userApiKey - User's OpenAI API key
 * @param {string} userModel - User's preferred model
 * @param {string} timeframe - Analysis timeframe
 * @param {string} repositoryFullName - Full repository name
 * @param {boolean} forceRefresh - Whether to bypass cache and force fresh analysis
 * @returns {Promise<Object>} Quality analysis results
 */
const analyzeCodeQuality = async (commits, repositoryId, userApiKey, userModel = 'gpt-4o-mini', timeframe = 'weekly', repositoryFullName = null, forceRefresh = false) => {
  await init();
  
  // Create quality analyzer with user-specific API key (existing class-based approach)
  const openai = createOpenAIClient(userApiKey, userModel);
  const { callOpenAI } = await import('./OpenAIClientManager.js');
  const { default: PromptBuilder } = await import('../prompts/PromptBuilder.js');
  
  const promptBuilder = new PromptBuilder();
  const qualityAnalyzer = new QualityAnalyzer(
    openai, 
    (prompt) => callOpenAI(prompt, userApiKey, userModel), 
    promptBuilder, 
    githubService,
    userModel // Pass the model for dynamic diff sizing
  );
  
  return await qualityAnalyzer.analyzeCodeQuality(commits, repositoryId, timeframe, repositoryFullName, forceRefresh);
};

/**
 * Get quality trends over time
 * Uses existing QualityAnalyzer class (maintains compatibility)
 * @param {string} repositoryId - Repository identifier
 * @param {string} userApiKey - User's OpenAI API key
 * @param {string} userModel - User's preferred model
 * @param {number} days - Number of days to analyze
 * @returns {Promise<Object>} Quality trends data
 */
const getQualityTrends = async (repositoryId, userApiKey, userModel = 'gpt-4o-mini', days = 30) => {
  await init();
  
  // Create quality analyzer with user-specific API key (existing class-based approach)
  const openai = createOpenAIClient(userApiKey, userModel);
  const { callOpenAI } = await import('./OpenAIClientManager.js');
  const { default: PromptBuilder } = await import('../prompts/PromptBuilder.js');
  
  const promptBuilder = new PromptBuilder();
  const qualityAnalyzer = new QualityAnalyzer(
    openai, 
    (prompt) => callOpenAI(prompt, userApiKey, userModel), 
    promptBuilder, 
    githubService
  );
  
  return await qualityAnalyzer.getQualityTrends(repositoryId, days);
};

/**
 * Analyze individual commit diff with AI
 * Delegates to CommitAnalyzer functional module
 * @param {Object} commit - Commit object
 * @param {string} diff - Diff content
 * @param {string} userApiKey - User's OpenAI API key
 * @param {string} userModel - User's preferred model
 * @returns {Promise<Object>} Commit analysis result
 */
const analyzeCommitDiff = async (commit, diff, userApiKey, userModel = 'gpt-4o-mini') => {
  await init();
  return await CommitAnalyzer.analyzeCommitDiff(commit, diff, userApiKey, userModel);
};

/**
 * Additional utility functions for backwards compatibility and convenience
 */

/**
 * Get summary history for a repository
 * @param {string} repositoryId - Repository identifier
 * @param {number} days - Number of days to look back
 * @returns {Promise<Array>} Historical summaries
 */
const getSummaryHistory = async (repositoryId, days = 30) => {
  await init();
  return await SummaryGenerator.getSummaryHistory(repositoryId, days);
};

/**
 * Get task suggestion history for a repository
 * @param {string} repositoryId - Repository identifier
 * @param {number} days - Number of days to look back
 * @returns {Promise<Array>} Historical task suggestions
 */
const getTaskHistory = async (repositoryId, days = 7) => {
  await init();
  return await TaskSuggester.getTaskHistory(repositoryId, days);
};

/**
 * Clean up old data across all AI services
 * @param {number} days - Days to keep
 * @returns {Promise<Object>} Cleanup statistics
 */
const cleanupOldData = async (days = 90) => {
  await init();
  
  const [summariesDeleted, tasksDeleted] = await Promise.all([
    SummaryGenerator.cleanupOldSummaries(days),
    TaskSuggester.cleanupOldTaskSuggestions(days)
  ]);
  
  return {
    summariesDeleted,
    tasksDeleted,
    totalDeleted: summariesDeleted + tasksDeleted
  };
};

/**
 * Export singleton instance with all methods
 * Maintains backwards compatibility with existing code
 */
const AIService = {
  // Core functionality
  categorizeCommits,
  generateDailySummary,
  generateTaskSuggestions,
  suggestCommitMessage,
  analyzeCommitDiff,
  
  // Quality analysis (existing QualityAnalyzer integration)
  analyzeCodeQuality,
  getQualityTrends,
  
  // History and analytics
  getAnalysisHistory,
  getSummaryHistory,
  getTaskHistory,
  
  // Utility functions
  setGitHubService,
  cleanupOldData,
  
  // Internal properties for backwards compatibility
  initialized: () => initialized,
  githubService: () => githubService
};

export default AIService; 