import { QualityAnalysis } from '../../models/aiModels.js';

/**
 * Quality Data Storage - Functional Pattern
 * Handles all database operations and caching for quality analysis
 * Pure functions for reliable data persistence
 */

/**
 * Generate cache key for quality analysis
 * @param {Array} commits - Array of commits
 * @param {string} repositoryId - Repository identifier
 * @param {string} timeframe - Analysis timeframe
 * @returns {string} Generated cache key
 */
export const generateCacheKey = (commits, repositoryId, timeframe) => {
  // Use repository and timeframe as primary cache key
  // This allows cache reuse even when new commits are added to similar time periods
  const today = new Date().toISOString().split('T')[0];
  
  // Use commit count buckets to allow cache reuse with minor commit changes
  // Round to nearest 10 (e.g., 5-14 commits all use bucket "10")
  const commitCountBucket = Math.floor((commits.length + 5) / 10) * 10;
  
  return `quality-${repositoryId.replace('/', '-')}-${timeframe}-${today}-${commitCountBucket}`;
};

/**
 * Get cached quality analysis
 * @param {string} repositoryId - Repository identifier
 * @param {string} cacheKey - Cache key
 * @param {number} maxAgeHours - Maximum age in hours (default: 4)
 * @returns {Promise<Object|null>} Cached analysis or null
 */
export const getCachedQualityAnalysis = async (repositoryId, cacheKey, maxAgeHours = 4) => {
  try {
    // Look for recent cache entries (within specified hours) for better cache hit rates
    const maxAgeMs = maxAgeHours * 60 * 60 * 1000;
    const cutoffTime = new Date(Date.now() - maxAgeMs);
    
    console.log(`🔍 Searching for cache with criteria:`, {
      repositoryId: repositoryId,
      cacheKey: cacheKey,
      createdAt_gte: cutoffTime.toISOString()
    });
    
    const existing = await QualityAnalysis.findOne({
      repositoryId: repositoryId,
      cacheKey: cacheKey,
      createdAt: { $gte: cutoffTime }
    }).lean();

    if (existing) {
      const minutesOld = Math.round((Date.now() - existing.createdAt.getTime()) / (1000 * 60));
      console.log(`✅ Using cached quality analysis for ${repositoryId} (${minutesOld} minutes old)`);
      return existing;
    }
    
    console.log(`❌ No recent cache found for ${repositoryId}, cache miss`);
    return null;
    
  } catch (error) {
    console.error('❌ Error retrieving cached quality analysis:', error.message);
    return null;
  }
};

/**
 * Store quality analysis in database
 * @param {Object} qualityData - Quality analysis data
 * @param {string} repositoryId - Repository identifier
 * @param {string} date - Analysis date (YYYY-MM-DD format)
 * @param {string} cacheKey - Cache key
 * @returns {Promise<Object|null>} Stored analysis or null on error
 */
export const storeQualityAnalysis = async (qualityData, repositoryId, date, cacheKey) => {
  try {
    // Debug the codeAnalysis structure before saving
    if (qualityData.codeAnalysis && qualityData.codeAnalysis.insights) {
      console.log(`📊 Saving ${qualityData.codeAnalysis.insights.length} code insights for ${repositoryId}`);
      console.log(`📊 Sample insight structure:`, JSON.stringify(qualityData.codeAnalysis.insights[0], null, 2));
    }
    
    const storedAnalysis = await QualityAnalysis.findOneAndUpdate(
      { repositoryId: repositoryId, analysisDate: date, cacheKey: cacheKey },
      {
        repositoryId: repositoryId,
        analysisDate: date,
        cacheKey: cacheKey,
        qualityScore: qualityData.qualityScore,
        issues: qualityData.issues,
        insights: qualityData.insights,
        recommendations: qualityData.recommendations,
        commitAnalyzed: qualityData.metadata?.commitsAnalyzed || 0,
        trends: {
          improvingAreas: [],
          concerningAreas: []
        },
        codeAnalysis: qualityData.codeAnalysis || null,
        analysisMethod: qualityData.analysisMethod || 'basic'
      },
      { upsert: true, new: true }
    );
    
    console.log(`✅ Stored quality analysis cache for ${repositoryId}`);
    return storedAnalysis;
    
  } catch (error) {
    console.error('❌ Failed to store quality analysis:', error.message);
    console.error('Error details:', error);
    return null;
  }
};

/**
 * Get historical quality analysis data
 * @param {string} repositoryId - Repository identifier
 * @param {number} days - Number of days to look back
 * @returns {Promise<Array>} Array of historical quality data
 */
export const getQualityHistory = async (repositoryId, days = 30) => {
  try {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const sinceStr = since.toISOString().split('T')[0];

    const qualityHistory = await QualityAnalysis.find({
      repositoryId: repositoryId,
      analysisDate: { $gte: sinceStr }
    })
    .sort({ analysisDate: 1 }) // Oldest first
    .lean();

    console.log(`📊 Retrieved ${qualityHistory.length} historical quality entries for ${repositoryId}`);
    return qualityHistory;
    
  } catch (error) {
    console.error('❌ Error retrieving quality history:', error.message);
    return [];
  }
};

/**
 * Clear cached quality analysis for a repository
 * @param {string} repositoryId - Repository identifier
 * @param {number} olderThanHours - Remove entries older than this many hours (default: 24)
 * @returns {Promise<number>} Number of entries removed
 */
