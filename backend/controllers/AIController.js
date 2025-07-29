import AIService from '../services/ai/AICoordinator.js';
import GitHubService from '../services/external/GitHubAPIClient.js';
import { YesterdaySummaryService } from '../services/tasks/YesterdaySummaryService.js';
import User from '../models/User.js';

/**
 * AI Controller - Plain Functions
 * Connects routes to AI service
 */

/**
 * Get user's OpenAI settings
 * @param {Object} req - Express request object
 * @returns {Promise<Object>} User's OpenAI API key and model
 */
async function getUserOpenAISettings(req) {
  const user = await User.findById(req.user._id).select('+openaiApiKey');
  if (!user) {
    throw new Error('User not found');
  }
  
  if (!user.openaiApiKey) {
    throw new Error('No OpenAI API key configured for your account. Please add your API key in Settings.');
  }
  
  return {
    apiKey: user.openaiApiKey,
    model: user.openaiModel || 'gpt-4o-mini'
  };
}

/**
 * Analyze and categorize commits with AI
 * POST /api/ai/analyze-commits
 */
export async function analyzeCommits(req, res, next) {
  try {
    const { commits } = req.body;

    if (!commits || !Array.isArray(commits)) {
      return res.status(400).json({
        success: false,
        error: 'Commits array is required',
      });
    }

    // Get user's OpenAI settings
    const { apiKey, model } = await getUserOpenAISettings(req);

    const analysis = await AIService.categorizeCommits(commits, apiKey, model);

    // Calculate categories for meta
    const categories = analysis.reduce((acc, commit) => {
      acc[commit.category] = (acc[commit.category] || 0) + 1;
      return acc;
    }, {});

    res.json({
      success: true,
      data: analysis,
      meta: {
        totalCommits: analysis.length,
        categories,
      },
    });
  } catch (error) {
    console.error('Error analyzing commits:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to analyze commits',
    });
  }
}

/**
 * Generate daily development summary
 * POST /api/ai/daily-summary
 */
export async function generateDailySummary(req, res, next) {
  try {
    const { commits, repositoryId, date } = req.body;
    const { force } = req.query; // Allow force refresh via query parameter

    if (!commits || !repositoryId) {
      return res.status(400).json({
        success: false,
        error: 'Commits and repositoryId are required',
      });
    }

    // Get user's OpenAI settings
    const { apiKey, model } = await getUserOpenAISettings(req);

    const summary = await AIService.generateDailySummary(
      commits,
      repositoryId,
      apiKey,
      model,
      date ? new Date(date) : new Date(),
      force === 'true'
    );

    res.json({
      success: true,
      data: {
        summary,
        date: date || new Date().toISOString().split('T')[0],
        commitCount: commits.length,
      },
    });
  } catch (error) {
    console.error('Error generating daily summary:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate daily summary',
    });
  }
}

// testing stuff out my end(erik)
export async function generateYesterdaySummary(req, res, next) {
  try {
    const { force } = req.query; // Allow force refresh via query parameter
    const forceRefresh = force === 'true';
    
    console.log(`🎯 Controller: generateYesterdaySummary called with force=${forceRefresh}`);
    
    // Get user's OpenAI settings
    const { apiKey, model } = await getUserOpenAISettings(req);
    
    const summaryService = new YesterdaySummaryService(req.user.accessToken);
    const result = await summaryService.generateSummary(forceRefresh, apiKey, model);
    
    // Set cache control headers to prevent browser caching
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    
    console.log(`📤 Controller: Returning summary response to client`);
    console.log(`📤 Response summary preview: "${result.summary.substring(0, 100)}..."`);
    console.log(`📤 Response type: ${forceRefresh ? 'FORCE REFRESH' : 'NORMAL (cache enabled)'}`);
    
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('❌ Controller: Failed to generate yesterday summary:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate yesterdays summary'
    });
  }
}

/**
 * Generate task suggestions for tomorrow based on yesterday's AI analysis
 * POST /api/ai/task-suggestions
 */
export async function generateTaskSuggestions(req, res, next) {
  try {
    const { yesterdaySummary } = req.body;
    const forceRefresh = req.query.force === 'true';

    if (!yesterdaySummary) {
      return res.status(400).json({
        success: false,
        error: 'Yesterday summary is required',
      });
    }

    // Extract commits from the yesterday summary
    const commits = yesterdaySummary.formattedCommits?.allCommits || [];
    
    if (commits.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No commits found in yesterday summary',
      });
    }

    // Get user's OpenAI settings
    const { apiKey, model } = await getUserOpenAISettings(req);

    // Use 'ALL_REPOS' as identifier for cross-repository task suggestions
    const repositoryId = 'ALL_REPOS';

    const tasks = await AIService.generateTaskSuggestions(
      commits,
      repositoryId,
      apiKey,
      model,
      forceRefresh
    );

    res.json({
      success: true,
      data: {
        tasks,
        summary: yesterdaySummary.summary,
        baseData: {
          commitCount: commits.length,
          repositoryCount: yesterdaySummary.repositoryCount,
          repositories: yesterdaySummary.repositories?.map(r => r.name) || [],
          aiAnalyzedCommits: commits.filter(c => c.aiAnalysis).length
        },
        fromCache: !forceRefresh
      },
      meta: {
        baseCommitCount: commits.length,
        taskCount: tasks.length,
        aiEnhanced: commits.some(c => c.aiAnalysis),
        forceRefresh: forceRefresh
      },
    });
  } catch (error) {
    console.error('Task generation error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate task suggestions',
    });
  }
}

