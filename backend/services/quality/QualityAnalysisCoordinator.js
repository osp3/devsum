import { parseCodeAnalysisResponse } from './QualityResponseParser.js';
import { 
  enhanceQualityAnalysis, 
  combineMessageAndCodeAnalysis,
  calculateCodeQualityScore,
  summarizeCodeAnalysis 
} from './QualityMetricsCalculator.js';
import { 
  generateCacheKey,
  getCachedQualityAnalysis,
  storeQualityAnalysis,
  getQualityHistory,
  clearQualityCache 
} from './QualityDataStorage.js';
import { 
  analyzeCommitMessages,
  createFallbackMessageAnalysis 
} from './QualityMessageAnalyzer.js';

/**
 * Quality Analysis Coordinator - Functional Pattern
 * Main orchestrator for all quality analysis operations
 * Delegates to specialized functional modules while maintaining backwards compatibility
 */

/**
 * Calculate maximum diff size based on model capabilities
 * Different models have different context limits, so we adjust accordingly
 * @param {string} model - The AI model being used
 * @returns {number} Maximum diff size in characters
 */
const getMaxDiffSizeForModel = (model = 'gpt-4o-mini') => {
  const modelLimits = {
    // GPT-4o models - highest context limit
    'gpt-4o': 20000,           // ~20KB for latest model
    'gpt-4o-mini': 15000,      // ~15KB for mini variant
    
    // GPT-4 Turbo models - high context limit  
    'gpt-4-turbo': 18000,      // ~18KB for turbo
    'gpt-4-turbo-preview': 18000,
    
    // Standard GPT-4 - medium context limit
    'gpt-4': 12000,            // ~12KB for standard GPT-4
    'gpt-4-32k': 25000,        // ~25KB for 32k variant (if available)
    
    // GPT-3.5 models - lower context limit
    'gpt-3.5-turbo': 8000,     // ~8KB for cost-effective option
    'gpt-3.5-turbo-16k': 12000 // ~12KB for 16k variant
  };

  const maxSize = modelLimits[model] || 5000; // Default fallback
  console.log(`📏 Using max diff size of ${maxSize} chars for model: ${model}`);
  return maxSize;
};

/**
 * Analyze code quality for commits with comprehensive analysis
 * @param {Array} commits - Array of commit objects
 * @param {string} repositoryId - Repository identifier
 * @param {string} timeframe - Analysis timeframe (default: 'weekly')
 * @param {string} repositoryFullName - Full repository name (optional)
 * @param {Object} options - Analysis options
 * @returns {Promise<Object>} Quality analysis results
 */
export const analyzeCodeQuality = async (commits, repositoryId, timeframe = 'weekly', repositoryFullName = null, options = {}) => {
  const {
    openaiClient,
    callOpenAI,
    promptBuilder,
    githubService,
    forceRefresh = false,
    model = 'gpt-4o-mini' // Add model parameter to options
  } = options;

  console.log(`🔍 Enhanced code quality analysis for ${commits.length} commits using model: ${model}...`);

  try {
    // STEP 1: Check cache first (save money on repeated analysis)
    console.log(`📦 Quality analysis request for ${repositoryId} (forceRefresh: ${forceRefresh})`);
    
    if (!forceRefresh) {
      const cacheKey = generateCacheKey(commits, repositoryId, timeframe);
      console.log(`🔍 Checking cache before calling OpenAI...`);
      
      const cached = await getCachedQualityAnalysis(repositoryId, cacheKey);
      if (cached) {
        console.log(`🎉 Cache hit! Returning cached analysis (no OpenAI call needed)`);
        return cached;
      }
    } else {
      console.log(`🔄 Force refresh requested - bypassing cache completely`);
    }
    
    console.log(`🤖 Cache miss! Calling OpenAI for fresh analysis of ${repositoryId}...`);

    // STEP 2: Choose analysis method based on available data
    let qualityData;
    if (repositoryFullName && githubService) {
      console.log('🔍 Running ENHANCED analysis with code diffs...');
      qualityData = await analyzeCommitsWithDiffs(commits, repositoryFullName, githubService, callOpenAI, promptBuilder, model);
    } else {
      console.log('📝 Running message-only analysis (no repository info)...');
      qualityData = await analyzeCommitMessages(commits, callOpenAI, promptBuilder);
    }
    
    // STEP 3: Add our calculated metrics to AI insights
    const enhancedQuality = enhanceQualityAnalysis(qualityData, commits);
    
    // STEP 4: Store for future caching and historical trends
    const today = new Date().toISOString().split('T')[0];
    const cacheKey = generateCacheKey(commits, repositoryId, timeframe);
    console.log(`💾 Caching fresh OpenAI analysis for future requests...`);
    const storedAnalysis = await storeQualityAnalysis(enhancedQuality, repositoryId, today, cacheKey);
    console.log(`✅ Fresh analysis cached! Next request will use cache (4-hour window)`);
    
    return storedAnalysis || enhancedQuality;

  } catch (error) {
    console.error('❌ Enhanced quality analysis failed:', error.message);
    return createFallbackQualityAnalysis(commits, repositoryId);
  }
};

