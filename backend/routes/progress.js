import express from 'express';
import { getJobStatus, getAllJobs } from '../services/tasks/ProgressTracker.js';

const router = express.Router();

/**
 * GET /api/progress/:jobId
 * Get the progress status of a specific job
 */
router.get('/:jobId', (req, res) => {
  try {
    const { jobId } = req.params;
    
    if (!jobId) {
      return res.status(400).json({ 
        error: 'Job ID is required' 
      });
    }

    const status = getJobStatus(jobId);
    
    if (!status) {
      return res.status(404).json({ 
        error: 'Job not found',
        jobId 
      });
    }

    res.json({
      success: true,
      ...status
    });

  } catch (error) {
    console.error('Error fetching job progress:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
});

/**
 * GET /api/progress
 * Get all active jobs (for debugging)
 */
router.get('/', (req, res) => {
  try {
    const allJobs = getAllJobs();

    res.json({
      success: true,
      jobs: allJobs,
      total: allJobs.length
    });

  } catch (error) {
    console.error('Error fetching all jobs:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
});

export default router; 