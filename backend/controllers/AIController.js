import aiService from '../services/ai.js';
/**
 * Minimal AI Controller
 * Basic implementations for AI routes
 */
class AIController {
  /**
   * Analyze and categorize commits with AI
   * POST /api/ai/analyze-commits
   */
  static async analyzeCommits(req, res, next) {
    try {
      const { commits } = req.body;
      
      if (!commits || !Array.isArray(commits)) {
        return res.status(400).json({
          success: false,
          error: 'Commits array is required'
        });
      }

      // AI analysis
      const analysis = await aiService.categorizeCommits(commits);

      res.json({
        success: true,
        data: analysis,
        meta: {
          totalCommits: analysis.length
        }
      });
    } catch (error) {
      console.error('AI analysis error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to analyze commits'
      });
    }
  }

  /**
   * Generate daily development summary
   * POST /api/ai/daily-summary
   */
  static async generateDailySummary(req, res, next) {
    try {
      const { commits, repositoryId } = req.body;
      
      if (!commits || !repositoryId) {
        return res.status(400).json({
          success: false,
          error: 'Commits and repositoryId are required'
        });
      }

      // AI service
      const summary = await aiService.generateDailySummary(commits, repositoryId);

      res.json({
        success: true,
        data: {
          summary,
          date: new Date().toISOString().split('T')[0],
          commitCount: commits.length
        }
      });
    } catch (error) {
      console.error('Summary generation error:', error);
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
  static async generateTaskSuggestions(req, res, next) {
    try {
      const { recentCommits, repositoryId } = req.body;
      
      if (!recentCommits || !repositoryId) {
        return res.status(400).json({
          success: false,
          error: 'Recent commits and repositoryId are required'
        });
      }

      // AI task suggestions
      const tasks = await aiService.generateTaskSuggestions(recentCommits, repositoryId);

      res.json({
        success: true,
        data: tasks,
        meta: {
          baseCommitCount: recentCommits.length,
          taskCount: tasks.length
        }
      });
    } catch (error) {
      console.error('Task generation error:', error);
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
  static async suggestCommitMessage(req, res, next) {
  try {
    const { diffContent, currentMessage = '', repositoryId } = req.body;
      
      if (!diffContent) {
        return res.status(400).json({
          success: false,
          error: 'Diff content is required'
        });
      }

      // Ai suggestion
    const result = await aiService.suggestCommitMessage(diffContent, currentMessage, repositoryId);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Commit message suggestion error:', error);
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
  static async getAnalysisHistory(req, res, next) {
    try {
      const { repositoryId } = req.params;
      const { days = 30 } = req.query;
      
      if (!repositoryId) {
        return res.status(400).json({
          success: false,
          error: 'Repository ID is required'
        });
      }

    const history = await aiService.getAnalysisHistory(repositoryId, parseInt(days));

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
    console.error('Analysis history error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve analysis history'
    });
  }
  }
}

export default AIController;