/**
 * Get quality trends over time
 * @param {string} repositoryId - Repository identifier
 * @param {number} days - Number of days to analyze (default: 30)
 * @returns {Promise<Object>} Quality trends analysis
 */
export const getQualityTrends = async (repositoryId, days = 30) => {
  console.log(`📊 Analyzing quality trends for last ${days} days...`);

  try {
    // Get historical data from database
    const qualityHistory = await getQualityHistory(repositoryId, days);

    // Need data to analyze trends
    if (qualityHistory.length === 0) {
      return {
        trend: 'insufficient_data',
        message: 'Need more historical data to analyze trends',
        suggestions: ['Run quality analysis for a few more days to see trends']
      };
    }

    // Calculate trend directions/insights
    const trends = calculateQualityTrends(qualityHistory);

    return {
      trend: trends.direction, // (improving, declining, stable)
      currentScore: qualityHistory[qualityHistory.length - 1]?.qualityScore || 0,
      averageScore: trends.averageScore,
      scoreChange: trends.scoreChange,
      historicalData: qualityHistory.map(q => ({
        date: q.analysisDate,
        score: q.qualityScore,
        issueCount: q.issues.length
      })),
      insights: trends.insights,
      recommendations: trends.recommendations
    };
    
  } catch (error) {
    console.error('❌ Quality trends analysis failed:', error.message);
    return {
      trend: 'error',
      message: 'Unable to analyze quality trends',
      suggestions: ['Check your commit history and try again']
    };
  }
};

/**
 * Analyze commits with code diffs (enhanced analysis)
 * @param {Array} commits - Array of commit objects
 * @param {string} repositoryFullName - Full repository name
 * @param {Object} githubService - GitHub service instance
 * @param {Function} callOpenAI - OpenAI API function
 * @param {Object} promptBuilder - Prompt builder instance
 * @returns {Promise<Object>} Enhanced analysis results
 */
const analyzeCommitsWithDiffs = async (commits, repositoryFullName, githubService, callOpenAI, promptBuilder, model) => {
  console.log(`🔍 Enhanced analysis: ${commits.length} commits + code diffs`);
  
  try {
    // STEP 1: Analyze commit messages (all commits - fast and cheap)
    const messageAnalysis = await analyzeCommitMessages(commits, callOpenAI, promptBuilder);
    
    // STEP 2: Smart selection of commits for expensive code analysis
    const commitsForCodeAnalysis = selectCommitsForCodeAnalysis(commits);
    console.log(`📋 Selected ${commitsForCodeAnalysis.length} commits for code analysis`);
    
    // STEP 3: Get diffs and analyze code changes
    const codeAnalysis = await analyzeCodeChanges(commitsForCodeAnalysis, repositoryFullName, githubService, callOpenAI, promptBuilder, model);
    
    // STEP 4: Combine message and code insights
    return combineMessageAndCodeAnalysis(messageAnalysis, codeAnalysis);
    
  } catch (error) {
    console.error('❌ Enhanced analysis failed:', error.message);
    // Graceful fallback to message-only analysis
    return await analyzeCommitMessages(commits, callOpenAI, promptBuilder);
  }
};

/**
 * Select commits for expensive code analysis
 * @param {Array} commits - All commits
 * @returns {Array} Selected commits for code analysis
 */
