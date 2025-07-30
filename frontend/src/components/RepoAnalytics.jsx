import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import UserHeader from './UserHeader';
import RepoHeader from './RepoHeader.jsx';
import RepoMetricDisplay from './RepoMetricDisplay.jsx';
import RecentCommits from './RecentCommits.jsx';
import LoadingProgressIndicator from './LoadingProgressIndicator.jsx';
import { useProgressTracking } from '../hooks/useProgressTracking.js';

// Main repository analytics page component
const RepoAnalytics = ({ user, selectedRepo, qualityJobId = null }) => {
  const location = useLocation();
  
  // State management for commit data and UI feedback
  const [commits, setCommits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // State management for quality analysis
  const [qualityAnalysis, setQualityAnalysis] = useState(null);
  const [qualityLoading, setQualityLoading] = useState(false); // For automatic loading
  const [isRefreshing, setIsRefreshing] = useState(false); // For manual refresh button
  const [qualityError, setQualityError] = useState(null);

  // Simulated progress state for fallback
  const [simulatedProgress, setSimulatedProgress] = useState(0);

  // Real progress tracking for quality analysis (when qualityJobId is provided)
  const { 
    progress: realProgress, 
    message: realMessage, 
    error: progressError,
    isRunning 
  } = useProgressTracking(qualityJobId, 1000, !!qualityJobId && (qualityLoading || isRefreshing));

  // Track the last fetched repository to prevent unnecessary re-fetches
  const lastFetchedRepo = useRef(null);

  // Restore quality analysis data when navigating back from CommitAnalysis
  useEffect(() => {
    if (location.state?.preserveQualityAnalysis && location.state?.repositoryId === selectedRepo?.fullName) {
      console.log(`🔄 Restoring cached quality analysis for ${selectedRepo.fullName}`);
      setQualityAnalysis(location.state.preserveQualityAnalysis);
      
      // Clear the navigation state to prevent restoring on subsequent renders
      window.history.replaceState({}, document.title);
    }
  }, [location.state, selectedRepo]);

  // Simulate progress when quality analysis loading starts (fallback when no qualityJobId)
  useEffect(() => {
    if ((qualityLoading || isRefreshing) && !qualityJobId) {
      setSimulatedProgress(0);
      const interval = setInterval(() => {
        setSimulatedProgress(prev => {
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

  // Fetch quality analysis for the commits
  const fetchQualityAnalysis = async (commits, repo, forceRefresh = false) => {
    if (!commits || commits.length === 0 || !repo) return;

    // Set appropriate loading state based on whether this is manual refresh or automatic
    if (forceRefresh) {
      setIsRefreshing(true);
      console.log(`🔄 Force refresh requested - bypassing cache and calling OpenAI for ${repo.fullName}...`);
    } else {
      setQualityLoading(true);
      console.log(`📦 Requesting quality analysis for ${repo.fullName} (backend will check cache first, call OpenAI only if cache miss)...`);
    }
    
    setQualityError(null);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/ai/analyze-quality`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            commits: commits,
            repositoryId: repo.fullName,
            timeframe: 'weekly',
            repositoryFullName: repo.fullName,
            forceRefresh: forceRefresh, // Explicitly pass the forceRefresh value
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch quality analysis: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        setQualityAnalysis(data.data);
        if (forceRefresh) {
          console.log(`✅ Quality analysis refreshed (fresh OpenAI call) for ${repo.fullName}`);
        } else {
          console.log(`✅ Quality analysis received for ${repo.fullName} (backend determined cache vs OpenAI)`);
        }
      } else {
        throw new Error('Failed to analyze code quality');
      }
    } catch (error) {
      console.error('Quality analysis error:', error);
      setQualityError(error.message);
    } finally {
      // Clear appropriate loading state
      if (forceRefresh) {
        setIsRefreshing(false);
      } else {
        setQualityLoading(false);
      }
    }
  };

  // Refresh quality analysis with cache invalidation - ONLY way to bypass backend cache
  const refreshQualityAnalysis = async () => {
    if (!commits || commits.length === 0 || !selectedRepo) return;

    // Use forceRefresh = true to bypass backend cache and call OpenAI directly
    await fetchQualityAnalysis(commits, selectedRepo, true);
  };

  // Auto-fetch commits when repository selection changes
  useEffect(() => {
    if (selectedRepo) {
      fetchCommits(selectedRepo);
    }
  }, [selectedRepo]);

  // Auto-fetch quality analysis when commits are loaded - backend handles cache vs OpenAI decision
  useEffect(() => {
    if (commits.length > 0 && selectedRepo && !qualityAnalysis) {
      // Only fetch if we don't already have quality analysis data (e.g., from navigation state)
      // Always call backend API - backend will check 4-hour cache first, only call OpenAI on cache miss
      // This ensures we always get the latest cached data without unnecessary API calls
      console.log(`📦 Fetching quality analysis for ${selectedRepo.fullName} (backend will check cache first)...`);
      fetchQualityAnalysis(commits, selectedRepo, false); // false = allow backend to use cache
    } else if (qualityAnalysis) {
      console.log(`📦 Quality analysis already available for ${selectedRepo?.fullName}, skipping fetch`);
    }
  }, [commits, selectedRepo, qualityAnalysis]);

  // Display prompt when no repository is selected
  if (!selectedRepo) {
    return (
      <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)' }}>
        <UserHeader user={user} />
        <div className="flex justify-center items-center h-64">
          <div className="text-white text-xl">
            Please select a repository to view analytics
          </div>
        </div>
      </div>
    );
  }

  // Main analytics dashboard layout
  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)' }}>
      <UserHeader user={user} />

      {/* Repository header section */}
      <div className="flex justify-center">
        <RepoHeader selectedRepo={selectedRepo} />
      </div>

      {/* Analytics content container */}
      <div className="flex flex-col  items-center  border border-slate-400   rounded-2xl  p-4 gap-6 max-w-6xl mx-auto ">
        {/* Repository metrics display */}
        <RepoMetricDisplay
          selectedRepo={selectedRepo}
          commits={commits}
          loading={loading}
        />

        {/* Quality analysis section */}
        <div className="w-full max-w-4xl">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white text-xl">Code Quality Analysis</h2>
            <button
              onClick={refreshQualityAnalysis}
              disabled={isRefreshing}
              className={`px-4 py-2 rounded-lg text-white font-medium transition-colors ${
                isRefreshing
                  ? 'bg-gray-600 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 cursor-pointer'
              }`}
            >
              {isRefreshing ? 'Refreshing...' : ' Refresh Analysis'}
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
                      ? "Refreshing code quality analysis..." 
                      : "Analyzing code quality and commit diffs..."
                } 
                size="medium"
                showSpinner={true}
                showProgressBar={true}
                progress={qualityJobId ? realProgress : simulatedProgress}
              />
              {/* Show additional progress info for real tracking */}
              {qualityJobId && realMessage && (
                <div className="text-center text-xs text-gray-400 mt-2">
                  Job ID: {qualityJobId}
                </div>
              )}
              {progressError && (
                <div className="text-center text-xs text-red-400 mt-2">
                  Progress Error: {progressError}
                </div>
              )}
              {qualityJobId && isRunning && (
                <div className="text-center text-xs text-blue-400 mt-1">
                  Real-time progress tracking active
                </div>
              )}
              {isRefreshing && !qualityJobId && (
                <div className="text-center text-xs text-yellow-400 mt-1">
                  Manual refresh in progress
                </div>
              )}
            </div>
          )}

          {qualityError && (
            <div className="flex justify-center items-center h-32">
              <div className="text-red-400">Error: {qualityError}</div>
            </div>
          )}
        </div>

        {/* Recent commits list */}
        <RecentCommits 
          commits={commits} 
          loading={loading} 
          error={error} 
          qualityAnalysis={qualityAnalysis}
          repositoryId={selectedRepo?.fullName}
        />
      </div>
    </div>
  );
};

export default RepoAnalytics;
