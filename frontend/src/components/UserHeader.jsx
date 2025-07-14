import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

// Top navigation header component with user info and action buttons
const UserHeader = ({ user }) => {
  // Track logout process state to prevent double-clicks
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const navigate = useNavigate();

  // Handle user logout with session cleanup and redirect
  const handleLogout = async () => {
    setIsLoggingOut(true);
    
    try {
      await fetch(`${import.meta.env.VITE_API_URL}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
      window.location.href = '/'; // Hard redirect to login page
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setIsLoggingOut(false);
    }
  };

  // Extract user's display name with fallback hierarchy
  const getDisplayName = () => {
    if (!user) return '';
    return user.displayName || user.fullName || user.name || user.username || 'User';
  };

  return (
    <div className="bg-[#2d2b3e] border-b border-slate-600 p-4">
      <div className="max-w-6xl mx-auto flex justify-between items-center">
        {/* Left side - Logo and user greeting */}
        <div className="flex items-center gap-4">
          {/* Enhanced logo with blue accent */}
          <h2 className="text-white text-xl font-semibold">
            Dev<span className="text-blue-400">Sum</span>
          </h2>
          
          {/* Welcome message with user's name */}
          {user && (
            <span className="text-gray-300 text-sm">
              Welcome back, {getDisplayName()}!
            </span>
          )}
        </div>
        
        {/* Right side - Action buttons */}
        <div className="flex gap-3">
          {/* Settings navigation button */}
          <button
            onClick={() => navigate('/settings')}
            className="px-4 py-2 rounded-lg text-white font-medium transition-colors bg-blue-600 hover:bg-blue-700 cursor-pointer"
          >
            Settings
          </button>
          
          {/* Logout button with disabled state during logout process */}
          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className={`
              px-4 py-2 rounded-lg text-white font-medium transition-colors
              ${isLoggingOut 
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