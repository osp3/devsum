import express from 'express';
import { ensureAuthenticated, ensureGitHubToken } from '../middleware/auth.js';
import CacheController from '../controllers/CacheController.js';

// Destructure methods for cleaner route definitions
const { clearCommitsCache, clearQualityCache, clearAllRepositoryCache } = CacheController;

const router = express.Router();

// Apply authentication middleware to ALL routes in this router
router.use(ensureAuthenticated);
router.use(ensureGitHubToken);

/**
 * Cache Management Routes
 * All routes automatically protected by router-level authentication middleware
 */

// Clear commits cache for a specific repository
router.delete('/repos/:owner/:repo/commits', clearCommitsCache);

// Clear quality analysis cache for a specific repository
router.delete('/repos/:owner/:repo/quality', clearQualityCache);

// Clear all cache for a specific repository
router.delete('/repos/:owner/:repo/all', clearAllRepositoryCache);

export default router; 