import { CommitAnalysis, DailySummary, TaskSuggestion, QualityAnalysis } from '../models/aiModels.js';

class CacheManager {
  constructor() {

  }

  async storeAnalysis(analyzedCommits) {
    const docs = analyzedCommits.map(commit => ({
      commitHash: commit.sha,
      message: commit.message,
      category: commit.category,
      confidence: commit.confidence,
      reason: commit.aiReason,
      date: commit.date
    }));

    if (docs.length > 0) {
      await CommitAnalysis.insertMany(docs);
      console.log(`Stored ${docs.length} analysis results in MongoDB`);
    }
  }

  // Get analysis history
  async getAnalysisHistory(repositoryId, days = 30) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const history = await DailySummary.find({
      repositoryId: repositoryId,
      createdAt: { $gte: since }
    })
    .sort({ date: -1 })
    .lean();

    return history;
  }
}

export default CacheManager;