import express from 'express';
import { ensureAuthenticated, ensureGitHubToken } from '../middleware/auth.js';
import RepositoryController from '../controllers/RepositoryController.js';
import settingsRouter from './settings.js';

// Destructure methods for cleaner route definitions
const { getUserRepositories, getRepositoryCommits, getCommitDiff, getRateLimit } = RepositoryController;

const router = express.Router();

// Settings routes (only require authentication, not GitHub token)
router.use('/settings', settingsRouter);

// Apply authentication middleware to ALL routes in this router
router.use(ensureAuthenticated);
router.use(ensureGitHubToken);

/**
 * API Routes for GitHub repository and commit management
 * All routes automatically protected by router-level authentication middleware
 */

// Get user's repositories
router.get('/repos', getUserRepositories);

// Get commits for a specific repository
router.get('/repos/:owner/:repo/commits', getRepositoryCommits);

// Get specific commit with diff
router.get('/repos/:owner/:repo/commits/:sha', getCommitDiff);

// Get GitHub API rate limit status
router.get('/github/rate-limit', getRateLimit);

export default router; 