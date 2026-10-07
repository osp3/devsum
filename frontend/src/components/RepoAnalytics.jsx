import React, { useState, useEffect, useRef, useCallback } from 'react';
import AppShell from './AppShell.jsx';
import RepoHeader from './RepoHeader.jsx';
import RepoMetricDisplay from './RepoMetricDisplay.jsx';
import RecentCommits from './RecentCommits.jsx';
import LoadingProgressIndicator from './LoadingProgressIndicator.jsx';
import { useProgressTracking } from '../hooks/useProgressTracking.js';

// Main repository analytics page component
const RepoAnalytics = ({
  user,
  selectedRepo,
  qualityJobId = null,
  fetchQualityAnalysis,
  getQualityAnalysis,
  qualityLoading,
  qualityError,
}) => {
  // State management for commit data and UI feedback
  const [commits, setCommits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Local state for manual refresh tracking only
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Simulated progress state for fallback
  const [simulatedProgress, setSimulatedProgress] = useState(0);

  // Real progress tracking for quality analysis (when qualityJobId is provided)
  const {
    progress: realProgress,
    message: realMessage,
    error: progressError,
    isRunning,
  } = useProgressTracking(
    qualityJobId,
    1000,
    !!qualityJobId && (qualityLoading || isRefreshing)
  );

  // Track the last fetched repository to prevent unnecessary re-fetches
  const lastFetchedRepo = useRef(null);

  // Note: Navigation state restoration is no longer needed since quality analysis
  // is now cached at the app level and persists across all navigation

  // Simulate progress when quality analysis loading starts (fallback when no qualityJobId)
  useEffect(() => {
    if ((qualityLoading || isRefreshing) && !qualityJobId) {
      setSimulatedProgress(0);
      const interval = setInterval(() => {
        setSimulatedProgress((prev) => {
          if (prev >= 95) {
            clearInterval(interval);
            return 95; // Stop at 95% until actual completion
          }
          // Simulate realistic progress curve for commit diff analysis
          const increment = prev < 40 ? 6 : prev < 80 ? 3 : 1;
          return Math.min(95, prev + increment);
        });
      }, 1200); // Slower updates for analysis operations

      return () => clearInterval(interval);
    } else {
      setSimulatedProgress(100); // Complete when loading finishes
    }
  }, [qualityLoading, isRefreshing, qualityJobId]);

  // Fetch recent commits for the selected repository
  const fetchCommits = async (repo) => {
    if (!repo) return;

    // Prevent duplicate fetches for the same repository
    if (lastFetchedRepo.current === repo.fullName) {
      console.log(`📦 Skipping duplicate fetch for ${repo.fullName}`);
      return;
    }

    setLoading(true);
    setError(null);
    lastFetchedRepo.current = repo.fullName;

    try {
      // Parse repository owner and name from fullName
      const [owner, name] = repo.fullName.split('/');
      const response = await fetch(
        `${
          import.meta.env.VITE_API_URL
        }/api/repos/${owner}/${name}/commits?per_page=10`,
        {
          credentials: 'include',
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch commits: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        setCommits(data.data.commits);

        // Log the enhancement results
        const enhancedCount = data.data.commits.filter(
          (c) => c.suggestedMessage
        ).length;
        console.log(
          `📊 Fetched ${data.data.commits.length} commits for ${repo.fullName}`
        );
        console.log(
          `✨ ${enhancedCount}/${data.data.commits.length} commits have AI suggested messages`
        );
      } else {
        throw new Error('Failed to load commits');
      }
    } catch (error) {
      console.error('Commit fetch error:', error);
      setError(error.message);
      // Reset the ref on error so retry is possible
      lastFetchedRepo.current = null;
    } finally {
      setLoading(false);
    }
  };

  // Wrapper for app-level quality analysis fetch with local refresh state tracking
  const handleQualityAnalysis = useCallback(
    async (commits, repo, forceRefresh = false) => {
      if (!commits || commits.length === 0 || !repo) return;

      try {
        if (forceRefresh) {
          setIsRefreshing(true);
          console.log(`🔄 Force refresh requested for ${repo.fullName}...`);
        }

        // Use app-level fetch function
        await fetchQualityAnalysis(commits, repo.fullName, forceRefresh);
      } catch (error) {
        console.error('Quality analysis error:', error);
      } finally {
        if (forceRefresh) {
          setIsRefreshing(false);
        }
      }
    },
    [fetchQualityAnalysis]
  );

  // Refresh quality analysis with cache invalidation - uses app-level function
  const handleRefreshQualityAnalysis = async () => {
    if (!commits || commits.length === 0 || !selectedRepo) return;

    // Use app-level refresh function with force refresh
    await handleQualityAnalysis(commits, selectedRepo, true);
  };

  // Auto-fetch commits when repository selection changes
  useEffect(() => {
    if (selectedRepo) {
      fetchCommits(selectedRepo);
    }
  }, [selectedRepo]);

  // Auto-fetch quality analysis when commits are loaded - uses app-level cache
  useEffect(() => {
    if (commits.length > 0 && selectedRepo) {
      const cachedQualityAnalysis = getQualityAnalysis(selectedRepo.fullName);

      if (!cachedQualityAnalysis) {
        // No cached data - fetch from backend (backend will check 4-hour cache first)
        console.log(
          `📦 Fetching quality analysis for ${selectedRepo.fullName} (no app cache, will check backend cache)...`
        );
        handleQualityAnalysis(commits, selectedRepo, false); // false = allow backend to use cache
      } else {
        console.log(
          `📦 Using cached quality analysis for ${selectedRepo.fullName} (app-level cache hit)`
        );
      }
    }
  }, [commits, selectedRepo, getQualityAnalysis, handleQualityAnalysis]);

  // Display prompt when no repository is selected
  if (!selectedRepo) {
    return (
      <AppShell user={user}>
        <div className='flex justify-center items-center h-64'>
          <div className='text-fg/65 text-xl'>
            Please select a repository to view analytics
          </div>
        </div>
      </AppShell>
    );
  }

  // Main analytics dashboard layout
  return (
    <AppShell user={user}>
      {/* Repository header section */}
      <div className='flex justify-center'>
        <RepoHeader selectedRepo={selectedRepo} />
      </div>

      {/* Analytics content container */}
      <div className='panel flex flex-col items-center p-4 gap-6 max-w-6xl mx-4 mb-6 sm:mx-6 xl:mx-auto'>
        {/* Repository metrics display */}
        <RepoMetricDisplay
          selectedRepo={selectedRepo}
          commits={commits}
          loading={loading}
        />

        {/* Quality analysis section */}
        <div className='w-full max-w-4xl'>
          <div className='flex items-center justify-between mb-4'>
            <h2 className='text-lg font-semibold tracking-tight'>Code quality analysis</h2>
            <button
              onClick={handleRefreshQualityAnalysis}
              disabled={isRefreshing}
              className='btn-secondary h-9 border px-4 text-sm cursor-pointer'
            >
              {isRefreshing ? 'Refreshing...' : 'Refresh Analysis'}
            </button>
          </div>

          {/* Quality analysis status - show loading during automatic load and manual refresh */}
          {(qualityLoading || isRefreshing) && (
            <div>
              <LoadingProgressIndicator
                message={
                  qualityJobId && realMessage
                    ? realMessage
                    : isRefreshing
                    ? 'Refreshing code quality analysis...'
                    : 'Analyzing code quality and commit diffs...'
                }
                size='medium'
                showSpinner={true}
                showProgressBar={true}
                progress={qualityJobId ? realProgress : simulatedProgress}
              />
              {/* Show additional progress info for real tracking */}
              {qualityJobId && realMessage && (
                <div className='text-center font-geist-mono text-xs text-fg/60 mt-2'>
                  Job ID: {qualityJobId}
                </div>
              )}
              {progressError && (
                <div className='text-center text-xs text-node-red mt-2'>
                  Progress Error: {progressError}
                </div>
              )}
              {qualityJobId && isRunning && (
                <div className='text-center text-xs text-steam mt-1'>
                  Real-time progress tracking active
                </div>
              )}
              {isRefreshing && !qualityJobId && (
                <div className='text-center text-xs text-node-yellow mt-1'>
                  Manual refresh in progress
                </div>
              )}
            </div>
          )}

          {qualityError && (
            <div className='flex justify-center items-center h-32'>
              <div className='text-node-red'>Error: {qualityError}</div>
            </div>
          )}
        </div>

        {/* Recent commits list */}
        <RecentCommits
          commits={commits}
          loading={loading}
          error={error}
          qualityAnalysis={getQualityAnalysis(selectedRepo?.fullName)}
          repositoryId={selectedRepo?.fullName}
        />
      </div>
    </AppShell>
  );
};

export default RepoAnalytics;
