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
  return (
    <div>
      <Routes>
        <Route path='/' element={<Login />} />
        <Route path='/dashboard' element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path='/repositories' element={<ProtectedRoute><RepoListing /></ProtectedRoute>} />
        <Route path='/repository' element={<ProtectedRoute><RepoAnalytics /></ProtectedRoute>} />
      </Routes>
    </div>
  );
}

export default App;
