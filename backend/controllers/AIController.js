import AIService from '../services/ai.js';
import { createServerError } from '../utils/errors.js';

/**
 * AI Controller
 * Exposes AI-powered development analytics endpoints
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
        const err = createServerError('Commits array is required', 'AI analysis');
        return next(err);
      }

      const analysis = await AIService.categorizeCommits(commits);
      
      res.json({
        success: true,
        data: analysis,
        meta: {
          totalCommits: analysis.length,
          categories: AIController._categorizeResults(analysis)
        }
      });
    } catch (error) {
      const err = createServerError('Failed to analyze commits', 'AI analysis', error);
      next(err);
    }
  }

  /**
   * Generate daily development summary
   * POST /api/ai/daily-summary
   */
  static async generateDailySummary(req, res, next) {
    try {
      const { commits, repositoryId, date } = req.body;
      
      if (!commits || !repositoryId) {
        const err = createServerError('Commits and repositoryId are required', 'Daily summary');
        return next(err);
      }

      const summary = await AIService.generateDailySummary(
        commits, 
        repositoryId, 
        date ? new Date(date) : new Date()
      );
      
      res.json({
        success: true,
        data: {
          summary,
          date: date || new Date().toISOString().split('T')[0],
          commitCount: commits.length
        }
      });
    } catch (error) {
      const err = createServerError('Failed to generate daily summary', 'Daily summary', error);
      next(err);
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
        const err = createServerError('Recent commits and repositoryId are required', 'Task suggestions');
        return next(err);
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
      const err = createServerError('Failed to generate task suggestions', 'Task suggestions', error);
      next(err);
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
        const err = createServerError('Repository ID is required', 'Analysis history');
        return next(err);
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
      const err = createServerError('Failed to retrieve analysis history', 'Analysis history', error);
      next(err);
    }
  }

  /**
   * Get comprehensive dashboard analytics
   * POST /api/ai/dashboard-analytics
   */
  static async getDashboardAnalytics(req, res, next) {
    try {
      const { commits, repositoryId } = req.body;
      
      if (!commits || !repositoryId) {
        const err = createServerError('Commits and repositoryId are required', 'Dashboard analytics');
        return next(err);
      }

      // Run all AI analyses in parallel for performance
      const [analysis, summary, tasks] = await Promise.all([
        AIService.categorizeCommits(commits),
        AIService.generateDailySummary(commits, repositoryId),
        AIService.generateTaskSuggestions(commits.slice(0, 10), repositoryId)
      ]);

      res.json({
        success: true,
        data: {
          commitAnalysis: analysis,
          dailySummary: summary,
          taskSuggestions: tasks,
          insights: {
            totalCommits: analysis.length,
            categories: AIController._categorizeResults(analysis),
            productivity: AIController._calculateProductivityMetrics(analysis)
          }
        }
      });
    } catch (error) {
      const err = createServerError('Failed to generate dashboard analytics', 'Dashboard analytics', error);
      next(err);
    }
  }

  // Helper methods
  static _categorizeResults(analysis) {
    return analysis.reduce((acc, commit) => {
      acc[commit.category] = (acc[commit.category] || 0) + 1;
      return acc;
    }, {});
  }

  static _calculateProductivityMetrics(analysis) {
    const categories = AIController._categorizeResults(analysis);
    const total = analysis.length;
    
    return {
      featureWork: Math.round((categories.feature || 0) / total * 100),
      bugfixes: Math.round((categories.bugfix || 0) / total * 100),
      codeQuality: Math.round((categories.refactor || 0) / total * 100),
      documentation: Math.round((categories.docs || 0) / total * 100)
    };
  }
}

export default AIController; 