export const clearQualityCache = async (repositoryId, olderThanHours = 24) => {
  try {
    const cutoffTime = new Date(Date.now() - olderThanHours * 60 * 60 * 1000);
    
    const result = await QualityAnalysis.deleteMany({
      repositoryId: repositoryId,
      createdAt: { $lt: cutoffTime }
    });
    
    console.log(`🗑️ Cleared ${result.deletedCount} old quality cache entries for ${repositoryId}`);
    return result.deletedCount;
    
  } catch (error) {
    console.error('❌ Error clearing quality cache:', error.message);
    return 0;
  }
};

/**
 * Get quality analysis statistics
 * @param {string} repositoryId - Repository identifier (optional)
 * @returns {Promise<Object>} Quality analysis statistics
 */
export const getQualityStats = async (repositoryId = null) => {
  try {
    const query = repositoryId ? { repositoryId } : {};
    
    const [totalCount, recentCount, averageScore] = await Promise.all([
      QualityAnalysis.countDocuments(query),
      QualityAnalysis.countDocuments({
        ...query,
        createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
      }),
      QualityAnalysis.aggregate([
        { $match: query },
        { $group: { _id: null, avgScore: { $avg: '$qualityScore' } } }
      ])
    ]);

    return {
      totalAnalyses: totalCount,
      recentAnalyses: recentCount,
      averageQualityScore: averageScore[0]?.avgScore || 0,
      repositoryId: repositoryId || 'all',
      generatedAt: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('❌ Error getting quality statistics:', error.message);
    return {
      totalAnalyses: 0,
      recentAnalyses: 0,
      averageQualityScore: 0,
      repositoryId: repositoryId || 'all',
      generatedAt: new Date().toISOString()
    };
  }
};

/**
 * Cleanup old quality analysis data
 * @param {number} days - Keep data newer than this many days
 * @returns {Promise<Object>} Cleanup statistics
 */
export const cleanupOldQualityData = async (days = 90) => {
  try {
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    
    const result = await QualityAnalysis.deleteMany({
      createdAt: { $lt: cutoffDate }
    });
    
    console.log(`🧹 Quality data cleanup: Removed ${result.deletedCount} entries older than ${days} days`);
    
    return {
      deletedCount: result.deletedCount,
      cutoffDate: cutoffDate.toISOString(),
      daysKept: days
    };
    
  } catch (error) {
    console.error('❌ Error during quality data cleanup:', error.message);
    return {
      deletedCount: 0,
      cutoffDate: null,
      daysKept: days
    };
  }
};

/**
 * Find similar quality analyses for comparison
 * @param {string} repositoryId - Repository identifier
 * @param {number} commitCount - Number of commits in current analysis
 * @param {number} limit - Maximum number of similar analyses to return
 * @returns {Promise<Array>} Array of similar quality analyses
 */
export const findSimilarQualityAnalyses = async (repositoryId, commitCount, limit = 5) => {
  try {
    // Find analyses with similar commit counts (±5 commits)
    const similarAnalyses = await QualityAnalysis.find({
      repositoryId: repositoryId,
      commitAnalyzed: {
        $gte: Math.max(0, commitCount - 5),
        $lte: commitCount + 5
      }
    })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

    console.log(`🔍 Found ${similarAnalyses.length} similar quality analyses for ${repositoryId}`);
    return similarAnalyses;
    
  } catch (error) {
    console.error('❌ Error finding similar quality analyses:', error.message);
    return [];
  }
};

/**
 * Get quality trend summary for multiple repositories
 * @param {Array} repositoryIds - Array of repository identifiers
 * @param {number} days - Number of days to analyze
 * @returns {Promise<Object>} Multi-repository quality trend summary
 */
export const getMultiRepoQualityTrends = async (repositoryIds, days = 30) => {
  try {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const sinceStr = since.toISOString().split('T')[0];

    const trends = await Promise.all(
      repositoryIds.map(async (repoId) => {
        const history = await QualityAnalysis.find({
          repositoryId: repoId,
          analysisDate: { $gte: sinceStr }
        })
        .sort({ analysisDate: 1 })
        .lean();

        if (history.length === 0) {
          return { repositoryId: repoId, trend: 'no_data', score: 0 };
        }

        const scores = history.map(h => h.qualityScore);
        const averageScore = scores.reduce((a, b) => a + b, 0) / scores.length;
        
        let trend = 'stable';
        if (scores.length > 1) {
          const recent = scores.slice(-3);
          const older = scores.slice(0, -3);
          if (older.length > 0) {
            const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
            const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
            const change = recentAvg - olderAvg;
            
            if (change > 0.05) trend = 'improving';
            else if (change < -0.05) trend = 'declining';
          }
        }

        return {
          repositoryId: repoId,
          trend: trend,
          score: Math.round(averageScore * 1000) / 1000,
          dataPoints: history.length
        };
      })
    );

    return {
      repositories: trends,
      summary: {
        total: trends.length,
        improving: trends.filter(t => t.trend === 'improving').length,
        declining: trends.filter(t => t.trend === 'declining').length,
        stable: trends.filter(t => t.trend === 'stable').length,
        noData: trends.filter(t => t.trend === 'no_data').length
      },
      generatedAt: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('❌ Error getting multi-repo quality trends:', error.message);
    return {
      repositories: [],
      summary: { total: 0, improving: 0, declining: 0, stable: 0, noData: 0 },
      generatedAt: new Date().toISOString()
    };
  }
}; 