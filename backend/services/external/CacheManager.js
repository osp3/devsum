import { CommitAnalysis, DailySummary, TaskSuggestion, QualityAnalysis, EnhancedCommitsCache } from '../../models/aiModels.js';

/**
 * Cache Manager - Functional Pattern
 * Handles caching operations for AI analysis results, summaries, and enhanced commits
 * Pure functions for reliable cache management
 * 
 * Caching Strategy:
 * - CommitAnalysis: individual commit categorization stored immediately after AI analysis
 * - Query by date ranges for trends, analysis results never change once stored
 * - Efficient batch processing for multiple commits
 * - Cost optimization: avoid duplicate expensive AI calls
 */

/**
 * Store AI analysis results in cache
 * @param {Array} analyzedCommits - Array of commits with AI analysis
 * @returns {Promise<void>}
 */
export const storeAnalysis = async (analyzedCommits) => {
  // Convert AI analysis results to MongoDB document format
  const docs = analyzedCommits.map(commit => ({
    commitHash: commit.sha, // Git SHA hash (unique per commit)
    message: commit.message, // Original commit message
    category: commit.category, // AI-determined category (feat, bugfix, etc)
    confidence: commit.confidence, // AI confidence score (0.0 to 1.0)
    reason: commit.aiReason, // AI explanation for the categorization
    date: commit.date // Commit timestamp for temporal queries
  }));

  if (docs.length > 0) {
    // Efficient batch insertion - automatically handles duplicate key conflicts
    await CommitAnalysis.insertMany(docs);
    console.log(`💾 Stored ${docs.length} analysis results in MongoDB`);
  }
};

/**
 * Get analysis history for a repository
 * @param {string} repositoryId - Repository identifier
 * @param {number} days - Number of days to look back (default: 30)
 * @returns {Promise<Array>} Array of historical analysis data
 */
export const getAnalysisHistory = async (repositoryId, days = 30) => {
  // Calculate cutoff date (current time minus specified days)
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const history = await DailySummary.find({
    repositoryId: repositoryId, // Only get data for specified repo
    createdAt: { $gte: since } // Only get data newer than cutoff date
  })
  .sort({ date: -1 }) // Most recent entries first
  .lean(); // Return plain JS objects for better performance

  return history;
};

/**
 * Get cached enhanced commits for a repository
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {number} per_page - Number of commits per page (default: 10)
 * @returns {Promise<Array|null>} Cached commits or null if not found/expired
 */
export const getCachedEnhancedCommits = async (owner, repo, per_page = 10) => {
  const cacheKey = `${owner}/${repo}:enhanced-commits:${per_page}`;
  
  try {
    const cached = await EnhancedCommitsCache.findOne({ cacheKey }).lean();
    
    if (cached && cached.expiresAt > new Date()) {
      console.log(`✅ Cache hit for ${cacheKey}`);
      return cached.commits;
    }
    
    console.log(`❌ Cache miss for ${cacheKey}`);
    return null;
  } catch (error) {
    console.error(`⚠️ Cache lookup failed for ${cacheKey}:`, error.message);
    return null;
  }
};

/**
 * Store enhanced commits in cache
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {Array} commits - Array of enhanced commits
 * @param {number} per_page - Number of commits per page (default: 10)
 * @returns {Promise<void>}
 */
export const storeEnhancedCommits = async (owner, repo, commits, per_page = 10) => {
  const cacheKey = `${owner}/${repo}:enhanced-commits:${per_page}`;
  const repositoryId = `${owner}/${repo}`;
  
  try {
    await EnhancedCommitsCache.findOneAndUpdate(
      { cacheKey },
      {
        repositoryId,
        owner,
        repo,
        commits,
        cacheKey,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000) // 30 minutes TTL
      },
      { upsert: true, new: true }
    );
    
    console.log(`✅ Cached ${commits.length} enhanced commits for ${cacheKey}`);
  } catch (error) {
    console.error(`⚠️ Failed to cache enhanced commits for ${cacheKey}:`, error.message);
  }
};

/**
 * Clear enhanced commits cache for a repository
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @returns {Promise<void>}
 */
export const clearEnhancedCommitsCache = async (owner, repo) => {
  const cachePattern = `${owner}/${repo}:enhanced-commits:`;
  
  try {
    const result = await EnhancedCommitsCache.deleteMany({
      cacheKey: { $regex: `^${cachePattern}` }
    });
    
    console.log(`🗑️ Cleared ${result.deletedCount} cached entries for ${owner}/${repo}`);
  } catch (error) {
    console.error(`⚠️ Failed to clear cache for ${owner}/${repo}:`, error.message);
  }
};

/**
 * Clear quality analysis cache for a repository
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @returns {Promise<void>}
 */
export const clearQualityAnalysisCache = async (owner, repo) => {
  const repositoryId = `${owner}/${repo}`;
  
  try {
    const result = await QualityAnalysis.deleteMany({
      repositoryId: repositoryId
    });
    
    console.log(`🗑️ Cleared ${result.deletedCount} quality analysis cache entries for ${repositoryId}`);
  } catch (error) {
    console.error(`⚠️ Failed to clear quality analysis cache for ${repositoryId}:`, error.message);
  }
};

