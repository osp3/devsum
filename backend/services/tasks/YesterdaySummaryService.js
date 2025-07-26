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
import { getYesterdayRange, formatDateForAPI } from '../../utils/DateUtils.js';
import { formatCommitObject, generateFakeObjectId } from '../../utils/CommitFormatter.js';
import { structureFormattedCommits, generateFormattedSummary } from './SummaryGenerator.js';

/**
 * Service for generating yesterday's development summary across all repositories
 */
export class YesterdaySummaryService {
  constructor(accessToken) {
    this.githubService = GitHubService(accessToken); // GitHubService is now a factory function
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
  async generateSummary(forceRefresh = false, userApiKey = null, userModel = 'gpt-4o-mini') {
    await this.init(); // Ensure DB connection
    
    const { start, end } = getYesterdayRange();
    const dateStr = formatDateForAPI(start);
    const repositoryId = 'ALL_REPOS'; // Special identifier for cross-repository summaries

    try {
      // Check for cached summary for yesterday (unless force refresh requested)
      if (!forceRefresh) {
        const existing = await DailySummary.findOne({
          date: dateStr,
          repositoryId: repositoryId
        }).lean();

        if (existing) {
          console.log(`📦 YesterdaySummaryService: Using CACHED yesterday summary for ${dateStr}`);
          console.log(`📦 Cache hit - Summary preview: "${existing.summary.substring(0, 100)}..."`);
          
          // Return cached data in the expected format
          return {
            summary: existing.summary,
            date: existing.date,
            commitCount: existing.commitCount,
            repositoryCount: existing.repositoryCount,
            repositories: existing.repositories || [],
            formattedCommits: existing.formattedCommits || { total: existing.commitCount, byRepository: {}, allCommits: [] }
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
      
      const { commits, repositoryData } = await this.fetchAllCommits(repos, start, end);
      
      // Debug logging for returned data
      console.log(`📊 DEBUG - Fetch Results:`);
      console.log(`   Repositories found: ${repositoryData.length}`);
      console.log(`   Total commits found: ${commits.length}`);
      if (commits.length > 0) {
        console.log(`   First commit: ${commits[0].sha?.substring(0, 7)} - "${commits[0].message?.substring(0, 50)}..."`);
        console.log(`   Last commit: ${commits[commits.length - 1].sha?.substring(0, 7)} - "${commits[commits.length - 1].message?.substring(0, 50)}..."`);
        console.log(`   Commit date range: ${commits[commits.length - 1].date} to ${commits[0].date}`);
      }
      console.log(`   Repository details:`, repositoryData.map(r => `${r.name} (${r.commitCount} commits)`));
      
      const formattedCommits = structureFormattedCommits(commits);
      
      // Check if there are any commits - if not, return simple message
      let summaryText;
      if (commits.length === 0) {
        summaryText = "No work found for yesterday";
      } else if (!userApiKey) {
        // No API key provided - use fallback summary
        console.log(`⚠️  YesterdaySummaryService: No OpenAI API key provided - using fallback summary`);
        summaryText = generateFormattedSummary(commits, repositoryData.length);
      } else {
        // Use AI-powered summary for actual commits - pass through forceRefresh and user's API key
        console.log(`🔄 YesterdaySummaryService: Generating fresh summary via AIService with user's API key (forceRefresh=${forceRefresh})`);
        summaryText = await this.aiService.generateDailySummary(commits, repositoryId, userApiKey, userModel, new Date(dateStr), forceRefresh);
        console.log(`✅ YesterdaySummaryService: Received summary from AIService - Preview: "${summaryText.substring(0, 100)}..."`);
      }

      const summaryData = {
        summary: summaryText,
        date: dateStr,
        commitCount: commits.length,
        repositoryCount: repositoryData.length,
        repositories: repositoryData,
        formattedCommits
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
          categories: this._groupByCategory(commits)
        },
        { upsert: true, new: true }
      );

      console.log(`💾 YesterdaySummaryService: Fresh summary generated and cached for ${dateStr}`);
      console.log(`💾 Final summary being returned - Preview: "${summaryText.substring(0, 100)}..."`);
      return summaryData;

    } catch (error) {
      console.error('❌ YesterdaySummaryService: Failed to generate yesterday summary:', error.message);
      
      // Fallback: generate without caching using SummaryGenerator
      console.log('⚠️  YesterdaySummaryService: Falling back to non-cached generation...');
      const repos = await this.githubService.getUserRepos();
      const { commits, repositoryData } = await this.fetchAllCommits(repos, start, end);
      
      const formattedCommits = structureFormattedCommits(commits);
      const summaryText = commits.length === 0 
        ? "No work found for yesterday" 
        : generateFormattedSummary(commits, repositoryData.length);

      console.log(`⚠️  YesterdaySummaryService: FALLBACK summary generated - Preview: "${summaryText.substring(0, 100)}..."`);
      return {
        summary: summaryText,
        date: dateStr,
        commitCount: commits.length,
        repositoryCount: repositoryData.length,
        repositories: repositoryData,
        formattedCommits
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
  async fetchAllCommits(repos, start, end) {
    const allCommits = [];
    const repositoryData = [];

    for (const repo of repos) {
      try {
        const [owner, name] = repo.fullName.split('/');
        const commits = await this.githubService.getCommits(owner, name, {
          per_page: 10, // Limit to 20 commits per repo for performance
          since: start.toISOString(),
          until: end.toISOString(),
        });

        if (commits.length > 0) {
          console.log(`📥 Processing ${commits.length} commits for ${repo.fullName}`);
          
          // Filter out merge commits from today-summary results
          const filteredCommits = this._filterMergeCommits(commits);
          console.log(`📊 Filtered out ${commits.length - filteredCommits.length} merge commits, ${filteredCommits.length} regular commits remaining`);
          
          if (filteredCommits.length > 0) {
            // Format commits with AI analysis for this repository
            const formattedCommits = await this._processCommitsWithAI(filteredCommits, repo);
            allCommits.push(...formattedCommits);
            
            // Add repository data
            repositoryData.push({
              id: repo.id.toString(),
              name: repo.name,
              fullName: repo.fullName,
              commitCount: filteredCommits.length,
              _id: generateFakeObjectId()
            });
          }
        }
      } catch (error) {
        console.error(`Error fetching commits for ${repo.fullName}:`, error.message);
        continue; // Skip failed repositories
      }
    }

    return { commits: allCommits, repositoryData };
  }

  /**
   * Process commits with AI analysis for each commit
   * @param {Array} commits - Raw commits from GitHub
   * @param {Object} repo - Repository object
   * @returns {Array} Formatted commits with AI analysis
   */
  async _processCommitsWithAI(commits, repo) {
    const formattedCommits = [];
    const [owner, name] = repo.fullName.split('/');
    
    // Limit the number of commits to analyze to prevent excessive API calls
    const commitsToAnalyze = commits.slice(0, 10); // Max 10 commits per repo
    
    for (const commit of commitsToAnalyze) {
      try {
        // Get the commit diff
        const diff = await this._getCommitDiff(owner, name, commit.sha);
        
        // Run AI analysis on the diff
        const aiAnalysis = await this.aiService.analyzeCommitDiff(commit, diff);
        
        // Format the commit with AI analysis
        const formattedCommit = formatCommitObject(commit, repo, aiAnalysis);
        formattedCommits.push(formattedCommit);
        
        console.log(`✅ Analyzed commit ${commit.sha?.substring(0, 7)} in ${repo.name}`);
        
      } catch (error) {
        console.error(`Failed to analyze commit ${commit.sha?.substring(0, 7)} in ${repo.name}:`, error.message);
        
        // Fallback: format commit without AI analysis
        const formattedCommit = formatCommitObject(commit, repo);
        formattedCommits.push(formattedCommit);
      }
    }
    
    // Add remaining commits without AI analysis if there are more than 10
    if (commits.length > 10) {
      const remainingCommits = commits.slice(10);
      console.log(`📊 Adding ${remainingCommits.length} commits without AI analysis for ${repo.name}`);
      
      for (const commit of remainingCommits) {
        const formattedCommit = formatCommitObject(commit, repo);
        formattedCommits.push(formattedCommit);
      }
    }
    
    return formattedCommits;
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