import express from 'express';
import { ensureAuthenticated } from '../middleware/auth.js';
import settingsRouter from './settings.js';
import repositoryRoutes from './repositories.js';
import cacheRoutes from './cache.js';
import githubRoutes from './github.js';

const router = express.Router();

/**
 * Main API Router - Coordinates all API endpoints
 * Follows Single Responsibility Principle by delegating to specialized routers
 */

// Settings routes (only require authentication, not GitHub token)
router.use('/settings', ensureAuthenticated, settingsRouter);

// Repository management routes
router.use('/repos', repositoryRoutes);

// Cache management routes  
router.use('/cache', cacheRoutes);

// GitHub API utility routes
router.use('/github', githubRoutes);

export default router; 