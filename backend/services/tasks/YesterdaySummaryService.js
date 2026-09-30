/**
 * Yesterday Summary Service
 * Orchestrates the generation of yesterday's development summary
 * Follows SOLID principles - Single Responsibility, Dependency Injection
 * Now includes MongoDB caching for performance optimization
 */

import GitHubService from '../external/GitHubAPIClient.js';
import aiService from '../ai/AICoordinator.js';
import connectDB from '../../config/database.js';
import { DailySummary } from '../../models/aiModels.js';
import { getYesterdayRange } from '../../utils/DateUtils.js';
import { DEFAULT_OPENAI_MODEL } from '../../config/openaiModels.js';
import { formatCommitObject, generateFakeObjectId } from '../../utils/CommitFormatter.js';
import { structureFormattedCommits, generateFormattedSummary } from './SummaryGenerator.js';
import { mapWithConcurrency } from '../../utils/concurrency.js';

const REPO_CONCURRENCY = 4;
const COMMIT_CONCURRENCY = 3;
const MAX_ANALYZED_COMMITS_PER_REPO = 10;

const describePullRequests = (pullRequests) =>
  `${pullRequests.length} pull request update${pullRequests.length === 1 ? '' : 's'} yesterday: ` +
  pullRequests.map(pr => `${pr.action} #${pr.number} ${pr.title} (${pr.repository})`).join('; ');

/**
 * Service for generating yesterday's development summary across all repositories
 */
export class YesterdaySummaryService {
  constructor(accessToken, userId) {
    this.githubService = GitHubService(accessToken); // GitHubService is now a factory function
    this.repositoryId = `ALL_REPOS:${userId}`; // Per-user cache key so summaries never leak between users
    this.aiService = aiService; // Use the exported singleton instance
    this.initialized = false;
  }

  /**
   * Initialize database connection
   */
  async init() {
    if (!this.initialized) {
      await connectDB();
      // AICoordinator handles its own initialization automatically
      this.initialized = true;
    }
  }

