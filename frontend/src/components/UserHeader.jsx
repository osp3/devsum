import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import logo from '../assets/devsum-logo.png';

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

  // Extract user's display name with fallback hierarchy
  const getDisplayName = () => {
    if (!user) return ''; // return empty string if no user data
    return (
      user.displayName || user.fullName || user.name || user.username || 'User'
    );
  };

  return (
    <header className='sticky top-0 z-20 border-b border-line bg-canvas/80 backdrop-blur'>
      <nav className='mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6' aria-label='Main'>
        {/* Left side - Logo and user greeting */}
        <div className='flex min-w-0 items-center gap-6'>
          <Link to='/dashboard' className='flex shrink-0 items-center gap-2.5 font-semibold tracking-tight'>
            <img src={logo} alt='' className='h-7 w-7 object-contain' />
            DevSum
          </Link>

          {/* Welcome message with user's name - varies by page*/}
          {user && (
            <div className='hidden min-w-0 items-center gap-3 sm:flex'>
              {/* User's GitHub avatar */}
              {user.avatarUrl && (
                <img
                  src={user.avatarUrl}
                  alt={`${getDisplayName()}'s avatar`}
                  className='h-7 w-7 shrink-0 rounded-full border border-line'
                />
              )}
              <span className='hidden truncate text-sm text-fg/65 md:inline'>
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
        <div className='flex shrink-0 items-center gap-4 text-sm sm:gap-6'>
          {/* Back to repositories button - only on /repository page */}
          {location.pathname === '/repository' && (
            <button onClick={() => navigate('/repositories')} className='btn-ghost cursor-pointer'>
              <span className='sm:hidden'>Repos</span>
              <span className='hidden sm:inline'>All repositories</span>
            </button>
          )}

          <button onClick={() => navigate('/settings')} className='btn-ghost cursor-pointer'>
            Settings
          </button>

          {/* Logout button with disabled state during logout process */}
          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className='btn-secondary h-9 cursor-pointer border px-4'
          >
            {isLoggingOut ? 'Logging out...' : 'Log out'}
          </button>
        </div>
      </nav>
    </header>
  );
};

export default UserHeader;
