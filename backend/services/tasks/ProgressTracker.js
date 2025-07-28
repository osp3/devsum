/**
 * Progress Tracker Service - Functional Pattern
 * Manages progress tracking for long-running operations like summary generation
 * Follows the functional pattern established by AICoordinator and CacheManager
 */

// Module-level state (equivalent to singleton pattern)
const jobs = new Map(); // jobId -> { progress, status, message, startTime }

/**
 * Start tracking a new job
 * @param {string} jobId - Unique identifier for the job
 * @param {string} initialMessage - Initial status message
 * @returns {string} jobId
 */
export const startJob = (jobId, initialMessage = "Starting...") => {
  jobs.set(jobId, {
    progress: 0,
    status: 'running',
    message: initialMessage,
    startTime: Date.now(),
    steps: []
  });
  
  console.log(`🚀 Started job ${jobId}: ${initialMessage}`);
  return jobId;
};

/**
 * Update job progress
 * @param {string} jobId - Job identifier
 * @param {number} progress - Progress percentage (0-100)
 * @param {string} message - Status message
 * @param {string} step - Current step description
 * @returns {boolean} Success status
 */
export const updateProgress = (jobId, progress, message, step = null) => {
  const job = jobs.get(jobId);
  if (!job) {
    console.warn(`⚠️ Job ${jobId} not found for progress update`);
    return false;
  }

  job.progress = Math.max(0, Math.min(100, progress));
  job.message = message;
  if (step) job.steps.push({ step, timestamp: Date.now(), progress });
  
  console.log(`📊 Job ${jobId}: ${progress}% - ${message}`);
  return true;
};

/**
 * Complete a job
 * @param {string} jobId - Job identifier
 * @param {any} result - Job result data
 * @returns {boolean} Success status
 */
export const completeJob = (jobId, result = null) => {
  const job = jobs.get(jobId);
  if (!job) {
    console.warn(`⚠️ Job ${jobId} not found for completion`);
    return false;
  }

  job.progress = 100;
  job.status = 'completed';
  job.message = 'Completed successfully';
  job.result = result;
  job.endTime = Date.now();
  job.duration = job.endTime - job.startTime;

  console.log(`✅ Job ${jobId} completed in ${job.duration}ms`);
  return true;
};

/**
 * Mark job as failed
 * @param {string} jobId - Job identifier
 * @param {string} error - Error message
 * @returns {boolean} Success status
 */
export const failJob = (jobId, error) => {
  const job = jobs.get(jobId);
  if (!job) {
    console.warn(`⚠️ Job ${jobId} not found for failure`);
    return false;
  }

  job.status = 'failed';
  job.error = error;
  job.endTime = Date.now();
  job.duration = job.endTime - job.startTime;

  console.log(`❌ Job ${jobId} failed: ${error}`);
  return true;
};

/**
 * Get job status
 * @param {string} jobId - Job identifier
 * @returns {object|null} Job status or null if not found
 */
export const getJobStatus = (jobId) => {
  const job = jobs.get(jobId);
  if (!job) return null;

  return {
    jobId,
    progress: job.progress,
    status: job.status,
    message: job.message,
    steps: job.steps,
    duration: job.endTime ? job.duration : Date.now() - job.startTime,
    result: job.result,
    error: job.error
  };
};

/**
 * Get all active jobs (for debugging)
 * @returns {Array} Array of all job statuses
 */
export const getAllJobs = () => {
  const allJobs = [];
  for (const [jobId] of jobs) {
    const status = getJobStatus(jobId);
    if (status) allJobs.push(status);
  }
  return allJobs;
};

/**
 * Clean up old completed jobs (older than 1 hour)
 * @returns {number} Number of jobs cleaned up
 */
export const cleanup = () => {
  const oneHourAgo = Date.now() - (60 * 60 * 1000);
  let cleanedCount = 0;
  
  for (const [jobId, job] of jobs) {
    if (job.endTime && job.endTime < oneHourAgo) {
      jobs.delete(jobId);
      cleanedCount++;
      console.log(`🧹 Cleaned up old job: ${jobId}`);
    }
  }
  
  return cleanedCount;
};

/**
 * Get current jobs count for monitoring
 * @returns {object} Jobs statistics
 */
export const getStats = () => {
  const stats = {
    total: jobs.size,
    running: 0,
    completed: 0,
    failed: 0
  };
  
  for (const [, job] of jobs) {
    stats[job.status]++;
  }
  
  return stats;
};

// Clean up old jobs every 30 minutes
setInterval(() => {
  const cleaned = cleanup();
  if (cleaned > 0) {
    console.log(`🧹 Cleanup completed: removed ${cleaned} old jobs`);
  }
}, 30 * 60 * 1000);

// Export all functions as default for backwards compatibility
export default {
  startJob,
  updateProgress,
  completeJob,
  failJob,
  getJobStatus,
  getAllJobs,
  cleanup,
  getStats
}; 