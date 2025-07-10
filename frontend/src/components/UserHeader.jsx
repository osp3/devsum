import React, { useState } from 'react';

const UserHeader = () => {
  const [isLoggingOut, setIsLoggingOut] = useState(false);

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

  return (
    <div className="bg-[#2d2b3e] border-b border-slate-600 p-4">
      <div className="max-w-6xl mx-auto flex justify-between items-center">
        <h2 className="text-white text-xl font-semibold">DevSum Dashboard</h2>
        
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
  );
};

export default UserHeader;
