import AIService from '../services/ai.js';

/**
 * AI Controller - Plain Functions
 * Connects routes to AI service
 */

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
        error: 'Commits array is required'
      });
    }

    const analysis = await AIService.categorizeCommits(commits);

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
        categories
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to analyze commits'
    });
  }
}

/**
 * Generate daily development summary across all user repositories
 * POST /api/ai/daily-summary
 */
export async function generateDailySummary(req, res, next) {
  try {
    const { date } = req.body;
    
    // Get user info from authenticated session
    if (!req.user || !req.user.accessToken) {
      return res.status(401).json({
        success: false,
        error: 'User authentication and GitHub access token required'
      });
    }

    const targetDate = date ? new Date(date) : new Date();
    
    // Generate summary across all user repositories
    const result = await AIService.generateDailyUserSummary(
      req.user.id || req.user._id,
      req.user.accessToken,
      targetDate
    );

    res.json({
      success: true,
      data: {
        summary: result.summary,
        date: targetDate.toISOString().split('T')[0],
        commitCount: result.commitCount,
        repositoryCount: result.repositoryCount,
        repositories: result.repositories,
        formattedCommits: result.formattedCommits
      }
    });
  } catch (error) {
    console.error('Daily summary generation failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate daily summary'
    });
  }
}

/**
 * Generate task suggestions for tomorrow
 * POST /api/ai/task-suggestions
 */
export async function generateTaskSuggestions(req, res, next) {
  try {
    const { recentCommits, repositoryId } = req.body;
    
    if (!recentCommits || !repositoryId) {
      return res.status(400).json({
        success: false,
        error: 'Recent commits and repositoryId are required'
      });
    }

    const tasks = await AIService.generateTaskSuggestions(recentCommits, repositoryId);

    res.json({
      success: true,
      data: tasks,
      meta: {
        baseCommitCount: recentCommits.length,
        taskCount: tasks.length
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to generate task suggestions'
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
        error: 'Diff content is required'
      });
    }

    const suggestion = await AIService.suggestCommitMessage(diffContent, currentMessage, repositoryId);

    res.json({
      success: true,
      data: suggestion,
      meta: {
        diffSize: diffContent.length,
        hasOriginalMessage: !!currentMessage,
        repositoryId: repositoryId || null
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to suggest commit message'
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
        error: 'Repository ID is required'
      });
    }

    const history = await AIService.getAnalysisHistory(repositoryId, parseInt(days));

    res.json({
      success: true,
      data: history,
      meta: {
        repositoryId,
        daysRequested: parseInt(days),
        summariesFound: history.length
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve analysis history'
    });
  }
}

/**
 * Analyze code quality for commits
 * POST /api/ai/analyze-quality
 */
export async function analyzeCodeQuality(req, res, next) {
  try {
    const { commits, repositoryId, timeframe = 'weekly', repositoryFullName } = req.body;
    
    if (!commits || !repositoryId) {
      return res.status(400).json({
        success: false,
        error: 'Commits and repositoryId are required'
      });
    }

    const qualityAnalysis = await AIService.analyzeCodeQuality(
      commits, 
      repositoryId, 
      timeframe, 
      repositoryFullName
    );

    res.json({
      success: true,
      data: qualityAnalysis,
      meta: {
        commitsAnalyzed: commits.length,
        repositoryId,
        timeframe,
        hasCodeAnalysis: !!repositoryFullName
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to analyze code quality'
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
        error: 'Repository ID is required'
      });
    }

    const trends = await AIService.getQualityTrends(repositoryId, parseInt(days));

    res.json({
      success: true,
      data: trends,
      meta: {
        repositoryId,
        daysAnalyzed: parseInt(days)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get quality trends'
    });
  }
} 