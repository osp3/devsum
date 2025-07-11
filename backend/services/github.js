import { Octokit } from '@octokit/rest';
import { createGitHubError } from '../utils/errors.js';

/**
 * GitHub API Service
 * Handles all GitHub API interactions with proper error handling and rate limiting
 */
class GitHubService {
  constructor(accessToken) {
    this.octokit = new Octokit({
      auth: accessToken,
      request: {
        timeout: 10000 // 10 second timeout
      }
    });
  }

  /**
   * Get user's repositories
   */
  async getUserRepos() {
    try {
      const { data } = await this.octokit.rest.repos.listForAuthenticatedUser({
        sort: 'updated',
        per_page: 100,
        type: 'all'
      });

      return data.map(repo => ({
        id: repo.id,
        name: repo.name,
        fullName: repo.full_name,
        private: repo.private,
        defaultBranch: repo.default_branch,
        updatedAt: repo.updated_at,
        description: repo.description,
        language: repo.language
      }));
    } catch (error) {
      console.error('❌ Error fetching repositories:', error.message);
      throw createGitHubError(error, 'fetching user repositories');
    }
  }

  /**
   * Get commits for a repository
   */
  async getCommits(owner, repo, options = {}) {
    try {
      const {
        per_page = 20, // Last 20 commits
        sha = undefined // branch/commit SHA
      } = options;

      const { data } = await this.octokit.rest.repos.listCommits({
        owner,
        repo,
        per_page,
        sha
      });

      return data.map(commit => ({
        sha: commit.sha,
        message: commit.commit.message,
        author: {
          name: commit.commit.author.name,
          email: commit.commit.author.email,
          date: commit.commit.author.date
        },
        url: commit.html_url,
        stats: {
          additions: commit.stats?.additions || 0,
          deletions: commit.stats?.deletions || 0,
          total: commit.stats?.total || 0
        }
      }));
    } catch (error) {
      console.error(`❌ Error fetching commits for ${owner}/${repo}:`, error.message);
      throw createGitHubError(error, `fetching commits for ${owner}/${repo}`);
    }
  }

  /**
   * Get authenticated user's GitHub profile information
   */
  async getAuthenticatedUser() {
    try {
      const { data } = await this.octokit.rest.users.getAuthenticated();
      return {
        login: data.login,
        email: data.email,
        name: data.name
      };
    } catch (error) {
      console.error('❌ Error fetching authenticated user:', error.message);
      throw createGitHubError(error, 'fetching authenticated user profile');
    }
  }

  /**
   * Get commits from all user repositories for the last 24 hours
   * Used for generating daily summaries across all repos
   * Filters commits to only include those authored by the authenticated user
   */
  async getAllUserCommitsForDate(date = new Date(), options = {}) {
    try {
      console.log(`🔄 Fetching user's own commits from all repositories for ${date.toISOString().split('T')[0]}...`);
      
      const {
        maxRepos = 50,        // Limit repos to avoid rate limits
        maxCommitsPerRepo = 10 // Limit commits per repo
      } = options;

      // Calculate 24-hour window
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0); // Start of day
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999); // End of day

      // Get authenticated user's profile information for filtering
      const userProfile = await this.getAuthenticatedUser();
      console.log(`👤 Filtering commits for user: ${userProfile.login} (${userProfile.email || 'no public email'})`);

      // Get user's repositories
      const repositories = await this.getUserRepos();
      const activeRepos = repositories
        .filter(repo => !repo.archived && new Date(repo.updatedAt) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)) // Updated in last 30 days
        .slice(0, maxRepos); // Limit to prevent rate limit issues

      console.log(`📊 Found ${activeRepos.length} active repositories to check`);

      const allCommits = [];
      const repositoryStats = [];
      let successfulRepos = 0;
      let failedRepos = 0;

      // Fetch commits from each repository
      for (const repo of activeRepos) {
        try {
          const [owner, repoName] = repo.fullName.split('/');
          
          // Get commits since start of day, filtered by the authenticated user
          const { data } = await this.octokit.rest.repos.listCommits({
            owner,
            repo: repoName,
            since: startDate.toISOString(),
            until: endDate.toISOString(),
            author: userProfile.login, // Filter by the authenticated user's GitHub username
            per_page: maxCommitsPerRepo
          });

          const commits = data.map(commit => ({
            sha: commit.sha,
            message: commit.commit.message,
            author: {
              name: commit.commit.author.name,
              email: commit.commit.author.email,
              date: commit.commit.author.date
            },
            url: commit.html_url,
            repository: {
              id: repo.id,
              name: repo.name,
              fullName: repo.fullName
            },
            stats: {
              additions: commit.stats?.additions || 0,
              deletions: commit.stats?.deletions || 0,
              total: commit.stats?.total || 0
            }
          }));

          if (commits.length > 0) {
            allCommits.push(...commits);
            repositoryStats.push({
              id: repo.id,
              name: repo.name,
              fullName: repo.fullName,
              commitCount: commits.length
            });
            
            console.log(`  ✅ ${repo.fullName}: ${commits.length} commits by ${userProfile.login}`);
          }

          successfulRepos++;
          
          // Small delay to be respectful to GitHub API
          await new Promise(resolve => setTimeout(resolve, 100));
          
        } catch (error) {
          console.warn(`  ⚠️ Failed to fetch commits from ${repo.fullName}:`, error.message);
          failedRepos++;
          // Continue with other repos even if one fails
        }
      }

      console.log(`📈 Summary: ${allCommits.length} total commits by ${userProfile.login} from ${successfulRepos} repos (${failedRepos} failed)`);

      return {
        commits: allCommits,
        repositories: repositoryStats,
        stats: {
          totalCommits: allCommits.length,
          repositoriesChecked: activeRepos.length,
          repositoriesWithCommits: repositoryStats.length,
          successfulRepos,
          failedRepos,
          dateRange: {
            start: startDate.toISOString(),
            end: endDate.toISOString()
          }
        }
      };

    } catch (error) {
      console.error('❌ Error fetching all user commits:', error.message);
      throw createGitHubError(error, 'fetching commits from all repositories');
    }
  }

  /**
   * Get commit diff/changes
   */
  async getCommitDiff(owner, repo, sha) {
    try {
      const { data } = await this.octokit.rest.repos.getCommit({
        owner,
        repo,
        ref: sha
      });

      return {
        sha: data.sha,
        message: data.commit.message,
        author: {
          name: data.commit.author.name,
          email: data.commit.author.email,
          date: data.commit.author.date
        },
        stats: {
          additions: data.stats.additions,
          deletions: data.stats.deletions,
          total: data.stats.total
        },
        files: data.files.map(file => ({
          filename: file.filename,
          status: file.status, // added, modified, removed, renamed
          additions: file.additions,
          deletions: file.deletions,
          changes: file.changes,
          patch: file.patch || null // The actual diff
        }))
      };
    } catch (error) {
      console.error(`❌ Error fetching commit diff for ${sha}:`, error.message);
      throw createGitHubError(error, `fetching commit diff for ${sha}`);
    }
  }

  /**
   * Check API rate limit status
   */
  async getRateLimit() {
    try {
      const { data } = await this.octokit.rest.rateLimit.get();
      return {
        limit: data.rate.limit,
        remaining: data.rate.remaining,
        reset: new Date(data.rate.reset * 1000),
        used: data.rate.used
      };
    } catch (error) {
      console.error('❌ Error checking rate limit:', error.message);
      throw createGitHubError(error, 'checking rate limit');
    }
  }
}

export default GitHubService; 