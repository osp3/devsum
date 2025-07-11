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
        sha = undefined, // branch/commit SHA
        since,
        until
      } = options;

      // const { data } = await this.octokit.rest.repos.listCommits({
      const params = {
        owner,
        repo,
        per_page,
        sha
      };
      if (since) params.since = since;
        if (until) params.until = until;

        const { data } = await this.octokit.rest.repos.listCommits(params);

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