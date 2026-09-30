import { Octokit } from '@octokit/rest';
import { createGitHubError } from '../../utils/errors.js';
import { mapWithConcurrency } from '../../utils/concurrency.js';

/**
 * GitHub API Client - Functional Pattern
 * Handles all GitHub API interactions with proper error handling and rate limiting
 * Pure functions for reliable API communication
 */

/**
 * Create GitHub API client with access token
 * @param {string} accessToken - GitHub access token
 * @returns {Object} GitHub API client with all methods
 */
export const createGitHubClient = (accessToken) => {
  const octokit = new Octokit({
    auth: accessToken,
    request: {
      timeout: 10000 // 10 second timeout
    }
  });

  return {
    getUserRepos: () => getUserRepos(octokit),
    getCommits: (owner, repo, options = {}) => getCommits(octokit, owner, repo, options),
    getCommitDiff: (owner, repo, sha) => getCommitDiff(octokit, owner, repo, sha),
    getRateLimit: () => getRateLimit(octokit),
    hasRepoAccess: (owner, repo) => hasRepoAccess(octokit, owner, repo),
    getRecentActivity: (repos, since, until) => getRecentActivity(octokit, repos, since, until)
  };
};

/**
 * Get user's repositories with pagination support
 * @param {Octokit} octokit - Authenticated Octokit instance
 * @returns {Promise<Array>} Array of repository objects
 */
export const getUserRepos = async (octokit) => {
  try {
    const allRepos = [];
    let page = 1;
    const perPage = 100;
    
    console.log(`🔄 Starting to fetch repositories for user...`);
    
    // Debug: Check what scopes the token has
    try {
      const { headers } = await octokit.rest.users.getAuthenticated();
      const scopes = headers['x-oauth-scopes'] || 'unknown';
      console.log(`🔑 DEBUG - Token scopes: ${scopes}`);
      
      if (!scopes.includes('repo')) {
        console.warn(`⚠️  WARNING - Token does not have 'repo' scope, private repositories will not be accessible`);
      }
    } catch (scopeError) {
      console.warn(`⚠️  Could not verify token scopes:`, scopeError.message);
    }
    
    while (true) {
      const { data } = await octokit.rest.repos.listForAuthenticatedUser({
        sort: 'updated',
        per_page: perPage,
        page: page,
        type: 'all'
      });
      
      console.log(`📥 Fetched ${data.length} repositories from page ${page}`);
      
      // Add repos from this page to the total
      allRepos.push(...data);
      
      // If we got less than perPage, we've reached the end
      if (data.length < perPage) {
        break;
      }
      
      page++;
      
      // Safety check to prevent infinite loops
      if (page > 50) { // Max 5000 repos (50 pages * 100 per page)
        console.warn('⚠️  Reached maximum page limit (50) - stopping pagination');
        break;
      }
    }
    
    console.log(`✅ Successfully fetched ${allRepos.length} total repositories`);
    
    // Debug: Analyze repository visibility
    const publicRepos = allRepos.filter(repo => !repo.private).length;
    const privateRepos = allRepos.filter(repo => repo.private).length;
    console.log(`📊 DEBUG - Repository visibility breakdown:`);
    console.log(`   Public repositories: ${publicRepos}`);
    console.log(`   Private repositories: ${privateRepos}`);
    console.log(`   Total repositories: ${allRepos.length}`);
    
    if (privateRepos === 0) {
      console.log(`⚠️  DEBUG - No private repositories found in API response`);
      console.log(`   This could be due to:`);
      console.log(`   1. User has no private repositories`);
      console.log(`   2. OAuth app lacks 'repo' scope for this user`);
      console.log(`   3. User denied private repo access during OAuth`);
      console.log(`   4. OAuth app is not properly configured for private repos`);
    }
    
    return allRepos.map(repo => ({
      id: repo.id,
      name: repo.name,
      fullName: repo.full_name,
      private: repo.private,
      defaultBranch: repo.default_branch,
      updatedAt: repo.updated_at,
      pushedAt: repo.pushed_at,
      description: repo.description,
      language: repo.language
    }));
  } catch (error) {
    console.error('❌ Error fetching repositories:', error.message);
    console.error('📊 Rate limit info:', await logRateLimit(octokit));
    throw createGitHubError(error, 'fetching user repositories');
  }
};

