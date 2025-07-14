import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

// UserHeader displays the navigation header that appears at the top of all authenticated pages
// Provides different functionality based on current route:
// Dashboard: Static logo, welcome message, logout
// Repositories: Clickable logo → dashboard, user's full name, logout
// Repository: Clickable logo → dashboard, back button → repositories, user's full name, logout
const UserHeader = () => {
  // State for managing logout loading state
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  // State for storing user data from GitHub OAuth
  const [user, setUser] = useState(null);

  // React Router hooks for navigation and current location
  const location = useLocation(); // get current URL path
  const navigate = useNavigate();

  // Fetch user information when component mounts
  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        // Call backend /auth/me endpoint to get current user info
        const response = await fetch(
          `${import.meta.env.VITE_API_URL}/auth/me`,
          {
            credentials: 'include', // include session cookies for authentication
          }
        );

        if (response.ok) {
          // Parse JSON response and extract nested user object
          const userData = await response.json();
          setUser(userData.user); // store user info in state
        } else {
          // Log authentication failure for debugging
          console.log('Auth/me response not ok:', response.status);
        }
      } catch (error) {
        // Handle network errors or other fetch failures
        console.error('Error fetching user info:', error);
      }
    };

    fetchUserInfo(); // execute the fetch when component mounts
  }, []); // empty dependency array = run once on mount

  // Handler for logo click - provides navigation back to dashboard
  const handleLogoClick = () => {
    // Only make logo clickable on repositories and repository pages
    if (
      location.pathname === '/repositories' ||
      location.pathname === '/repository'
    ) {
      navigate('/dashboard'); // navigate back to main dashboard
    }
  };

  // Check if logo should be clickable
  const isLogoClickable =
    location.pathname === '/repositories' ||
    location.pathname === '/repository';

  // Handler for logout button - clears session and redirects to login
  const handleLogout = async () => {
    setIsLoggingOut(true); // show loading state on logout button

    try {
      // Call backend logout endpoint to destroy session
      await fetch(`${import.meta.env.VITE_API_URL}/auth/logout`, {
        method: 'POST',
        credentials: 'include', // include session cookies
      });
      // Redirect to home/login page after successful logout
      window.location.href = '/';
    } catch (err) {
      // Log logout errors for debugging
      console.error('Logout error:', err);
    } finally {
      // Always reset loading state, whether successful or failed
      setIsLoggingOut(false);
    }
  };

  return (
    <div className='bg-[#2d2b3e] border-b border-slate-600 p-4'>
      <div className='max-w-6xl mx-auto flex justify-between items-center'>
        {/* Left side - DevSum Logo (conditionally clickable) */}
        <div className='flex items-center'>
          <h1
            className={`text-white text-2xl font-bold ${
              isLogoClickable
                ? 'cursor-pointer hover:opacity-80 transition-opacity'
                : 'cursor-default'
            }`}
            onClick={handleLogoClick}
            title={isLogoClickable ? 'Go to Dashboard' : ''}
          >
            Dev<span className='text-blue-400'>Sum</span>
          </h1>
        </div>

        {/* Right side - User welcome and logout */}
        <div className='flex items-center gap-4'>
          {/* Back to repositories button - only on /repository page */}
          {location.pathname === '/repository' && (
            <button
              onClick={() => navigate('/repositories')}
              className='px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white rounded text-sm transition-colors'
            >
              ← Back to List
            </button>
          )}

          {/* Welcome message - varies by page */}
          {user && (
            <span className='text-white text-lg'>
              {location.pathname === '/dashboard' ? (
                // Full welcome message on dashboard
                <>
                  Welcome,{' '}
                  <span className='font-semibold'>
                    {user?.fullName || user?.username}
                  </span>
                </>
              ) : (
                // Just name on repositories and repository pages
                <span className='font-semibold'>
                  {user?.fullName || user?.username}
                </span>
              )}
            </span>
          )}

          {/* Logout button */}
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
