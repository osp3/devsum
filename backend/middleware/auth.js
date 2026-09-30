import { createAuthError, createValidationError, createNotFoundError } from '../utils/errors.js';
import GitHubService from '../services/external/GitHubAPIClient.js';

const REPO_ACCESS_TTL_MS = 5 * 60 * 1000;
const REPO_NAME_PATTERN = /^[\w.-]+\/[\w.-]+$/;
const repoAccessCache = new Map();

/**
 * Authentication Middleware
 * Provides route protection and user verification utilities
 */

// Middleware to ensure user is authenticated
export const ensureAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  
  const err = createAuthError('Authentication required', `accessing ${req.path}`);
  return next(err);
};

// Middleware to ensure user has GitHub access token
export const ensureGitHubToken = async (req, res, next) => {
  if (!req.user) {
    const err = createAuthError('Authentication required', 'GitHub token check');
    return next(err);
  }
  
  // Check if user has valid GitHub access token
  if (!req.user.accessToken) {
    const err = createAuthError('GitHub token missing - please re-authenticate', `user: ${req.user.username}`);
    return next(err);
  }
  
  return next();
};

// Middleware to ensure the user can read the requested repository before serving shared cached data
export const ensureRepoAccess = async (req, res, next) => {
  const { owner, repo, repositoryId } = req.params;
  const fullName = owner ? `${owner}/${repo}` : repositoryId || req.body?.repositoryId;

  if (!REPO_NAME_PATTERN.test(fullName || '')) {
    return next(createValidationError('Repository must be in owner/repo format', `user: ${req.user?.username}`));
  }

  const cacheKey = `${req.user._id}:${fullName.toLowerCase()}`;
  if (repoAccessCache.get(cacheKey) > Date.now()) return next();
  repoAccessCache.delete(cacheKey);

  try {
    const [repoOwner, repoName] = fullName.split('/');
    if (!(await GitHubService(req.user.accessToken).hasRepoAccess(repoOwner, repoName))) {
      return next(createNotFoundError('Repository not found', `user: ${req.user.username}, repo: ${fullName}`));
    }
    repoAccessCache.set(cacheKey, Date.now() + REPO_ACCESS_TTL_MS);
    return next();
  } catch (error) {
    return next(error);
  }
};

// Middleware to add user info to request (optional)
export const addUserInfo = (req, res, next) => {
  if (req.user) {
    req.userInfo = {
      id: req.user._id,
      username: req.user.username,
      githubId: req.user.githubId
    };
  }
  return next();
}; 