/**
 * Get commits for a repository
 * @param {Octokit} octokit - Authenticated Octokit instance
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {Object} options - Options for commit fetching
 * @returns {Promise<Array>} Array of commit objects
 */
export const getCommits = async (octokit, owner, repo, options = {}) => {
  try {
    const {
      per_page = 20, // Last 20 commits
      page = 1, // Page number for pagination
      sha = undefined, // branch/commit SHA
      since,
      until,
      includeStats = false // Whether to fetch commit statistics (expensive)
    } = options;

    const params = {
      owner,
      repo,
      per_page,
      page,
      sha
    };
    if (since) params.since = since;
    if (until) params.until = until;

    const { data } = await octokit.rest.repos.listCommits(params);

    // If statistics are requested, fetch them individually (expensive but accurate)
    if (includeStats) {
      console.log(`🔄 Fetching statistics for ${data.length} commits in ${owner}/${repo}...`);
      
      const commitsWithStats = await Promise.all(
        data.map(async (commit) => {
          try {
            const { data: fullCommit } = await octokit.rest.repos.getCommit({
              owner,
              repo,
              ref: commit.sha
            });
            
            return {
              sha: commit.sha,
              message: commit.commit.message,
              author: {
                name: commit.commit.author.name,
                email: commit.commit.author.email,
                date: commit.commit.author.date
              },
              url: commit.html_url,
              parents: commit.parents || [], // Include parents for merge commit detection
              stats: {
                additions: fullCommit.stats?.additions || 0,
                deletions: fullCommit.stats?.deletions || 0,
                total: fullCommit.stats?.total || 0
              }
            };
          } catch (error) {
            console.error(`⚠️  Failed to fetch stats for commit ${commit.sha.substring(0, 7)}:`, error.message);
            // Return commit without stats as fallback
            return {
              sha: commit.sha,
              message: commit.commit.message,
              author: {
                name: commit.commit.author.name,
                email: commit.commit.author.email,
                date: commit.commit.author.date
              },
              url: commit.html_url,
              parents: commit.parents || [], // Include parents for merge commit detection
              stats: {
                additions: 0,
                deletions: 0,
                total: 0
              }
            };
          }
        })
      );
      
      console.log(`✅ Successfully fetched statistics for ${commitsWithStats.length} commits`);
      return commitsWithStats;
    }

    // Default behavior - return commits without statistics for performance
    return data.map(commit => ({
      sha: commit.sha,
      message: commit.commit.message,
      author: {
        name: commit.commit.author.name,
        email: commit.commit.author.email,
        date: commit.commit.author.date
      },
      url: commit.html_url,
      parents: commit.parents || [], // Include parents for merge commit detection
      stats: {
        additions: 0,
        deletions: 0,
        total: 0
      }
    }));
  } catch (error) {
    console.error(`❌ Error fetching commits for ${owner}/${repo}:`, error.message);
    throw createGitHubError(error, `fetching commits for ${owner}/${repo}`);
  }
};

/**
 * Get commit diff/changes
 * @param {Octokit} octokit - Authenticated Octokit instance
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {string} sha - Commit SHA
 * @returns {Promise<Object>} Commit diff data
 */