  /**
   * Generate complete yesterday summary with MongoDB caching
   * @param {boolean} forceRefresh - Force bypass cache and generate fresh summary
   * @param {string} userApiKey - User's OpenAI API key
   * @param {string} userModel - User's preferred OpenAI model
   * @returns {Object} Complete summary data
   */
  async generateSummary(forceRefresh = false, userApiKey = null, userModel = DEFAULT_OPENAI_MODEL, timeZone = 'UTC') {
    await this.init(); // Ensure DB connection
    
    const { start, end, date: dateStr } = getYesterdayRange(timeZone);
    const { repositoryId } = this;

    try {
      // Check for cached summary for yesterday (unless force refresh requested)
      if (!forceRefresh) {
        const existing = await DailySummary.findOne({
          date: dateStr,
          repositoryId: repositoryId
        }).lean();

        if (existing) {
          console.log(`📦 YesterdaySummaryService: Using CACHED yesterday summary for ${dateStr}`);
          
          // Return cached data in the expected format
          return {
            summary: existing.summary,
            date: existing.date,
            commitCount: existing.commitCount,
            repositoryCount: existing.repositoryCount,
            repositories: existing.repositories || [],
            formattedCommits: existing.formattedCommits || { total: existing.commitCount, byRepository: {}, allCommits: [] },
            pullRequests: existing.pullRequests || []
          };
        } else {
          console.log(`📦 YesterdaySummaryService: No cached summary found for ${dateStr} - will generate fresh`);
        }
      } else {
        console.log(`🔄 YesterdaySummaryService: Force refresh requested - bypassing cache for ${dateStr}`);
      }

      // Generate new summary if not cached or refresh requested
      console.log(`🔄 Generating fresh yesterday summary for ${dateStr}...`);
      const repos = await this.githubService.getUserRepos();
      
      // Debug logging for date range
      console.log(`📅 DEBUG - Date Range:`);
      console.log(`   Start: ${start.toISOString()} (${start.toLocaleString()})`);
      console.log(`   End: ${end.toISOString()} (${end.toLocaleString()})`);
      console.log(`   Duration: ${Math.round((end - start) / (1000 * 60 * 60))} hours`);
      
      const { commits, repositoryData, pullRequests } = await this.fetchAllCommits(repos, start, end, userApiKey, userModel);
      
      // Debug logging for returned data
      console.log(`📊 DEBUG - Fetch Results:`);
      console.log(`   Repositories found: ${repositoryData.length}`);
      console.log(`   Total commits found: ${commits.length}`);
      console.log(`   Pull request updates found: ${pullRequests.length}`);
      if (commits.length > 0) {
        console.log(`   Commit date range: ${commits[commits.length - 1].date} to ${commits[0].date}`);
      }
      
      const formattedCommits = structureFormattedCommits(commits);
      
      // Check if there are any commits - if not, return simple message
      let summaryText;
      if (commits.length === 0 && pullRequests.length === 0) {
        summaryText = "No work found for yesterday";
      } else if (!userApiKey) {
        // No API key provided - use fallback summary
        console.log(`⚠️  YesterdaySummaryService: No OpenAI API key provided - using fallback summary`);
        summaryText = commits.length > 0
          ? generateFormattedSummary(commits, repositoryData.length)
          : describePullRequests(pullRequests);
      } else {
        // Use AI-powered summary for actual commits - pass through forceRefresh and user's API key
        console.log(`🔄 YesterdaySummaryService: Generating fresh summary via AIService with user's API key (forceRefresh=${forceRefresh})`);
        summaryText = await this.aiService.generateDailySummary(commits, repositoryId, userApiKey, userModel, new Date(dateStr), forceRefresh, pullRequests);
        console.log(`✅ YesterdaySummaryService: Received summary from AIService (${summaryText.length} chars)`);
      }

      const summaryData = {
        summary: summaryText,
        date: dateStr,
        commitCount: commits.length,
        repositoryCount: repositoryData.length,
        repositories: repositoryData,
        formattedCommits,
        pullRequests
      };

      // Store in MongoDB for future caching (replace existing if force refresh)
      await DailySummary.findOneAndUpdate(
        { date: dateStr, repositoryId: repositoryId },
        {
          date: dateStr,
          repositoryId: repositoryId,
          summary: summaryText,
          commitCount: commits.length,
          repositoryCount: repositoryData.length,
          repositories: repositoryData,
          formattedCommits: formattedCommits,
          pullRequests,
          categories: this._groupByCategory(commits)
        },
        { upsert: true, new: true }
      );

      console.log(`💾 YesterdaySummaryService: Fresh summary generated and cached for ${dateStr}`);
      return summaryData;

    } catch (error) {
      console.error('❌ YesterdaySummaryService: Failed to generate yesterday summary:', error.message);
      
      // Fallback: generate without caching using SummaryGenerator
      console.log('⚠️  YesterdaySummaryService: Falling back to non-cached generation...');
      const repos = await this.githubService.getUserRepos();
      const { commits, repositoryData, pullRequests } = await this.fetchAllCommits(repos, start, end);
      
      const formattedCommits = structureFormattedCommits(commits);
      const summaryText = commits.length > 0
        ? generateFormattedSummary(commits, repositoryData.length)
        : pullRequests.length > 0 ? describePullRequests(pullRequests) : "No work found for yesterday";

      console.log(`⚠️  YesterdaySummaryService: FALLBACK summary generated`);
      return {
        summary: summaryText,
        date: dateStr,
        commitCount: commits.length,
        repositoryCount: repositoryData.length,
        repositories: repositoryData,
        formattedCommits,
        pullRequests
      };
    }
  }

