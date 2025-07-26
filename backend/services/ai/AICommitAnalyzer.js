import connectDB from '../../config/database.js';
import PromptBuilder from '../prompts/PromptBuilder.js';
import CacheManager from '../external/CacheManager.js';
import { CommitAnalysis } from '../../models/aiModels.js';
import { callOpenAI, defaultOptions } from './OpenAIClientManager.js';
import { parseCommitAnalysis, parseCategorizationResponse, cleanCommitSuggestion } from './AIResponseParser.js';
import { categorizeCommits as fallbackCategorize, suggestCommitMessage as fallbackSuggest, analyzeCommitDiff as fallbackAnalyze, isMessageImproved } from './AIFallbackStrategies.js';

/**
 * Commit Analyzer - Functional Pattern
 * Handles commit categorization, analysis, and message suggestions
 */

let initialized = false;
let promptBuilder = null;
let cacheManager = null;

/**
 * Initialize the analyzer (lazy initialization)
 */
const init = async () => {
  if (!initialized) {
    await connectDB();
    promptBuilder = new PromptBuilder();
    cacheManager = new CacheManager();
    initialized = true;
    console.log('Commit Analyzer initialized');
  }
};

/**
 * Categorize commits with AI analysis and caching
 * @param {Array} commits - Array of commit objects
 * @param {string} userApiKey - User's OpenAI API key
 * @param {string} userModel - User's preferred model
 * @returns {Promise<Array>} Commits with categorization
 */
export const categorizeCommits = async (commits, userApiKey, userModel = 'gpt-4o-mini') => {
  await init();
  console.log(`Analyzing ${commits.length} commits with user's API key...`);

  try {
    // Step 1: Cache lookup - check analyzed commits
    const commitHashes = commits.map(c => c.sha);
    const existingAnalysis = await CommitAnalysis.find({ 
      commitHash: { $in: commitHashes }
    }).lean();

    // Step 2: Create lookup map for fast access
    const analyzed = new Map();
    existingAnalysis.forEach(result => {
      analyzed.set(result.commitHash, result);
    });

    // Step 3: Identify unanalyzed commits
    const unanalyzedCommits = commits.filter(commit => !analyzed.has(commit.sha));
    console.log(`Found ${existingAnalysis.length} cached, analyzing ${unanalyzedCommits.length} new commits`);

    // Step 4: AI analysis for new commits only
    let newAnalysis = [];
    if (unanalyzedCommits.length > 0) {
      newAnalysis = await analyzeWithAI(unanalyzedCommits, userApiKey, userModel);
      
      // Step 5: Store new analysis in cache
      await cacheManager.storeAnalysis(newAnalysis);
    }

    // Step 6: Merge cached and new results
    const allResults = commits.map(commit => {
      const cached = analyzed.get(commit.sha);
      if (cached) {
        return {
          ...commit,
          category: cached.category,
          confidence: cached.confidence,
          aiReason: cached.reason,
          analyzedAt: cached.analyzedAt
        };
      }
      const fresh = newAnalysis.find(a => a.sha === commit.sha);
      return fresh || { ...commit, category: 'other', confidence: 0.5 };
    });

    console.log(`Analysis complete: ${allResults.length} commits categorized`);
    return allResults;
  } catch (error) {
    console.error('AI commit categorization failed:', error.message);
    return fallbackCategorize(commits);
  }
};

/**
 * Analyze individual commit diff with AI
 * @param {Object} commit - Commit object
 * @param {string} diff - Diff content
 * @param {string} userApiKey - User's OpenAI API key
 * @param {string} userModel - User's preferred model
 * @returns {Promise<Object>} Commit analysis result
 */
export const analyzeCommitDiff = async (commit, diff, userApiKey, userModel = 'gpt-4o-mini') => {
  await init();
  console.log(`🔍 AI Diff Analysis: Analyzing commit ${commit.sha?.substring(0, 7)} (diff: ${diff.length} chars)`);

  try {
    const prompt = promptBuilder.createCommitAnalysisPrompt(commit, diff);
    const analysis = await callOpenAI(prompt, userApiKey, userModel, defaultOptions.commitAnalysis);
    const parsedAnalysis = parseCommitAnalysis(analysis);

    console.log(`Analysis complete for ${commit.sha?.substring(0, 7)}: ${parsedAnalysis.suggestedMessage}`);
    
    return {
      diffSize: diff.length,
      suggestedMessage: parsedAnalysis.suggestedMessage,
      suggestedDescription: parsedAnalysis.description,
      commitAnalysis: parsedAnalysis.analysis,
      confidence: parsedAnalysis.confidence,
      analysisDate: new Date().toISOString()
    };
  } catch (error) {
    console.error(`Failed to analyze commit ${commit.sha?.substring(0, 7)}:`, error.message);
    return fallbackAnalyze(commit, diff);
  }
};

/**
 * Suggest improved commit message
 * @param {string} diffContent - Diff content for analysis
 * @param {string} userApiKey - User's OpenAI API key
 * @param {string} userModel - User's preferred model
 * @param {string} currentMessage - Current commit message
 * @param {string} repositoryId - Repository identifier
 * @returns {Promise<Object>} Commit message suggestion
 */
export const suggestCommitMessage = async (diffContent, userApiKey, userModel = 'gpt-4o-mini', currentMessage = '', repositoryId = null) => {
  await init();
  console.log(`💬 AI Commit: Suggesting commit message (diff: ${diffContent.length} chars, original: "${currentMessage || 'none'}")`);

  try {
    const prompt = promptBuilder.createCommitMessagePrompt(diffContent, currentMessage);
    const suggestion = await callOpenAI(prompt, userApiKey, userModel, defaultOptions.commitAnalysis);
    const cleanSuggestion = cleanCommitSuggestion(suggestion);
    const improved = isMessageImproved(currentMessage, cleanSuggestion);

    console.log(`Suggestion generated: "${cleanSuggestion}"`);

    return {
      original: currentMessage,
      suggested: cleanSuggestion,
      improved: improved,
      analysis: {
        diffSize: diffContent.length,
        hasOriginal: !!currentMessage,
        generatedAt: new Date().toISOString()
      }
    };
  } catch (error) {
    console.error('Commit message suggestion failed:', error.message);
    return fallbackSuggest(currentMessage, diffContent);
  }
};

/**
 * Private function to analyze commits with AI
 * @param {Array} commits - Commits to analyze
 * @param {string} userApiKey - User's OpenAI API key
 * @param {string} userModel - User's preferred model
 * @returns {Promise<Array>} Analysis results
 */
const analyzeWithAI = async (commits, userApiKey, userModel) => {
  console.log(`🔍 AI Analysis: Categorizing ${commits.length} commits`);
  const prompt = promptBuilder.createCategorizationPrompt(commits);
  const aiResponse = await callOpenAI(prompt, userApiKey, userModel, defaultOptions.commitAnalysis);

  try {
    return parseCategorizationResponse(commits, aiResponse);
  } catch (error) {
    console.error('Failed to parse AI categorization response:', error.message);
    return fallbackCategorize(commits);
  }
};

/**
 * Get commit analysis history for a repository
 * @param {string} repositoryId - Repository identifier
 * @param {number} days - Number of days to look back
 * @returns {Promise<Array>} Historical analysis data
 */
export const getCommitAnalysisHistory = async (repositoryId, days = 30) => {
  await init();
  return await cacheManager.getAnalysisHistory(repositoryId, days);
}; 