export const getCommitDiff = async (octokit, owner, repo, sha) => {
  try {
    const { data } = await octokit.rest.repos.getCommit({
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
};

/**
 * Check API rate limit status
 * @param {Octokit} octokit - Authenticated Octokit instance
 * @returns {Promise<Object>} Rate limit information
 */
export const getRateLimit = async (octokit) => {
  try {
    const { data } = await octokit.rest.rateLimit.get();
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
};

/**
 * Check whether the token's user can read a repository
 * @param {Octokit} octokit - Authenticated Octokit instance
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @returns {Promise<boolean>} True if accessible, false if not found or forbidden
 */
export const hasRepoAccess = async (octokit, owner, repo) => {
  try {
    await octokit.rest.repos.get({ owner, repo });
    return true;
  } catch (error) {
    if (error.status === 404 || error.status === 403) return false;
    throw createGitHubError(error, `checking access to ${owner}/${repo}`);
  }
};

const ACTIVITY_BATCH_SIZE = 20;
const ACTIVITY_BATCH_CONCURRENCY = 2;

const REPO_ACTIVITY_FIELDS = `
  defaultBranchRef {
    target {
      ... on Commit {
        history(since: $since, until: $until, first: 30) {
          nodes { oid message author { name date } parents { totalCount } }
        }
      }
    }
  }
  pullRequests(first: 20, orderBy: { field: UPDATED_AT, direction: DESC }) {
    nodes { number title url createdAt mergedAt closedAt author { login } }
  }`;

const toPullRequestActivity = (pr, repo, sinceMs, untilMs) => {
  const within = (iso) => {
    const time = iso ? Date.parse(iso) : NaN;
    return time >= sinceMs && time <= untilMs;
  };
  const action = within(pr.mergedAt) ? 'merged' : within(pr.closedAt) ? 'closed' : within(pr.createdAt) ? 'opened' : null;
  if (!action) return null;

  return {
    number: pr.number,
    title: pr.title,
    url: pr.url,
    action,
    author: pr.author?.login || 'ghost',
    repository: repo.name
  };
};

const fetchActivityBatch = async (octokit, batch, since, until) => {
  const variables = { since: since.toISOString(), until: until.toISOString() };
  const declarations = ['$since: GitTimestamp!', '$until: GitTimestamp!'];
  const fields = batch.map((repo, i) => {
    const [owner, name] = repo.fullName.split('/');
    variables[`o${i}`] = owner;
    variables[`n${i}`] = name;
    declarations.push(`$o${i}: String!`, `$n${i}: String!`);
    return `r${i}: repository(owner: $o${i}, name: $n${i}) {${REPO_ACTIVITY_FIELDS}}`;
  });

  let data;
  try {
    data = await octokit.graphql(`query(${declarations.join(', ')}) {${fields.join('\n')}}`, variables);
  } catch (error) {
    // Partial results are still usable when only some repositories fail
    if (!error.data) throw createGitHubError(error, 'fetching recent activity');
    data = error.data;
  }

  const sinceMs = since.getTime();
  const untilMs = until.getTime();
  return batch.map((repo, i) => {
    const node = data[`r${i}`];
    return {
      repo,
      commits: (node?.defaultBranchRef?.target?.history?.nodes || []).map(commit => ({
        sha: commit.oid,
        message: commit.message,
        author: { name: commit.author?.name, date: commit.author?.date },
        parents: Array.from({ length: commit.parents.totalCount }, () => ({}))
      })),
      pullRequests: (node?.pullRequests?.nodes || [])
        .map(pr => toPullRequestActivity(pr, repo, sinceMs, untilMs))
        .filter(Boolean)
    };
  });
};

/**
 * Get default-branch commits and pull request activity for many repositories via batched GraphQL
 * @param {Octokit} octokit - Authenticated Octokit instance
 * @param {Array} repos - Repositories with fullName
 * @param {Date} since - Range start
 * @param {Date} until - Range end
 * @returns {Promise<Array>} [{ repo, commits, pullRequests }] in input order
 */
export const getRecentActivity = async (octokit, repos, since, until) => {
  const batches = [];
  for (let i = 0; i < repos.length; i += ACTIVITY_BATCH_SIZE) {
    batches.push(repos.slice(i, i + ACTIVITY_BATCH_SIZE));
  }
  const results = await mapWithConcurrency(batches, ACTIVITY_BATCH_CONCURRENCY, batch => fetchActivityBatch(octokit, batch, since, until));
  return results.flat();
};

/**
 * Helper function to log rate limit information for debugging
 * @param {Octokit} octokit - Authenticated Octokit instance
 * @returns {Promise<Object|null>} Rate limit information or null on error
 */
export const logRateLimit = async (octokit) => {
  try {
    const { data } = await octokit.rest.rateLimit.get();
    const rateLimitInfo = {
      limit: data.rate.limit,
      remaining: data.rate.remaining,
      reset: new Date(data.rate.reset * 1000),
      used: data.rate.used
    };
    console.log('📊 Current rate limit status:', rateLimitInfo);
    return rateLimitInfo;
  } catch (error) {
    console.error('Failed to get rate limit info:', error.message);
    return null;
  }
};

/**
 * Default export for backwards compatibility
 * Creates a GitHub client factory function that maintains the same interface
 */
const GitHubService = createGitHubClient;

export default GitHubService; 