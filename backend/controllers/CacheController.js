import CacheManager from '../services/external/CacheManager.js';
import { createValidationError, createServerError } from '../utils/errors.js';

/**
 * Cache Controller
 * Handles cache management operations for various data types
 * Follows Single Responsibility Principle
 */
class CacheController {
  /**
   * Clear enhanced commits cache for a specific repository
   * DELETE /api/cache/repos/:owner/:repo/commits
   */
  static async clearCommitsCache(req, res, next) {
    try {
      const { owner, repo } = req.params;
      
      // Validate required parameters
      if (!owner || !repo) {
        const err = createValidationError('owner and repo parameters are required');
        return next(err);
      }
      
      const cacheManager = new CacheManager();
      await cacheManager.clearEnhancedCommitsCache(owner, repo);
      
      console.log(`🗑️ Cleared commits cache for ${owner}/${repo}`);
      
      res.json({
        success: true,
        message: `Commits cache cleared for ${owner}/${repo}`,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error(`❌ Error clearing commits cache for ${req.params.owner}/${req.params.repo}:`, error);
      const err = createServerError('Failed to clear commits cache', `repo: ${req.params.owner}/${req.params.repo}`);
      return next(err);
    }
  }

  /**
   * Clear quality analysis cache for a specific repository
   * DELETE /api/cache/repos/:owner/:repo/quality
   */
  static async clearQualityCache(req, res, next) {
    try {
      const { owner, repo } = req.params;
      
      // Validate required parameters
      if (!owner || !repo) {
        const err = createValidationError('owner and repo parameters are required');
        return next(err);
      }
      
      const cacheManager = new CacheManager();
      await cacheManager.clearQualityAnalysisCache(owner, repo);
      
      console.log(`🗑️ Cleared quality analysis cache for ${owner}/${repo}`);
      
      res.json({
        success: true,
        message: `Quality analysis cache cleared for ${owner}/${repo}`,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error(`❌ Error clearing quality cache for ${req.params.owner}/${req.params.repo}:`, error);
      const err = createServerError('Failed to clear quality analysis cache', `repo: ${req.params.owner}/${req.params.repo}`);
      return next(err);
    }
  }

  /**
   * Clear all cache for a specific repository
   * DELETE /api/cache/repos/:owner/:repo/all
   */
  static async clearAllRepositoryCache(req, res, next) {
    try {
      const { owner, repo } = req.params;
      
      // Validate required parameters
      if (!owner || !repo) {
        const err = createValidationError('owner and repo parameters are required');
        return next(err);
      }
      
      const cacheManager = new CacheManager();
      
      // Clear all cache types for this repository
      await Promise.all([
        cacheManager.clearEnhancedCommitsCache(owner, repo),
        cacheManager.clearQualityAnalysisCache(owner, repo)
      ]);
      
      console.log(`🗑️ Cleared all cache for ${owner}/${repo}`);
      
      res.json({
        success: true,
        message: `All cache cleared for ${owner}/${repo}`,
        timestamp: new Date().toISOString(),
        clearedTypes: ['commits', 'quality-analysis']
      });
    } catch (error) {
      console.error(`❌ Error clearing all cache for ${req.params.owner}/${req.params.repo}:`, error);
      const err = createServerError('Failed to clear repository cache', `repo: ${req.params.owner}/${req.params.repo}`);
      return next(err);
    }
  }
}

export default CacheController; 