const selectCommitsForCodeAnalysis = (commits) => {
  // For now, analyze all commits for comprehensive insights
  // In production, implement smart selection based on:
  // - Recent commits (most relevant)
  // - Concerning commit messages (potential issues)
  // - Security-related commits (high impact)
  return commits;
};

/**
 * Analyze code changes for selected commits
 * @param {Array} commits - Selected commits
 * @param {string} repositoryFullName - Full repository name
 * @param {Object} githubService - GitHub service instance
 * @param {Function} callOpenAI - OpenAI API function
 * @param {Object} promptBuilder - Prompt builder instance
 * @returns {Promise<Object>} Code analysis results
 */
const analyzeCodeChanges = async (commits, repositoryFullName, githubService, callOpenAI, promptBuilder, model) => {
  const codeInsights = [];
  let totalLinesAnalyzed = 0;
  
  for (const commit of commits) {
    try {
      // Get the actual code diff
      const diff = await getCommitDiff(commit.sha, repositoryFullName, githubService, model);
      
      if (!diff) {
        console.log(`⏭️ Skipping code analysis for ${commit.sha.slice(0, 8)} - no diff available`);
        continue;
      }
      
      // Count lines for metrics
      const lineCount = diff.split('\n').length;
      totalLinesAnalyzed += lineCount;
      
      // Send this commit's code changes to AI
      const codeAnalysis = await analyzeIndividualCommitCode(commit, diff, callOpenAI, promptBuilder, model);
      
      // Validate and add to insights
      if (codeAnalysis && typeof codeAnalysis === 'object') {
        const insightData = {
          commitSha: String(commit.sha),
          commitMessage: String(commit.message),
          linesChanged: Number(lineCount),
          analysis: codeAnalysis
        };
        
        console.log(`📊 Adding code insight for commit ${commit.sha.slice(0, 8)}`);
        codeInsights.push(insightData);
      } else {
        console.warn(`⚠️ Invalid analysis structure for commit ${commit.sha.slice(0, 8)}, skipping`);
      }
      
    } catch (error) {
      console.error(`❌ Code analysis failed for ${commit.sha.slice(0, 8)}:`, error.message);
      // Continue with other commits
    }
  }
  
  return {
    commitsAnalyzed: commits.length,
    totalLinesAnalyzed: totalLinesAnalyzed,
    insights: codeInsights,
    summary: summarizeCodeAnalysis(codeInsights)
  };
};

/**
 * Get commit diff for analysis
 * @param {string} commitSha - Commit SHA
 * @param {string} repositoryFullName - Full repository name
 * @param {Object} githubService - GitHub service instance
 * @param {string} model - AI model for dynamic sizing
 * @returns {Promise<string|null>} Diff content or null
 */
const getCommitDiff = async (commitSha, repositoryFullName, githubService, model) => {
  try {
    console.log(`📥 Fetching diff for commit ${commitSha.slice(0, 8)}...`);
    
    if (!githubService) {
      console.error('❌ GitHubService not available for authenticated API calls');
      return null;
    }
    
    // Parse repository full name
    const [owner, repo] = repositoryFullName.split('/');
    if (!owner || !repo) {
      console.error(`❌ Invalid repository format: ${repositoryFullName}`);
      return null;
    }
    
    // Use authenticated GitHubService
    const commitData = await githubService.getCommitDiff(owner, repo, commitSha);
    
    // Extract diff content from files
    const diff = commitData.files
      .map(file => file.patch || '')
      .filter(patch => patch.length > 0)
      .join('\n');
    
    if (!diff || diff.trim().length === 0) {
      console.log(`⚠️ No diff content available for commit ${commitSha.slice(0, 8)}`);
      return null;
    }
    
    // COST CONTROL: Limit diff size to prevent massive AI costs
    const maxDiffSize = getMaxDiffSizeForModel(model); // Use the new function
    if (diff.length > maxDiffSize) {
      console.log(`✂️ Diff too large (${diff.length} chars), truncating to ${maxDiffSize}`);
      return diff.slice(0, maxDiffSize) + '\n\n... (diff truncated for analysis)';
    }
    
    return diff;
    
  } catch (error) {
    console.error(`❌ Failed to fetch diff for ${commitSha}:`, error.message);
    return null;
  }
};

