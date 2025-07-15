import GitHubService from '../services/github.js';
import AIService from '../services/ai.js';
import CacheManager from '../services/CacheManager.js';
import { createValidationError, createServerError, createGitHubError } from '../utils/errors.js';

/**
 * Repository Controller
 * Handles repository and commit management business logic
 * Follows SOLID principles and DRY patterns
 */
class RepositoryController {
  /**
   * Get user's repositories with caching
   */
  static async getUserRepositories(req, res, next) {
    try {
      const { refresh, force } = req.query; // Check for refresh/force parameters
      const forceRefresh = refresh || force; // Support both 'refresh' and 'force' parameters
      const startTime = Date.now();
      
      console.log(`🔄 Fetching repositories for user: ${req.user.username} (GitHub ID: ${req.user.githubId})`);
      console.log(`📊 Request details: refresh=${refresh}, force=${force}, forceRefresh=${forceRefresh}, user agent: ${req.get('user-agent')}`);
      
      const githubService = new GitHubService(req.user.accessToken);
      
      // Check rate limit before making API calls
      try {
        const rateLimit = await githubService.getRateLimit();
        console.log(`📊 Rate limit for ${req.user.username}: ${rateLimit.remaining}/${rateLimit.limit} remaining`);
        
        if (rateLimit.remaining < 10) {
          console.warn(`⚠️  Low rate limit for ${req.user.username}: ${rateLimit.remaining} remaining`);
        }
      } catch (rateLimitError) {
        console.warn(`⚠️  Could not check rate limit for ${req.user.username}:`, rateLimitError.message);
      }
      
      const repos = await githubService.getUserRepos();
      const fetchTime = Date.now() - startTime;
      
      console.log(`✅ Successfully fetched ${repos.length} repositories for ${req.user.username} in ${fetchTime}ms`);
      
      // Log repository breakdown
      const privateRepos = repos.filter(r => r.private).length;
      const publicRepos = repos.length - privateRepos;
      console.log(`📊 Repository breakdown: ${publicRepos} public, ${privateRepos} private`);
      
      // If not forcing refresh, update the user's repository cache
      if (!forceRefresh) {
        await RepositoryController._updateUserRepoCache(req.user, repos);
      }
      
      res.json({
        success: true,
        data: {
          repositories: repos,
          lastUpdated: new Date().toISOString(),
          fromCache: false // Always fresh from GitHub API
        },
        meta: {
          totalRepos: repos.length,
          privateCount: privateRepos,
          publicCount: publicRepos,
          fetchTime: fetchTime
        }
      });
    } catch (error) {
      console.error(`❌ Error fetching repositories for ${req.user.username}:`, error.message);
      const err = error.status 
        ? createGitHubError(error, `fetching repositories for ${req.user.username}`)
        : createServerError('Failed to fetch repositories', `user: ${req.user.username}`);
      return next(err);
    }
  }

