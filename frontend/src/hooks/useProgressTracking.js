import { useState, useEffect, useRef } from 'react';

/**
 * Custom hook for tracking job progress via polling
 * @param {string} jobId - Unique job identifier
 * @param {number} pollInterval - Polling interval in milliseconds (default: 1000)
 * @param {boolean} enabled - Whether polling is enabled
 * @returns {object} { progress, status, message, error, isComplete }
 */
export const useProgressTracking = (jobId, pollInterval = 1000, enabled = true) => {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');
  const [error, setError] = useState(null);
  const [isComplete, setIsComplete] = useState(false);
  
  const intervalRef = useRef(null);
  const lastJobIdRef = useRef(null);

  // Reset state when jobId changes
  useEffect(() => {
    if (lastJobIdRef.current !== jobId) {
      setProgress(0);
      setStatus('idle');
      setMessage('');
      setError(null);
      setIsComplete(false);
      lastJobIdRef.current = jobId;
    }
  }, [jobId]);

  // Polling logic
  useEffect(() => {
    const pollProgress = async () => {
      if (!jobId || !enabled) return;

      try {
        const response = await fetch(`/api/progress/${jobId}`);
        const data = await response.json();

        if (response.ok && data.success) {
          setProgress(data.progress || 0);
          setStatus(data.status || 'running');
          setMessage(data.message || '');
          setError(null);
          
          // Stop polling if job is complete or failed
          if (data.status === 'completed' || data.status === 'failed') {
            setIsComplete(true);
            if (intervalRef.current) {
              clearInterval(intervalRef.current);
              intervalRef.current = null;
            }
          }
        } else {
          // Handle 404 (job not found) gracefully
          if (response.status === 404) {
            setError('Job not found');
          } else {
            setError(data.error || 'Unknown error');
          }
        }
      } catch (err) {
        console.error('Progress polling error:', err);
        setError(err.message || 'Network error');
      }
    };

    // Start polling when enabled and jobId exists
    if (enabled && jobId && !isComplete) {
      // Poll immediately
      pollProgress();
      
      // Set up interval polling
      intervalRef.current = setInterval(pollProgress, pollInterval);
    }

    // Cleanup function
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [jobId, enabled, pollInterval, isComplete]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    progress,
    status,
    message,
    error,
    isComplete,
    // Utility methods
    isRunning: status === 'running',
    isFailed: status === 'failed',
    isSuccess: status === 'completed',
  };
}; 