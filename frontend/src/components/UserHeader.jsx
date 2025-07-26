import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

// UserHeader displays the navigation header that appears at the top of all authenticated pages
// Provides different functionality based on current route:
// Dashboard: Static logo, welcome message, settings, logout
// Repositories: Clickable logo → dashboard, user's full name, settings, logout
// Repository: Clickable logo → dashboard, back button → repositories, user's full name, settings, logout
const UserHeader = ({ user }) => {
  // Track logout process state to prevent double-clicks
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const navigate = useNavigate(); // React Router hook
  const location = useLocation(); // React Router hook for current location

  // Handle user logout with session cleanup and redirect
  const handleLogout = async () => {
    setIsLoggingOut(true); // show loading state on logout button

    try {
      // Call backend logout endpoint to destroy session
      await fetch(`${import.meta.env.VITE_API_URL}/auth/logout`, {
        method: 'POST',
        credentials: 'include', // include session cookies for authentication
      });
      window.location.href = '/'; // Hard redirect to login page to login page (clears all state)
    } catch (err) {
      // Log logout errors for debugging
      console.error('Logout error:', err);
    } finally {
      // Always reset loading state, whether successful or failed
      setIsLoggingOut(false);
    }
  };

  // Handle logo click - navigate to dashboard from any page except dashboard
  const handleLogoClick = () => {
    if (location.pathname !== '/dashboard') {
      navigate('/dashboard'); // Only navigate if not already on dashboard
    }
  };

  // Logo is clickable everywhere except on dashboard
  const isLogoClickable = location.pathname !== '/dashboard';

  // Extract user's display name with fallback hierarchy
  const getDisplayName = () => {
    if (!user) return ''; // return empty string if no user data
    return (
      user.displayName || user.fullName || user.name || user.username || 'User'
    );
  };

  return (
    <div className='bg-[#2d2b3e] border-b border-slate-600 p-4'>
      <div className='max-w-6xl mx-auto flex justify-between items-center'>
        {/* Left side - Logo and user greeting */}
        <div className='flex items-center gap-4'>
          {/* DevSum logo with conditional clickability */}
          <h2
            className={`text-white text-xl font-semibold ${
              isLogoClickable
                ? 'cursor-pointer hover:opacity-80 transition-opacity'
                : 'cursor-default'
            }`}
            onClick={handleLogoClick}
            title={isLogoClickable ? 'Go to Dashboard' : ''}
          >
            Dev<span className='text-blue-400'>Sum</span>
          </h2>

          {/* Welcome message with user's name - varies by page*/}
          {user && (
            <div className='flex items-center gap-2'>
              {/* User's GitHub avatar */}
              {user.avatarUrl && (
                <img
                  src={user.avatarUrl}
                  alt={`${getDisplayName()}'s avatar`}
                  className='w-6 h-6 rounded-full'
                />
              )}
              <span className='text-gray-300 text-sm'>
                {location.pathname === '/dashboard'
                  ? // Full welcome message on dashboard
                    `Welcome back, ${getDisplayName()}!`
                  : // Just name on repositories and repository pages
                    getDisplayName()}
              </span>
            </div>
          )}
        </div>

        {/* Right side - Action buttons and navigation*/}
        <div className='flex gap-3'>
          {/* Back to repositories button - only on /repository page */}
          {location.pathname === '/repository' && (
            <button
              onClick={() => navigate('/repositories')} // navigate from individual repo back to repo list
              className='px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white rounded text-sm transition-colors'
            >
              Back to Repository
            </button>
          )}

          {/* Settings navigation button */}
          <button
            onClick={() => navigate('/settings')}
            className='px-4 py-2 rounded-lg text-white font-medium transition-colors bg-blue-600 hover:bg-blue-700 cursor-pointer'
          >
            Settings
          </button>

          {/* Logout button with disabled state during logout process */}
          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className={`
              px-4 py-2 rounded-lg text-white font-medium transition-colors
              ${
                isLoggingOut
                  ? 'bg-gray-600 cursor-not-allowed'
                  : 'bg-red-600 hover:bg-red-700 cursor-pointer'
              }
            `}
          >
            {isLoggingOut ? 'Logging out...' : 'Logout'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserHeader;
