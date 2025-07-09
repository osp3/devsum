import express from 'express';
import AIController from '../controllers/AIController.js';
import { ensureAuthenticated } from '../middleware/auth.js';

const router = express.Router();

// Destructure methods for cleaner route definitions
const { 
  analyzeCommits, 
  generateDailySummary, 
  generateTaskSuggestions, 
  getAnalysisHistory,
  getDashboardAnalytics 
} = AIController;

/**
 * AI Analytics Routes
 * All routes require user authentication only (no GitHub token needed)
 * AI routes analyze pre-fetched commit data, not GitHub API calls
 */

// Analyze commits with AI categorization
router.post('/analyze-commits', ensureAuthenticated, analyzeCommits);

// Generate daily development summary
router.post('/daily-summary', ensureAuthenticated, generateDailySummary);

// Generate task suggestions based on recent work
router.post('/task-suggestions', ensureAuthenticated, generateTaskSuggestions);

// Get analysis history for a repository
router.get('/history/:repositoryId', ensureAuthenticated, getAnalysisHistory);

// Get comprehensive dashboard analytics (combines multiple AI features)
router.post('/dashboard-analytics', ensureAuthenticated, getDashboardAnalytics);

console.log('✅ AI routes loaded successfully');

export default router; 