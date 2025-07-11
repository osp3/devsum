import { useState, useEffect } from 'react';
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import UserHeader from './components/UserHeader.jsx';
import Login from './components/Login.jsx';
import Dashboard from './components/Dashboard.jsx';
import RepoListing from './components/RepoListing.jsx';
import RepoAnalytics from './components/RepoAnalytics';

// Wrapper component that checks authentication before rendering protected pages
function ProtectedRoute({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(null); // null = checking, true/false = result

  // Verify user session on component mount
  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/auth/me`, { credentials: 'include' })
      .then(response => setIsAuthenticated(response.ok))
      .catch(() => setIsAuthenticated(false));
  }, []);

  if (isAuthenticated === null) return <div>Loading...</div>; // Still checking auth
  if (!isAuthenticated) return <Navigate to="/" replace />; // Redirect to login
  return children; // User is authenticated, show protected content
}

function App() {
  // === SHARED STATE - Single source of truth for entire app ===
  const [repositories, setRepositories] = useState([]); // All user repos - fetched once, cached
  const [selectedRepo, setSelectedRepo] = useState(null); // Currently selected repo - persists across pages
  const [reposLoading, setReposLoading] = useState(false); // Loading state for repo fetching
  const [reposError, setReposError] = useState(null); // Error state for repo fetching
  const [isAuthenticated, setIsAuthenticated] = useState(false); // Triggers repo fetch when true
  
  // Daily summary state - cached at app level to persist across navigation
  const [commitData, setCommitData] = useState(null); // Today's commit summary data
  const [commitLoading, setCommitLoading] = useState(false); // Loading state for commit fetching
  const [commitError, setCommitError] = useState(null); // Error state for commit fetching
  
  // Repository analysis cache - cached at app level to persist across navigation
  const [analysisCache, setAnalysisCache] = useState({}); // Keyed by repo ID: { repoId: { commits, qualityAnalysis, timestamp } }
  const [currentAnalysisLoading, setCurrentAnalysisLoading] = useState(false); // Loading state for current analysis

  // Fetch all user repositories - called once on login, cached for entire session
  const fetchRepositories = async () => {
    setReposLoading(true);
    setReposError(null);
    
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/repos`,
        { credentials: 'include' }
      );
      
      if (!response.ok) {
        throw new Error(`Failed to fetch repositories: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        setRepositories(data.data.repositories);
        
        // Auto-select first repo so Dashboard has data to display immediately
        if (data.data.repositories.length > 0) {
          setSelectedRepo(prev => prev || data.data.repositories[0]);
        }
      } else {
        throw new Error('Failed to load repositories');
      }
    } catch (error) {
      console.error('Repository fetch error:', error);
      setReposError(error.message);
    } finally {
      setReposLoading(false);
    }
  };

  // Fetch daily commit summary - called once on login, cached for entire session
  const fetchDailySummary = async (targetDate = new Date()) => {
    setCommitLoading(true);
    setCommitError(null);
    
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/ai/daily-summary`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            date: targetDate.toISOString().split('T')[0],
          }),
        }
      );

      const result = await response.json();
      
      if (result.success) {
        setCommitData(result.data);
        console.log('Daily commit data cached at app level:', result.data);
      } else {
        throw new Error(result.error || 'Failed to fetch commits');
      }
    } catch (error) {
      console.error('Commit fetch error:', error);
      setCommitError(error.message);
      setCommitData(null);
    } finally {
      setCommitLoading(false);
    }
  };

  // === REPOSITORY ANALYSIS CACHE MANAGEMENT ===
  
  // Get cached analysis for a repository
  const getCachedAnalysis = (repoId) => {
    const cached = analysisCache[repoId];
    if (!cached) return null;
    
    // Check if cache is still valid (within 24 hours)
    const cacheAge = Date.now() - cached.timestamp;
    const twentyFourHours = 24 * 60 * 60 * 1000;
    
    if (cacheAge > twentyFourHours) {
      console.log(`Cache expired for repo ${repoId}, age: ${Math.round(cacheAge / 1000 / 60 / 60)} hours`);
      return null;
    }
    
    console.log(`Using cached analysis for repo ${repoId}, age: ${Math.round(cacheAge / 1000 / 60)} minutes`);
    return cached;
  };

  // Set/update cached analysis for a repository
  const setCachedAnalysis = (repoId, commits, qualityAnalysis) => {
    setAnalysisCache(prev => ({
      ...prev,
      [repoId]: {
        commits,
        qualityAnalysis,
        timestamp: Date.now()
      }
    }));
    console.log(`Cached analysis for repo ${repoId}`);
  };

  // Clear cache for a specific repository or all repositories
  const clearAnalysisCache = (repoId = null) => {
    if (repoId) {
      setAnalysisCache(prev => {
        const newCache = { ...prev };
        delete newCache[repoId];
        return newCache;
      });
      console.log(`Cleared cache for repo ${repoId}`);
    } else {
      setAnalysisCache({});
      console.log('Cleared all analysis cache');
    }
  };

  // === LIFECYCLE HOOKS - App initialization and data fetching ===
  
  // Check authentication status on app startup (page load/refresh)
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/auth/me`, { 
          credentials: 'include' 
        });
        const isAuth = response.ok;
        setIsAuthenticated(isAuth);
      } catch (error) {
        console.error('Authentication check failed:', error);
        setIsAuthenticated(false);
      }
    };
    
    checkAuth();
  }, []); // Run once on mount

  // Fetch repositories and daily summary immediately when user becomes authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchRepositories(); // Single API call that enables all pages
      fetchDailySummary(); // Fetch today's commit summary once and cache it
    }
  }, [isAuthenticated]); // Run when auth status changes

  // === PROP DRILLING - Package shared state for all child components ===
  const appContext = {
    repositories,           // Cached repository data
    selectedRepo,           // Currently selected repository
    setSelectedRepo,        // Function to update selected repo
    reposLoading,           // Loading state for UI feedback
    reposError,             // Error state for error handling
    refreshRepositories: fetchRepositories,  // Manual refresh function
    // Daily summary state - cached at app level
    commitData,             // Today's commit summary data
    commitLoading,          // Loading state for commit fetching
    commitError,            // Error state for commit fetching
    fetchDailySummary,      // Function to refresh daily summary
    // Repository analysis cache - cached at app level
    getCachedAnalysis,      // Function to get cached analysis for a repo
    setCachedAnalysis,      // Function to cache analysis for a repo
    clearAnalysisCache,     // Function to clear analysis cache
    currentAnalysisLoading, // Loading state for current analysis
    setCurrentAnalysisLoading // Function to update analysis loading state
  };

  // === RENDER - Route definitions with shared state distribution ===
  return (
    <div>
      <Routes>
        <Route path='/' element={<Login />} /> {/* Public route - no auth required */}
        
        {/* Protected routes - all receive shared app state via props */}
        <Route 
          path='/dashboard' 
          element={
            <ProtectedRoute>
              <Dashboard {...appContext} />
            </ProtectedRoute>
          } 
        />
        <Route 
          path='/repositories' 
          element={
            <ProtectedRoute>
              <RepoListing {...appContext} />
            </ProtectedRoute>
          } 
        />
        <Route 
          path='/repository' 
          element={
            <ProtectedRoute>
              <RepoAnalytics {...appContext} />
            </ProtectedRoute>
          } 
        />
      </Routes>
    </div>
  );
}

export default App;
