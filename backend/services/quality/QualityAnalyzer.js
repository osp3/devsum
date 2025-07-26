import { QualityAnalysis } from '../../models/aiModels.js';
import { 
  analyzeCodeQuality as functionalAnalyzeCodeQuality, 
  getQualityTrends as functionalGetQualityTrends 
} from './QualityAnalysisCoordinator.js';

/**
 * QualityAnalyzer - Backwards Compatibility Wrapper
 * 
 * This class maintains the same interface as the original QualityAnalyzer
 * while delegating to the new functional modules under the hood.
 * 
 * This ensures zero breaking changes for existing code that uses QualityAnalyzer.
 * All the heavy lifting is now done by specialized functional modules:
 * - QualityResponseParser.js
 * - QualityMetricsCalculator.js  
 * - QualityDataStorage.js
 * - CommitMessageAnalyzer.js
 * - QualityAnalysisCoordinator.js
 */
class QualityAnalyzer {
  constructor(openaiClient, callOpenAI, promptBuilder, githubService = null) {
    this.openai = openaiClient;
    this.callOpenAI = callOpenAI;
    this.promptBuilder = promptBuilder;
    this.githubService = githubService; // Add GitHubService for authenticated API calls
  }

  /**
   * Analyze code quality for commits with comprehensive analysis
   * Delegates to functional coordinator while maintaining same interface
   */
  async analyzeCodeQuality(commits, repositoryId, timeframe = 'weekly', repositoryFullName = null) {
    // Delegate to the functional coordinator with backwards compatibility
    const options = {
      openaiClient: this.openai,
      callOpenAI: this.callOpenAI,
      promptBuilder: this.promptBuilder,
      githubService: this.githubService,
      forceRefresh: false
    };

    return await functionalAnalyzeCodeQuality(
      commits, 
      repositoryId, 
      timeframe, 
      repositoryFullName, 
      options
    );
  }

  /**
   * Get quality trends over time
   * Delegates to functional coordinator while maintaining same interface
   */
  async getQualityTrends(repositoryId, days = 30) {
    // Delegate to the functional coordinator
    return await functionalGetQualityTrends(repositoryId, days);
  }

  // Note: All private methods have been moved to functional modules.
  // This class now serves as a backwards compatibility wrapper that
  // maintains the same public interface while leveraging the new
  // modular, functional architecture under the hood.
}

export default QualityAnalyzer;