/**
 * Suggest improved commit message
 * POST /api/ai/suggest-commit-message
 */
export async function suggestCommitMessage(req, res, next) {
  try {
    const { diffContent, currentMessage = '', repositoryId } = req.body;

    if (!diffContent) {
      return res.status(400).json({
        success: false,
        error: 'Diff content is required',
      });
    }

    // Get user's OpenAI settings
    const { apiKey, model } = await getUserOpenAISettings(req);

    const suggestion = await AIService.suggestCommitMessage(
      diffContent,
      apiKey,
      model,
      currentMessage,
      repositoryId
    );

    res.json({
      success: true,
      data: suggestion,
      meta: {
        diffSize: diffContent.length,
        hasOriginalMessage: !!currentMessage,
        repositoryId: repositoryId || null,
      },
    });
  } catch (error) {
    console.error('Error suggesting commit message:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to suggest commit message',
    });
  }
}

/**
 * Get analysis history for repository
 * GET /api/ai/history/:repositoryId
 */
export async function getAnalysisHistory(req, res, next) {
  try {
    const { repositoryId } = req.params;
    const { days = 30 } = req.query;

    if (!repositoryId) {
      return res.status(400).json({
        success: false,
        error: 'Repository ID is required',
      });
    }

    const history = await AIService.getAnalysisHistory(
      repositoryId,
      parseInt(days)
    );

    res.json({
      success: true,
      data: history,
      meta: {
        repositoryId,
        daysRequested: parseInt(days),
        summariesFound: history.length,
      },
    });
  } catch (error) {
    console.error('Error getting analysis history:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to retrieve analysis history',
    });
  }
}

/**
 * Analyze code quality for commits
 * POST /api/ai/analyze-quality
 */
export async function analyzeCodeQuality(req, res, next) {
  try {
    const {
      commits,
      repositoryId,
      timeframe = 'weekly',
      repositoryFullName,
      forceRefresh = false
    } = req.body;

    if (!commits || !repositoryId) {
      return res.status(400).json({
        success: false,
        error: 'Commits and repositoryId are required',
      });
    }

    // Get user's OpenAI settings
    const { apiKey, model } = await getUserOpenAISettings(req);

    // Clear cache if force refresh is requested
    if (forceRefresh) {
      console.log(`🔄 Force refresh requested for ${repositoryId} quality analysis`);
      const { default: CacheManager } = await import('../services/external/CacheManager.js');
      const cacheManager = new CacheManager();
      await cacheManager.clearQualityAnalysisCache(...repositoryId.split('/'));
    }

    // Create GitHubService for authenticated API calls if repository analysis is needed
    if (repositoryFullName && req.user?.accessToken) {
      const githubService = GitHubService(req.user.accessToken); // GitHubService is now a factory function
      AIService.setGitHubService(githubService);
      console.log(`🔑 AIController: Set authenticated GitHubService for ${repositoryFullName}`);
    }

    const qualityAnalysis = await AIService.analyzeCodeQuality(
      commits,
      repositoryId,
      apiKey,
      model,
      timeframe,
      repositoryFullName,
      forceRefresh // Pass forceRefresh to bypass cache when requested
    );

    res.json({
      success: true,
      data: qualityAnalysis,
      meta: {
        commitsAnalyzed: commits.length,
        repositoryId,
        timeframe,
        hasCodeAnalysis: !!repositoryFullName,
      },
    });
  } catch (error) {
    console.error('Error analyzing code quality:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to analyze code quality',
    });
  }
}

/**
 * Get quality trends over time
 * GET /api/ai/quality-trends/:repositoryId
 */
export async function getQualityTrends(req, res, next) {
  try {
    const { repositoryId } = req.params;
    const { days = 30 } = req.query;

    if (!repositoryId) {
      return res.status(400).json({
        success: false,
        error: 'Repository ID is required',
      });
    }

    // Get user's OpenAI settings
    const { apiKey, model } = await getUserOpenAISettings(req);

    const trends = await AIService.getQualityTrends(
      repositoryId,
      apiKey,
      model,
      parseInt(days)
    );

    res.json({
      success: true,
      data: trends,
      meta: {
        repositoryId,
        daysAnalyzed: parseInt(days),
      },
    });
  } catch (error) {
    console.error('Error getting quality trends:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get quality trends',
    });
  }
}
