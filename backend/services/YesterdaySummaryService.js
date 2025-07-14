/**
 * Yesterday Summary Service
 * Orchestrates the generation of yesterday's development summary
 * Follows SOLID principles - Single Responsibility, Dependency Injection
 * Now includes MongoDB caching for performance optimization
 */

import GitHubService from './github.js';
import aiService from './ai.js';
import connectDB from '../config/database.js';
import { DailySummary } from '../models/aiModels.js';
import { getYesterdayRange, formatDateForAPI } from '../utils/DateUtils.js';
import { formatCommitObject, generateFakeObjectId } from '../utils/CommitFormatter.js';
import { SummaryGenerator } from './SummaryGenerator.js';

/**
 * Service for generating yesterday's development summary across all repositories
 */
export class YesterdaySummaryService {
  constructor(accessToken) {
    this.githubService = new GitHubService(accessToken);
    this.aiService = aiService; // Use the exported singleton instance
    this.initialized = false;
  }

  /**
   * Initialize database connection
   */
  async init() {
    if (!this.initialized) {
      await connectDB();
      await this.aiService.init();
      this.initialized = true;
    }
  }

  /**
   * Generate complete yesterday summary with MongoDB caching
   * @param {boolean} forceRefresh - Force bypass cache and generate fresh summary
   * @returns {Object} Complete summary data
   */
  async generateSummary(forceRefresh = false) {
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
          console.log(`Using cached yesterday summary for ${dateStr}`);
          
          // Return cached data in the expected format
          return {
            summary: existing.summary,
            date: existing.date,
            commitCount: existing.commitCount,
            repositoryCount: existing.repositoryCount,
            repositories: existing.repositories || [],
            formattedCommits: existing.formattedCommits || { total: existing.commitCount, byRepository: {}, allCommits: [] }
          };
        }
      } else {
        console.log(`Force refresh requested - bypassing cache for ${dateStr}`);
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
      
      const formattedCommits = SummaryGenerator.structureFormattedCommits(commits);
      
      // Check if there are any commits - if not, return simple message
      let summaryText;
      if (commits.length === 0) {
        summaryText = "No work found for yesterday";
      } else {
        // Use AI-powered summary for actual commits
        console.log(`📝 DEBUG - Generating AI summary for ${commits.length} commits...`);
        try {
          summaryText = await this.aiService.generateDailySummary(commits, repositoryId, new Date(dateStr));
          console.log(`✅ DEBUG - AI summary generated successfully: "${summaryText.substring(0, 100)}..."`);
        } catch (aiError) {
          console.error(`❌ DEBUG - AI summary generation failed:`, aiError.message);
          // Fallback to SummaryGenerator when AI fails
          summaryText = SummaryGenerator.generateFormattedSummary(commits, repositoryData.length);
          console.log(`🔄 DEBUG - Used SummaryGenerator fallback: "${summaryText.substring(0, 100)}..."`);
        }
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

      console.log(`Yesterday summary generated and cached for ${dateStr}`);
      return summaryData;

    } catch (error) {
      console.error('Failed to generate yesterday summary:', error.message);
      
      // Fallback: generate without caching using SummaryGenerator
      console.log('🔄 Falling back to non-cached generation...');
      
      try {
        const repos = await this.githubService.getUserRepos();
        const { commits, repositoryData } = await this.fetchAllCommits(repos, start, end);
        
        const formattedCommits = SummaryGenerator.structureFormattedCommits(commits);
        
        // Fix: Properly generate summary based on commits availability
        let summaryText;
        if (commits.length === 0) {
          summaryText = "No work found for yesterday";
        } else {
          // Generate formatted summary using SummaryGenerator as fallback
          summaryText = SummaryGenerator.generateFormattedSummary(commits, repositoryData.length);
        }

        return {
          summary: summaryText,
          date: dateStr,
          commitCount: commits.length,
          repositoryCount: repositoryData.length,
          repositories: repositoryData,
          formattedCommits
        };
      } catch (fallbackError) {
        console.error('Fallback generation also failed:', fallbackError.message);
        
        // Final fallback with empty data
        return {
          summary: "Unable to generate summary due to technical issues",
          date: dateStr,
          commitCount: 0,
          repositoryCount: 0,
          repositories: [],
          formattedCommits: { total: 0, byRepository: {}, allCommits: [] }
        };
      }
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
          
          // Format commits with AI analysis for this repository
          const formattedCommits = await this._processCommitsWithAI(commits, repo);
          allCommits.push(...formattedCommits);
          
          // Add repository data
          repositoryData.push({
            id: repo.id.toString(),
            name: repo.name,
            fullName: repo.fullName,
            commitCount: commits.length,
            _id: generateFakeObjectId()
          });
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
} 