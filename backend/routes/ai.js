import express from 'express';
import { 
  analyzeCommits, 
  generateDailySummary, 
  generateTaskSuggestions, 
  suggestCommitMessage,
  getAnalysisHistory,
  analyzeCodeQuality,
  getQualityTrends,
  generateYesterdaySummary
} from '../controllers/AIController.js';
import { ensureAuthenticated, ensureRepoAccess } from '../middleware/auth.js';
import { aiRateLimit } from '../middleware/rateLimit.js';
import { aiAccess } from '../middleware/aiAccess.js';

const router = express.Router();

// Apply authentication middleware to ALL routes in this router
router.use(ensureAuthenticated, aiRateLimit, aiAccess());

/**
 * AI Analytics Routes
 * All routes automatically protected by router-level ensureAuthenticated middleware
 */

// Analyze commits with AI categorization
router.post('/analyze-commits', analyzeCommits);

// Generate daily development summary
router.post('/daily-summary', ensureRepoAccess, generateDailySummary);

//generate previous day summary for all repositories
router.post('/yesterday-summary', generateYesterdaySummary);

// Generate task suggestions based on recent work
router.post('/task-suggestions', generateTaskSuggestions);

// Suggest improved commit message based on diff
router.post('/suggest-commit-message', suggestCommitMessage);

// Get analysis history for repository  
router.get('/history/:repositoryId', ensureRepoAccess, getAnalysisHistory);

// Quality analysis routes
router.post('/analyze-quality', ensureRepoAccess, analyzeCodeQuality);
router.get('/quality-trends/:repositoryId', ensureRepoAccess, getQualityTrends);

console.log('✅ AI routes loaded successfully');

export default router; 