import { createAuthError } from '../utils/errors.js';

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