/**
 * Analyze individual commit code with AI
 * @param {Object} commit - Commit object
 * @param {string} diff - Diff content
 * @param {Function} callOpenAI - OpenAI API function
 * @param {Object} promptBuilder - Prompt builder instance
 * @returns {Promise<Object>} Code analysis result
 */
const analyzeIndividualCommitCode = async (commit, diff, callOpenAI, promptBuilder, model) => {
  try {
    console.log(`🤖 AI Code Quality: Analyzing code diff for commit ${commit.sha.slice(0, 8)} (${diff.split('\n').length} lines)`);
    const prompt = promptBuilder.createCodeAnalysisPrompt(commit, diff);
    const aiResponse = await callOpenAI(prompt);
    return parseCodeAnalysisResponse(aiResponse);
    
  } catch (error) {
    console.error(`❌ AI code analysis failed for ${commit.sha.slice(0, 8)}:`, error.message);
    return createFallbackCodeAnalysis(commit, diff);
  }
};

/**
 * Create fallback code analysis when AI fails
 * @param {Object} commit - Commit object
 * @param {string} diff - Diff content
 * @returns {Object} Fallback analysis
 */
const createFallbackCodeAnalysis = (commit, diff) => {
  const lines = diff.split('\n');
  const addedLines = lines.filter(line => line.startsWith('+')).length;
  const removedLines = lines.filter(line => line.startsWith('-')).length;
  
  // Simple heuristics when AI fails
  const issues = [];
  if (diff.includes('console.log')) {
    issues.push({
      type: 'quality',
      severity: 'low',
      line: 'multiple',
      description: 'Debug console.log statements detected',
      suggestion: 'Remove debug statements before production',
      example: ''
    });
  }
  
  if (diff.includes('TODO') || diff.includes('FIXME')) {
    issues.push({
      type: 'maintainability',
      severity: 'medium', 
      line: 'multiple',
      description: 'TODO/FIXME comments added',
      suggestion: 'Address TODO items or create tickets for them',
      example: ''
    });
  }
  
  return {
    severity: issues.length > 0 ? 'medium' : 'low',
    issues: issues,
    positives: addedLines > removedLines ? ['Code additions detected'] : [],
    overallAssessment: `${addedLines} lines added, ${removedLines} lines removed`,
    recommendedActions: issues.length > 0 ? ['Address identified issues'] : ['Code looks clean']
  };
};

/**
 * Create fallback quality analysis when everything fails
 * @param {Array} commits - Array of commits
 * @param {string} repositoryId - Repository identifier
 * @returns {Object} Fallback analysis
 */
const createFallbackQualityAnalysis = (commits, repositoryId) => {
  console.log('⚡ Using fallback quality analysis');
  return createFallbackMessageAnalysis(commits);
};

/**
 * Calculate quality trends from historical data
 * @param {Array} qualityHistory - Historical quality data
 * @returns {Object} Trend analysis
 */
const calculateQualityTrends = (qualityHistory) => {
  if (qualityHistory.length < 2) {
    return {
      direction: 'insufficient_data',
      scoreChange: 0,
      averageScore: qualityHistory[0]?.qualityScore || 0.5,
      insights: ['Need more data points to determine trends'],
      recommendations: ['Continue daily quality monitoring']
    };
  }

  const scores = qualityHistory.map(q => q.qualityScore);
  const recent = scores.slice(-7);
  const older = scores.slice(0, Math.max(1, scores.length - 7));
  
  const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
  const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
  const change = recentAvg - olderAvg;
  
  let direction = 'stable';
  if (change > 0.05) direction = 'improving';
  else if (change < -0.05) direction = 'declining';
  
  return {
    direction: direction,
    scoreChange: Math.round(change * 1000) / 1000,
    averageScore: Math.round(recentAvg * 1000) / 1000,
    insights: [
      `Quality trend is ${direction}`,
      `Average score: ${Math.round(recentAvg * 100)}%`,
      change > 0 ? 'Quality improvements detected' : change < 0 ? 'Quality concerns detected' : 'Quality remains stable'
    ],
    recommendations: direction === 'declining' ? [
      'Review recent commits for quality issues',
      'Consider implementing code review practices',
      'Focus on addressing technical debt'
    ] : [
      'Continue current development practices',
      'Monitor for any quality regressions',
      'Consider sharing best practices with team'
    ]
  };
}; 