import { useState, useEffect } from 'react';
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import UserHeader from './components/UserHeader.jsx';
import Login from './components/Login.jsx';
import Dashboard from './components/Dashboard.jsx';
import RepoListing from './components/RepoListing.jsx';
import RepoAnalytics from './components/RepoAnalytics';
import Settings from './components/Settings.jsx';

// Wrapper component that uses shared authentication state
function ProtectedRoute({ children, isAuthenticated, authLoading }) {
  if (authLoading) return <div>Loading...</div>; // Still checking auth
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
  const [authLoading, setAuthLoading] = useState(true); // Loading state for auth check
  const [user, setUser] = useState(null); // Current user data from GitHub OAuth
  
  // Yesterday's summary state
  const [yesterdaySummary, setYesterdaySummary] = useState(null); // Yesterday's development summary
  const [summaryLoading, setSummaryLoading] = useState(false); // Loading state for summary
  const [summaryError, setSummaryError] = useState(null); // Error state for summary

  // Task suggestions state
  const [taskSuggestions, setTaskSuggestions] = useState([]); // AI-generated task suggestions
  const [tasksLoading, setTasksLoading] = useState(false); // Loading state for tasks
  const [tasksError, setTasksError] = useState(null); // Error state for tasks

  // Helper function to detect browser refresh for force refreshing data
  const isRefresh = () => {
    try {
      // Modern approach - check if it's a reload
      const navigationEntries = performance.getEntriesByType('navigation');
      if (navigationEntries.length > 0) {
        return navigationEntries[0].type === 'reload';
      }
      // Fallback for older browsers
      return performance.navigation?.type === 1;
    } catch {
      return false;
    }
  };

  // Fetch all user repositories - called once on login, cached for entire session
  const fetchRepositories = async (forceRefresh = false) => {
    setReposLoading(true);
    setReposError(null);

    try {
      // Add force parameter if it's a browser refresh OR manually forced
      const forceParam = (isRefresh() || forceRefresh) ? '?force=true' : '';
      
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/repos${forceParam}`,
        { 
          credentials: 'include',
          cache: 'no-cache',
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        }
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
      // Add force parameter if it's a browser refresh OR manually forced
      const forceParam = (isRefresh() || forceRefresh) ? '?force=true' : '';
      
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/ai/yesterday-summary${forceParam}`,
        { 
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          },
          credentials: 'include',
          cache: 'no-cache',
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
        if (forceRefresh || isRefresh()) {
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

  // Fetch AI-generated task suggestions based on yesterday's summary
  const fetchTaskSuggestions = async (forceRefresh = false) => {
    // Guard clause - exit early if no summary data
    if (!yesterdaySummary) return;

    setTasksLoading(true);
    setTasksError(null);

    try {
      // Add force parameter if it's a browser refresh OR manually forced
      const forceParam = (isRefresh() || forceRefresh) ? '?force=true' : '';
      
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/ai/task-suggestions${forceParam}`,
        {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          },
          credentials: 'include',
          cache: 'no-cache',
          body: JSON.stringify({
            yesterdaySummary: yesterdaySummary,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch task suggestions: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        setTaskSuggestions(result.data.tasks || []);
        console.log('🎯 Task suggestions generated:', result.data);
      } else {
        throw new Error(result.error || 'Failed to generate task suggestions');
      }
    } catch (error) {
      console.error('Task suggestion error:', error);
      setTasksError(error.message);
    } finally {
      setTasksLoading(false);
    }
  };

  // === LIFECYCLE HOOKS - App initialization and data fetching ===

  // Check authentication status and fetch user data on app startup
  useEffect(() => {
    const checkAuth = async () => {
      setAuthLoading(true);
      try {
        const response = await fetch(
          `${import.meta.env.VITE_API_URL}/auth/me`,
          {
            credentials: 'include',
          }
        );
        
        if (response.ok) {
          const userData = await response.json();
          console.log('👤 User authenticated and data fetched:', userData);
          setUser(userData.user); // Extract user object from response
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
          setUser(null);
        }
      } catch (error) {
        console.error('Authentication check failed:', error);
        setIsAuthenticated(false);
        setUser(null);
      } finally {
        setAuthLoading(false);
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
        // Fetch repositories, yesterday's summary, and task suggestions with fresh data
        fetchRepositories(true);
        fetchYesterdaySummary(true);
      } else {
        console.log('📦 Normal page load - using cached data');
        // Fetch repositories, yesterday's summary, and task suggestions with cache
        fetchRepositories(false);
        fetchYesterdaySummary(false);
      }
    }
  }, [isAuthenticated]); // Run when auth status changes

  // Fetch task suggestions when yesterday's summary becomes available
  useEffect(() => {
    if (yesterdaySummary && yesterdaySummary.formattedCommits?.allCommits?.length > 0) {
      fetchTaskSuggestions();
    }
  }, [yesterdaySummary]); // Run when summary changes

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
    refreshSummary: () => fetchYesterdaySummary(true),  // Manual refresh function with fresh data
    taskSuggestions,        // AI-generated task suggestions
    tasksLoading,           // Loading state for tasks
    tasksError,             // Error state for tasks
    refreshTasks: () => fetchTaskSuggestions(true),  // Manual refresh function for tasks
    user,                   // Current authenticated user data
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
            <ProtectedRoute isAuthenticated={isAuthenticated} authLoading={authLoading}>
              <Dashboard {...appContext} />
            </ProtectedRoute>
          }
        />
        <Route
          path='/repositories'
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated} authLoading={authLoading}>
              <RepoListing {...appContext} />
            </ProtectedRoute>
          }
        />
        <Route
          path='/repository'
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated} authLoading={authLoading}>
              <RepoAnalytics {...appContext} />
            </ProtectedRoute>
          } 
        />
        <Route 
          path='/settings' 
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated} authLoading={authLoading}>
              <Settings />
            </ProtectedRoute>
          } 
        />
      </Routes>
    </div>
  );
}

export default App;
