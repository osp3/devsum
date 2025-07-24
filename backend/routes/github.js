import express from 'express';
import { ensureAuthenticated, ensureGitHubToken } from '../middleware/auth.js';
import RepositoryController from '../controllers/RepositoryController.js';

// Destructure methods for cleaner route definitions
const { getRateLimit } = RepositoryController;

const router = express.Router();

// Apply authentication middleware to ALL routes in this router
router.use(ensureAuthenticated);
router.use(ensureGitHubToken);

/**
 * GitHub API Utility Routes
 * All routes automatically protected by router-level authentication middleware
 */

// Get GitHub API rate limit status
router.get('/rate-limit', getRateLimit);

export default router; 