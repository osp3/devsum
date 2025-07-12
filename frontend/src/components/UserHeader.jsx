import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const UserHeader = () => {
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  // Fetch user data from /auth/me endpoint
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/auth/me`, {
          credentials: 'include',
        });
        
        if (response.ok) {
          const userData = await response.json();
          console.log('👤 User data fetched:', userData);
          // The backend returns { success: true, user: {...} }, so extract the user object
          setUser(userData.user);
        } else {
          console.warn('⚠️  Failed to fetch user data');
        }
      } catch (error) {
        console.error('❌ Error fetching user data:', error);
      }
    };

    fetchUserData();
  }, []);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    
    try {
      await fetch(`${import.meta.env.VITE_API_URL}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
      window.location.href = '/';
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setIsLoggingOut(false);
    }
  };

  // Get display name from user data
  const getDisplayName = () => {
    if (!user) return '';
    return user.displayName || user.fullName || user.name || user.username || 'User';
  };

  return (
    <div className="bg-[#2d2b3e] border-b border-slate-600 p-4">
      <div className="max-w-6xl mx-auto flex justify-between items-center">
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
        
        <div className="flex gap-3">
          <button
            onClick={() => navigate('/settings')}
            className="px-4 py-2 rounded-lg text-white font-medium transition-colors bg-blue-600 hover:bg-blue-700 cursor-pointer"
          >
            Settings
          </button>
          
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