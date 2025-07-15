import { CommitAnalysis, DailySummary, TaskSuggestion, QualityAnalysis, EnhancedCommitsCache } from '../models/aiModels.js';
/**CommitAnalysis: individual commit categorization 
 * Caching strategy
 * store immediately after AI analysis -> QUery by date ranges for trends -> 
 * Analysis results snever change once stored -> efficient batch processing for multiple commits
 * Integration: AIService generates analysis -> CacheManager stores results ->
 * Future requests -> CacheManger checks cache first
 * Dashboard/Reports -> CacheManager provides historical data
 * Cost optimization -> Avoid duplicate expensive AI calls
 */
class CacheManager {
  constructor() {
//lightweight initialization - DB connection handled by AIService.init() -allows fast initialization
//timebased partitioning
  }

  async storeAnalysis(analyzedCommits) { //Convert AI anlysis results to Mongo doc format using .map()
    const docs = analyzedCommits.map(commit => ({
      commitHash: commit.sha, //Git SHA hash (unique per commit)
      message: commit.message, //Original commit message
      category: commit.category, //AI-determined category(feat, bugfix, etc)
      confidence: commit.confidence, //AI confidence score (0.0 to 1.0)
      reason: commit.aiReason, //AI explanation for the categorization
      date: commit.date //commit timestamp for temporal queries
    }));

    if (docs.length > 0) { //Efficient batch insertion - only proceeds if we hav data to store
      await CommitAnalysis.insertMany(docs); //Bulk insert - automatically handles duplicate key conflicts(commitHash)
      console.log(`Stored ${docs.length} analysis results in MongoDB`);
    }
  }

  // Get analysis history
  async getAnalysisHistory(repositoryId, days = 30) { //current time minus speicifed days converted to milliseconds
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const history = await DailySummary.find({ //Retrieve historical analysis data(Mongo Query)
      repositoryId: repositoryId, //Only get data for specified repo
      createdAt: { $gte: since } //Only get data newer than cutoff date
    })
    .sort({ date: -1 }) //Most recent entries first
    .lean(); //Return plain JS objects rather than Mongoose docs (JSON serialization)

    return history; //Return: Array of daily summary docs sorted by date
  }

  // Enhanced Commits Cache Methods
  async getCachedEnhancedCommits(owner, repo, per_page = 10) {
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
  }

  async storeEnhancedCommits(owner, repo, commits, per_page = 10) {
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
  }

  async clearEnhancedCommitsCache(owner, repo) {
    const cachePattern = `${owner}/${repo}:enhanced-commits:`;
    
    try {
      const result = await EnhancedCommitsCache.deleteMany({
        cacheKey: { $regex: `^${cachePattern}` }
      });
      
      console.log(`✅ Cleared ${result.deletedCount} cached entries for ${owner}/${repo}`);
    } catch (error) {
      console.error(`⚠️ Failed to clear cache for ${owner}/${repo}:`, error.message);
    }
  }
}

export default CacheManager;