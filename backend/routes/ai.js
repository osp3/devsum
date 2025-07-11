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
import { ensureAuthenticated } from '../middleware/auth.js';

const router = express.Router();

// Apply authentication middleware to ALL routes in this router
router.use(ensureAuthenticated);

/**
 * AI Analytics Routes
 * All routes automatically protected by router-level ensureAuthenticated middleware
 */

// Analyze commits with AI categorization
router.post('/analyze-commits', analyzeCommits);

// Generate daily development summary
router.post('/daily-summary', generateDailySummary);

//generate previous day summary for all repositories
router.get('/yesterday-summary', generateYesterdaySummary);

// Generate task suggestions based on recent work
router.post('/task-suggestions', generateTaskSuggestions);

// Suggest improved commit message based on diff
router.post('/suggest-commit-message', suggestCommitMessage);

// Get analysis history for repository  
router.get('/history/:repositoryId', getAnalysisHistory);

// Quality analysis routes
router.post('/analyze-quality', analyzeCodeQuality);
router.get('/quality-trends/:repositoryId', getQualityTrends);

console.log('✅ AI routes loaded successfully');

export default router; 