  /**
   * Get commits for a specific repository with AI-suggested commit messages
   */
  static async getRepositoryCommits(req, res, next) {
    try {
      const { owner, repo } = req.params;
      const { per_page = 10, include_stats = 'true', force_refresh = 'false' } = req.query;
      
      // Input validation
      const validation = RepositoryController._validateCommitParams(req.params, req.query);
      if (!validation.isValid) {
        const err = createValidationError(validation.message, `${owner}/${repo}`);
        return next(err);
      }
      
      const githubService = new GitHubService(req.user.accessToken);
      const cacheManager = new CacheManager();
      const targetCommitCount = Math.min(parseInt(per_page), 50); // Limit to 50 for security
      const includeStats = include_stats === 'true'; // Store this for later use
      const forceRefresh = force_refresh === 'true';
      
      // Check cache first (unless force refresh is requested)
      if (!forceRefresh) {
        const cachedCommits = await cacheManager.getCachedEnhancedCommits(owner, repo, targetCommitCount);
        if (cachedCommits) {
          console.log(`🚀 Returning ${cachedCommits.length} cached enhanced commits for ${owner}/${repo}`);
          return res.json({
            success: true,
            data: {
              repository: `${owner}/${repo}`,
              commits: cachedCommits,
              total: cachedCommits.length,
              timestamp: new Date().toISOString(),
              includeStats: includeStats,
              aiEnhanced: cachedCommits.filter(c => c.suggestedMessage).length,
              fromCache: true
            }
          });
        }
      }
      
      // Function to filter out merge commits
      const filterMergeCommits = (commits) => {
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
      };
      
      // Keep fetching commits until we have enough non-merge commits
      let allCommits = [];
      let filteredCommits = [];
      let page = 1;
      const maxPages = 5; // Prevent infinite loops
      
      while (filteredCommits.length < targetCommitCount && page <= maxPages) {
        const options = {
          per_page: 20, // Fetch 20 at a time
          includeStats: includeStats,
          page: page
        };
        
        const pageCommits = await githubService.getCommits(owner, repo, options);
        
        // If no more commits, break
        if (pageCommits.length === 0) {
          break;
        }
        
        allCommits = allCommits.concat(pageCommits);
        filteredCommits = filterMergeCommits(allCommits);
        
        console.log(`📊 Page ${page}: Got ${pageCommits.length} commits, ${filteredCommits.length} non-merge commits so far`);
        page++;
      }
      
      // Take only the number we need
      const commits = filteredCommits.slice(0, targetCommitCount);
      
      console.log(`📊 Final result: ${commits.length} non-merge commits out of ${allCommits.length} total commits fetched`);
      
      // Add AI-suggested commit messages to each commit
      const enhancedCommits = await Promise.all(
        commits.map(async (commit) => {
          try {
            // Get the commit diff for AI analysis
            const commitDiff = await githubService.getCommitDiff(owner, repo, commit.sha);
            
            // Generate AI-suggested commit message
            const aiAnalysis = await AIService.analyzeCommitDiff(commit, commitDiff.files.map(f => f.patch || '').join('\n'));
            
            // Add suggested message to the commit
            return {
              ...commit,
              suggestedMessage: aiAnalysis.suggestedMessage
            };
          } catch (error) {
            console.error(`Failed to generate AI suggestion for commit ${commit.sha.substring(0, 7)}:`, error.message);
            
            // Return commit without AI suggestion if analysis fails
            return {
              ...commit,
              suggestedMessage: null
            };
          }
        })
      );
      
      console.log(`✅ Enhanced ${enhancedCommits.filter(c => c.suggestedMessage).length}/${enhancedCommits.length} commits with AI suggestions`);
      
      // Cache the enhanced commits for future requests
      await cacheManager.storeEnhancedCommits(owner, repo, enhancedCommits, targetCommitCount);
      
      res.json({
        success: true,
        data: {
          repository: `${owner}/${repo}`,
          commits: enhancedCommits,
          total: enhancedCommits.length,
          timestamp: new Date().toISOString(),
          includeStats: includeStats,
          aiEnhanced: enhancedCommits.filter(c => c.suggestedMessage).length,
          fromCache: false
        }
      });
    } catch (error) {
      const err = error.status 
        ? createGitHubError(error, `fetching commits for ${req.params.owner}/${req.params.repo}`)
        : createServerError('Failed to fetch commits', `repo: ${req.params.owner}/${req.params.repo}`);
      return next(err);
    }
  }

  /**
   * Get specific commit with diff information
   */
  static async getCommitDiff(req, res, next) {
    try {
      const { owner, repo, sha } = req.params;
      
      // Input validation
      if (!owner || !repo || !sha) {
        const err = createValidationError('Missing required parameters: owner, repo, and sha are required');
        return next(err);
      }
      
      if (sha.length < 7) {
        const err = createValidationError('Invalid SHA: must be at least 7 characters');
        return next(err);
      }
      
      const githubService = new GitHubService(req.user.accessToken);
      const commitDiff = await githubService.getCommitDiff(owner, repo, sha);
      
      res.json({
        success: true,
        data: commitDiff
      });
    } catch (error) {
      const err = error.status 
        ? createGitHubError(error, `fetching commit diff for ${req.params.sha}`)
        : createServerError('Failed to fetch commit diff', `commit: ${req.params.sha}`);
      return next(err);
    }
  }

  /**
   * Get GitHub API rate limit status
   */
  static async getRateLimit(req, res, next) {
    try {
      const githubService = new GitHubService(req.user.accessToken);
      const rateLimit = await githubService.getRateLimit();
      
      res.json({
        success: true,
        data: rateLimit
      });
    } catch (error) {
      const err = error.status 
        ? createGitHubError(error, 'checking rate limit')
        : createServerError('Failed to check rate limit', 'rate limit check');
      return next(err);
    }
  }

  /**
   * Private method to update user's repository cache
   * Follows Single Responsibility Principle
   */
  static async _updateUserRepoCache(user, repos) {
    try {
      user.repositories = repos.map(repo => ({
        id: repo.id,
        name: repo.name,
        fullName: repo.fullName,
        private: repo.private,
        defaultBranch: repo.defaultBranch,
        updatedAt: new Date(repo.updatedAt)
      }));
      
      await user.save();
    } catch (error) {
      console.error('❌ Error updating repository cache:', error.message);
      // Don't throw here - caching failure shouldn't break the main request
    }
  }

  /**
   * Private method to validate commit parameters
   * Follows DRY principle for reusable validation
   */
  static _validateCommitParams(params, query) {
    const { owner, repo } = params;
    const { per_page } = query;
    
    if (!owner || !repo) {
      return {
        isValid: false,
        message: 'owner and repo parameters are required'
      };
    }
    
    if (per_page && (isNaN(per_page) || per_page < 1 || per_page > 100)) {
      return {
        isValid: false,
        message: 'per_page must be a number between 1 and 100'
      };
    }
    
    return { isValid: true };
  }
}

export default RepositoryController; 