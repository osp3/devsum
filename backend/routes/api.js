import express from 'express';
import { ensureAuthenticated, ensureGitHubToken } from '../middleware/auth.js';
import RepositoryController from '../controllers/RepositoryController.js';

// Destructure methods for cleaner route definitions
const { getUserRepositories, getRepositoryCommits, getCommitDiff, getRateLimit } = RepositoryController;

const router = express.Router();

/**
 * API Routes for GitHub repository and commit management
 * All routes require GitHub authentication
 */
// Common middleware chain for performance
const authMiddleware = [ensureAuthenticated, ensureGitHubToken];

// Get user's repositories
router.get('/repos', ...authMiddleware, getUserRepositories);

// Get commits for a specific repository
router.get('/repos/:owner/:repo/commits', ...authMiddleware, getRepositoryCommits);

// Get specific commit with diff
router.get('/repos/:owner/:repo/commits/:sha', ...authMiddleware, getCommitDiff);

// Get GitHub API rate limit status
router.get('/github/rate-limit', ...authMiddleware, getRateLimit);

export default router; 