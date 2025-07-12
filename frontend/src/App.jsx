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
      .then((response) => setIsAuthenticated(response.ok))
      .catch(() => setIsAuthenticated(false));
  }, []);

  if (isAuthenticated === null) return <div>Loading...</div>; // Still checking auth
  if (!isAuthenticated) return <Navigate to='/' replace />; // Redirect to login
  return children; // User is authenticated, show protected content
}

function App() {
  // === SHARED STATE - Single source of truth for entire app ===
  const [repositories, setRepositories] = useState([]); // All user repos - fetched once, cached
  const [selectedRepo, setSelectedRepo] = useState(null); // Currently selected repo - persists across pages
  const [reposLoading, setReposLoading] = useState(false); // Loading state for repo fetching
  const [reposError, setReposError] = useState(null); // Error state for repo fetching
  const [isAuthenticated, setIsAuthenticated] = useState(false); // Triggers repo fetch when true
  const [authLoading, setAuthLoading] = useState(true); // Loading state for authentication check
  
  // Yesterday's summary state
  const [yesterdaySummary, setYesterdaySummary] = useState(null); // Yesterday's development summary
  const [summaryLoading, setSummaryLoading] = useState(false); // Loading state for summary
  const [summaryError, setSummaryError] = useState(null); // Error state for summary

  // Fetch all user repositories - called once on login, cached for entire session
  const fetchRepositories = async (forceRefresh = false) => {
    setReposLoading(true);
    setReposError(null);

    try {
      // Add refresh parameter to bypass cache when needed
      const refreshParam = forceRefresh ? '?refresh=true' : '';
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/repos${refreshParam}`,
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
          setSelectedRepo((prev) => prev || data.data.repositories[0]);
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

  // Fetch yesterday's development summary - called once on login
  const fetchYesterdaySummary = async (forceRefresh = false) => {
    setSummaryLoading(true);
    setSummaryError(null);
    
    try {
      // Add refresh parameter to bypass cache when needed
      const refreshParam = forceRefresh ? '?refresh=true' : '';
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/ai/yesterday-summary${refreshParam}`,
        { 
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({}) // Empty body - defaults to yesterday
        }
      );
      
      if (!response.ok) {
        throw new Error(`Failed to fetch yesterday's summary: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        setYesterdaySummary(data.data);
        
        // Log cache status for debugging
        if (forceRefresh) {
          console.log('🔄 Yesterday summary fetched with fresh data (cache bypassed)');
        } else {
          console.log('📦 Yesterday summary fetched (cache enabled)');
        }
      } else {
        throw new Error('Failed to load yesterday\'s summary');
      }
    } catch (error) {
      console.error('Yesterday summary fetch error:', error);
      setSummaryError(error.message);
    } finally {
      setSummaryLoading(false);
    }
  };

  // === LIFECYCLE HOOKS - App initialization and data fetching ===

  // Check authentication status on app startup (page load/refresh)
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch(
          `${import.meta.env.VITE_API_URL}/auth/me`,
          {
            credentials: 'include',
          }
        );
        const isAuth = response.ok;
        setIsAuthenticated(isAuth);
      } catch (error) {
        console.error('Authentication check failed:', error);
        setIsAuthenticated(false);
      } finally {
        setAuthLoading(false); // Authentication check complete
      }
    };

    checkAuth();
  }, []); // Run once on mount

  // Fetch repositories and yesterday's summary when user becomes authenticated
  useEffect(() => {
    if (isAuthenticated) {
      // Detect browser refresh by checking if page was reloaded
      const wasRefreshed = performance.getEntriesByType('navigation')[0]?.type === 'reload';
      
      if (wasRefreshed) {
        console.log('🔄 Browser refresh detected - fetching fresh data');
        // Fetch both repositories and yesterday's summary with fresh data
        fetchRepositories(true);
        fetchYesterdaySummary(true);
      } else {
        console.log('📦 Normal page load - using cached data');
        // Fetch both repositories and yesterday's summary with cache
        fetchRepositories(false);
        fetchYesterdaySummary(false);
      }
    }
  }, [isAuthenticated]); // Run when auth status changes

  // === PROP DRILLING - Package shared state for all child components ===
  const appContext = {
    repositories,           // Cached repository data
    selectedRepo,           // Currently selected repository
    setSelectedRepo,        // Function to update selected repo
    reposLoading,           // Loading state for UI feedback
    reposError,             // Error state for error handling
    refreshRepositories: () => fetchRepositories(true),  // Manual refresh function with fresh data
    yesterdaySummary,       // Yesterday's development summary
    summaryLoading,         // Loading state for summary
    summaryError,           // Error state for summary
    refreshSummary: () => fetchYesterdaySummary(true)  // Manual refresh function with fresh data
  };

  // === RENDER - Route definitions with shared state distribution ===
  return (
    <div>
      <Routes>
        <Route path='/' element={<Login />} />{' '}
        {/* Public route - no auth required */}
        {/* Protected routes - all receive shared app state via props */}
        <Route
          path='/dashboard'
          element={
            <ProtectedRoute>
              -
              <Dashboard {...appContext} />
            </ProtectedRoute>
          }
        />
        <Route
          path='/repositories'
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated} isLoading={authLoading}>
              <RepoListing {...appContext} />
            </ProtectedRoute>
          }
        />
        <Route
          path='/repository'
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated} isLoading={authLoading}>
              <RepoAnalytics {...appContext} />
            </ProtectedRoute>
          }
        />
      </Routes>
    </div>
  );
}

export default App;