  /**
   * Group commits by category for database storage
   * @param {Array} commits - Array of commit objects
   * @returns {Object} Object with category counts
   */
  _groupByCategory(commits) {
    return commits.reduce((acc, commit) => {
      const category = commit.type || 'other';
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {});
  }

  /**
   * Fetch commits from all repositories for the specified date range with AI analysis
   * @param {Array} repos - Array of repository objects
   * @param {Date} start - Start date
   * @param {Date} end - End date
   * @returns {Object} { commits, repositoryData }
   */
  async fetchAllCommits(repos, start, end, userApiKey = null, userModel) {
    // Repos with no push since the window started cannot contain commits in it
    const activeRepos = repos.filter(repo => !repo.pushedAt || new Date(repo.pushedAt) >= start);
    console.log(`📥 Checking ${activeRepos.length} of ${repos.length} repositories pushed since ${start.toISOString()}`);

    const activity = activeRepos.length > 0
      ? await this.githubService.getRecentActivity(activeRepos, start, end)
      : [];

    const results = await mapWithConcurrency(activity, REPO_CONCURRENCY, async ({ repo, commits }) => {
      const filteredCommits = this._filterMergeCommits(commits);
      if (filteredCommits.length === 0) return null;

      return {
        commits: await this._processCommitsWithAI(filteredCommits, repo, userApiKey, userModel),
        repository: {
          id: repo.id.toString(),
          name: repo.name,
          fullName: repo.fullName,
          commitCount: filteredCommits.length,
          _id: generateFakeObjectId()
        }
      };
    });

    const found = results.filter(Boolean);
    return {
      commits: found.flatMap(result => result.commits),
      repositoryData: found.map(result => result.repository),
      pullRequests: activity.flatMap(result => result.pullRequests)
    };
  }

  /**
   * Process commits with AI analysis for each commit
   * @param {Array} commits - Raw commits from GitHub
   * @param {Object} repo - Repository object
   * @returns {Array} Formatted commits with AI analysis
   */
  async _processCommitsWithAI(commits, repo, userApiKey = null, userModel) {
    if (!userApiKey) {
      return commits.map(commit => formatCommitObject(commit, repo));
    }

    const [owner, name] = repo.fullName.split('/');
    const commitsToAnalyze = commits.slice(0, MAX_ANALYZED_COMMITS_PER_REPO);

    const analyzed = await mapWithConcurrency(commitsToAnalyze, COMMIT_CONCURRENCY, async (commit) => {
      try {
        const diff = await this._getCommitDiff(owner, name, commit.sha);
        const aiAnalysis = await this.aiService.analyzeCommitDiff(commit, diff, userApiKey, userModel);
        return formatCommitObject(commit, repo, aiAnalysis);
      } catch (error) {
        console.error(`Failed to analyze commit ${commit.sha?.substring(0, 7)} in ${repo.name}:`, error.message);
        return formatCommitObject(commit, repo);
      }
    });

    const remaining = commits.slice(MAX_ANALYZED_COMMITS_PER_REPO).map(commit => formatCommitObject(commit, repo));
    return [...analyzed, ...remaining];
  }

  /**
   * Get commit diff from GitHub
   * @param {string} owner - Repository owner
   * @param {string} name - Repository name
   * @param {string} sha - Commit SHA
   * @returns {string} Commit diff
   */
  async _getCommitDiff(owner, name, sha) {
    try {
      const commitDiff = await this.githubService.getCommitDiff(owner, name, sha);
      
      // Extract diff text from files
      const diffText = commitDiff.files
        .map(file => file.patch || '')
        .join('\n');
      
      return diffText;
    } catch (error) {
      console.error(`Failed to get diff for ${sha}:`, error.message);
      return ''; // Return empty string if diff fetch fails
    }
  }

  /**
   * Filter out merge commits from the commit list
   * @param {Array} commits - Array of commit objects
   * @returns {Array} Filtered commits without merge commits
   */
  _filterMergeCommits(commits) {
    return commits.filter(commit => {
      // Check if it's a merge commit by parents count
      const isMergeCommit = commit.parents && commit.parents.length > 1;
      
      // Also check for merge commit patterns in the message as fallback
      const mergeMessagePatterns = [
        /^Merge pull request #\d+/i,
        /^Merge branch/i,
        /^Merge remote-tracking branch/i,
        /^Merge \w+/i
      ];
      const hasMergeMessage = mergeMessagePatterns.some(pattern => 
        pattern.test(commit.message)
      );
      
      return !(isMergeCommit || hasMergeMessage);
    });
  }
} 