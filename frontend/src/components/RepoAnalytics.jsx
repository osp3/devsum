import React, { useState, useEffect, useRef } from 'react';
import UserHeader from './UserHeader';
import RepoHeader from './RepoHeader.jsx';
import RepoMetricDisplay from './RepoMetricDisplay.jsx';
import RecentCommits from './RecentCommits.jsx';

// Main repository analytics page component
const RepoAnalytics = ({ user, selectedRepo }) => {
  // State management for commit data and UI feedback
  const [commits, setCommits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // State management for quality analysis
  const [qualityAnalysis, setQualityAnalysis] = useState(null);
  const [qualityLoading, setQualityLoading] = useState(false); // For automatic loading
  const [isRefreshing, setIsRefreshing] = useState(false); // For manual refresh button
  const [qualityError, setQualityError] = useState(null);

  // Track the last fetched repository to prevent unnecessary re-fetches
  const lastFetchedRepo = useRef(null);
  const lastAnalyzedRepo = useRef(null); // Track which repo we've analyzed

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
      console.log(`🔄 Manual refresh of quality analysis for ${repo.fullName}...`);
    } else {
      setQualityLoading(true);
      console.log(`📦 Loading quality analysis for ${repo.fullName} (cache enabled)...`);
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
        const cacheStatus = forceRefresh ? 'refreshed' : 'loaded from cache';
        console.log(`📊 Quality analysis ${cacheStatus} for ${repo.fullName}`);
      } else {
        throw new Error('Failed to analyze code quality');
      }
    } catch (error) {
      console.error('Quality analysis error:', error);
      setQualityError(error.message);
      // Reset the ref on error so retry is possible
      lastAnalyzedRepo.current = null;
    } finally {
      // Clear appropriate loading state
      if (forceRefresh) {
        setIsRefreshing(false);
      } else {
        setQualityLoading(false);
      }
    }
  };

  // Refresh quality analysis with cache invalidation
  const refreshQualityAnalysis = async () => {
    if (!commits || commits.length === 0 || !selectedRepo) return;

    // Use forceRefresh = true for manual refresh
    await fetchQualityAnalysis(commits, selectedRepo, true);
  };

  // Auto-fetch commits when repository selection changes
  useEffect(() => {
    if (selectedRepo) {
      fetchCommits(selectedRepo);
    }
  }, [selectedRepo]);

  // Auto-fetch quality analysis when commits are loaded (use cache)
  useEffect(() => {
    if (commits.length > 0 && selectedRepo && !qualityAnalysis) {
      // Check if we've already analyzed this repo to prevent duplicate analysis on navigation
      if (lastAnalyzedRepo.current === selectedRepo.fullName) {
        console.log(`📦 Already analyzed ${selectedRepo.fullName}, skipping duplicate analysis`);
        return;
      }
      
      // Only fetch if we don't already have quality analysis data
      console.log(`📦 No existing quality analysis found, fetching for ${selectedRepo.fullName}...`);
      lastAnalyzedRepo.current = selectedRepo.fullName;
      fetchQualityAnalysis(commits, selectedRepo, false);
    } else if (commits.length > 0 && selectedRepo && qualityAnalysis) {
      console.log(`📦 Quality analysis already exists for ${selectedRepo.fullName}, skipping fetch`);
      lastAnalyzedRepo.current = selectedRepo.fullName; // Mark as analyzed
    }
  }, [commits, selectedRepo]);

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

          {/* Quality analysis status - show loading only during automatic load, not manual refresh */}
          {qualityLoading && (
            <div className="flex justify-center items-center h-32">
              <div className="text-gray-300">Analyzing code quality...</div>
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
