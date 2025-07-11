import { useState, useEffect } from 'react';
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import UserHeader from './components/UserHeader.jsx';
import Login from './components/Login.jsx';
import Dashboard from './components/Dashboard.jsx';
import RepoListing from './components/RepoListing.jsx';
import RepoAnalytics from './components/RepoAnalytics';

// Simple protected route - just checks auth and redirects if needed
function ProtectedRoute({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(null);

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/auth/me`, { credentials: 'include' })
      .then(response => setIsAuthenticated(response.ok))
      .catch(() => setIsAuthenticated(false));
  }, []);

  if (isAuthenticated === null) return <div>Loading...</div>;
  if (!isAuthenticated) return <Navigate to="/" replace />;
  return children;
}

function App() {
  // Repository data - shared across Dashboard and Repos pages to avoid duplicate API calls
  const [repositories, setRepositories] = useState([]);
  const [selectedRepo, setSelectedRepo] = useState(null); // Persists repo selection across page navigation
  const [reposLoading, setReposLoading] = useState(false);
  const [reposError, setReposError] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

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

  // Check if user is already logged in when app loads
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
  }, []);

  // Automatically fetch repositories as soon as user becomes authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchRepositories();
    }
  }, [isAuthenticated]);

  // Shared data passed to all pages - enables state persistence across navigation
  const appContext = {
    repositories,
    selectedRepo,
    setSelectedRepo,
    reposLoading,
    reposError,
    refreshRepositories: fetchRepositories
  };

  return (
    <div>
      <Routes>
        <Route path='/' element={<Login />} />
        {/* All protected routes receive shared app state as props */}
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