/**
 * Clear all cache data older than specified days
 * @param {number} days - Days to keep (default: 90)
 * @returns {Promise<Object>} Statistics about cleared data
 */
export const cleanupOldCache = async (days = 90) => {
  const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  
  try {
    const [analysisResult, summariesResult, tasksResult, qualityResult, enhancedResult] = await Promise.all([
      CommitAnalysis.deleteMany({ createdAt: { $lt: cutoffDate } }),
      DailySummary.deleteMany({ createdAt: { $lt: cutoffDate } }),
      TaskSuggestion.deleteMany({ createdAt: { $lt: cutoffDate } }),
      QualityAnalysis.deleteMany({ createdAt: { $lt: cutoffDate } }),
      EnhancedCommitsCache.deleteMany({ expiresAt: { $lt: new Date() } }) // Clear expired entries
    ]);

    const totalDeleted = analysisResult.deletedCount + summariesResult.deletedCount + 
                        tasksResult.deletedCount + qualityResult.deletedCount + 
                        enhancedResult.deletedCount;

    console.log(`🧹 Cache cleanup completed: ${totalDeleted} total entries removed`);
    console.log(`   - Analysis entries: ${analysisResult.deletedCount}`);
    console.log(`   - Summary entries: ${summariesResult.deletedCount}`);
    console.log(`   - Task entries: ${tasksResult.deletedCount}`);
    console.log(`   - Quality entries: ${qualityResult.deletedCount}`);
    console.log(`   - Enhanced commits: ${enhancedResult.deletedCount}`);

    return {
      totalDeleted,
      analysisDeleted: analysisResult.deletedCount,
      summariesDeleted: summariesResult.deletedCount,
      tasksDeleted: tasksResult.deletedCount,
      qualityDeleted: qualityResult.deletedCount,
      enhancedDeleted: enhancedResult.deletedCount
    };
  } catch (error) {
    console.error('❌ Failed to cleanup old cache data:', error.message);
    return {
      totalDeleted: 0,
      analysisDeleted: 0,
      summariesDeleted: 0,
      tasksDeleted: 0,
      qualityDeleted: 0,
      enhancedDeleted: 0
    };
  }
};

/**
 * Get cache statistics for monitoring
 * @returns {Promise<Object>} Cache statistics
 */
export const getCacheStats = async () => {
  try {
    const [analysisCount, summariesCount, tasksCount, qualityCount, enhancedCount] = await Promise.all([
      CommitAnalysis.countDocuments(),
      DailySummary.countDocuments(),
      TaskSuggestion.countDocuments(),
      QualityAnalysis.countDocuments(),
      EnhancedCommitsCache.countDocuments()
    ]);

    const totalEntries = analysisCount + summariesCount + tasksCount + qualityCount + enhancedCount;

    return {
      totalEntries,
      analysisEntries: analysisCount,
      summariesEntries: summariesCount,
      tasksEntries: tasksCount,
      qualityEntries: qualityCount,
      enhancedEntries: enhancedCount,
      generatedAt: new Date().toISOString()
    };
  } catch (error) {
    console.error('❌ Failed to get cache statistics:', error.message);
    return {
      totalEntries: 0,
      analysisEntries: 0,
      summariesEntries: 0,
      tasksEntries: 0,
      qualityEntries: 0,
      enhancedEntries: 0,
      generatedAt: new Date().toISOString()
    };
  }
};

/**
 * Create cache manager instance with all methods (backwards compatibility)
 * @returns {Object} Cache manager instance with bound methods
 */
export const createCacheManager = () => {
  return {
    storeAnalysis,
    getAnalysisHistory,
    getCachedEnhancedCommits,
    storeEnhancedCommits,
    clearEnhancedCommitsCache,
    clearQualityAnalysisCache,
    cleanupOldCache,
    getCacheStats
  };
};

/**
 * Default export for backwards compatibility
 * Maintains the same interface as the old class-based approach
 */
class CacheManager {
  constructor() {
    // Lightweight initialization - functional methods don't need instance state
  }

  async storeAnalysis(analyzedCommits) {
    return await storeAnalysis(analyzedCommits);
  }

  async getAnalysisHistory(repositoryId, days = 30) {
    return await getAnalysisHistory(repositoryId, days);
  }

  async getCachedEnhancedCommits(owner, repo, per_page = 10) {
    return await getCachedEnhancedCommits(owner, repo, per_page);
  }

  async storeEnhancedCommits(owner, repo, commits, per_page = 10) {
    return await storeEnhancedCommits(owner, repo, commits, per_page);
  }

  async clearEnhancedCommitsCache(owner, repo) {
    return await clearEnhancedCommitsCache(owner, repo);
  }

  async clearQualityAnalysisCache(owner, repo) {
    return await clearQualityAnalysisCache(owner, repo);
  }

  async cleanupOldCache(days = 90) {
    return await cleanupOldCache(days);
  }

  async getCacheStats() {
    return await getCacheStats();
  }
}

export default CacheManager;