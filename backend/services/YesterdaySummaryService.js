/**
 * Yesterday Summary Service
 * Orchestrates the generation of yesterday's development summary
 * Follows SOLID principles - Single Responsibility, Dependency Injection
 * Now includes MongoDB caching for performance optimization
 */

import GitHubService from './github.js';
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
    this.initialized = false;
  }

  /**
   * Initialize database connection
   */
  async init() {
    if (!this.initialized) {
      await connectDB();
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

      // Generate new summary if not cached
      console.log(`Generating new yesterday summary for ${dateStr}...`);
      const repos = await this.githubService.getUserRepos();
      const { commits, repositoryData } = await this.fetchAllCommits(repos, start, end);
      
      const formattedCommits = SummaryGenerator.structureFormattedCommits(commits);
      const summaryText = SummaryGenerator.generateFormattedSummary(commits, repositoryData.length);

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
      
      // Fallback: generate without caching
      console.log('Falling back to non-cached generation...');
      const repos = await this.githubService.getUserRepos();
      const { commits, repositoryData } = await this.fetchAllCommits(repos, start, end);
      
      const formattedCommits = SummaryGenerator.structureFormattedCommits(commits);
      const summaryText = SummaryGenerator.generateFormattedSummary(commits, repositoryData.length);

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
   * Fetch commits from all repositories for the specified date range
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
          per_page: 50,
          since: start.toISOString(),
          until: end.toISOString(),
        });

        if (commits.length > 0) {
          // Format commits for this repository
          const formattedCommits = commits.map(commit => formatCommitObject(commit, repo));
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
} 