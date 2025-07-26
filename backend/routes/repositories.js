import express from 'express';
import { ensureAuthenticated, ensureGitHubToken } from '../middleware/auth.js';
import RepositoryController from '../controllers/RepositoryController.js';

// Destructure methods for cleaner route definitions
const { getUserRepositories, getRepositoryCommits, getCommitDiff } = RepositoryController;

const router = express.Router();

// Apply authentication middleware to ALL routes in this router
router.use(ensureAuthenticated);
router.use(ensureGitHubToken);

/**
 * Repository Routes for GitHub repository and commit management
 * All routes automatically protected by router-level authentication middleware
 */

// Get user's repositories
router.get('/', getUserRepositories);

// Get commits for a specific repository
router.get('/:owner/:repo/commits', getRepositoryCommits);

// Get specific commit with diff
router.get('/:owner/:repo/commits/:sha', getCommitDiff);

export default router; 