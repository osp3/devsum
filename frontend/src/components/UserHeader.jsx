// import React, { useState } from 'react';

// const UserHeader = () => {
//   const [isLoggingOut, setIsLoggingOut] = useState(false);

//   const handleLogout = async () => {
//     setIsLoggingOut(true);
    
//     try {
//       await fetch(`${import.meta.env.VITE_API_URL}/auth/logout`, {
//         method: 'POST',
//         credentials: 'include',
//       });
//       window.location.href = '/';
//     } catch (err) {
//       console.error('Logout error:', err);
//     } finally {
//       setIsLoggingOut(false);
//     }
//   };

//   return (
//     <div className="bg-[#2d2b3e] border-b border-slate-600 p-4">
//       <div className="max-w-6xl mx-auto flex justify-between items-center">
//         <h2 className="text-white text-xl font-semibold">DevSum Dashboard</h2>
        
//         <button
//           onClick={handleLogout}
//           disabled={isLoggingOut}
//           className={`
//             px-4 py-2 rounded-lg text-white font-medium transition-colors
//             ${isLoggingOut 
//               ? 'bg-gray-600 cursor-not-allowed' 
//               : 'bg-red-600 hover:bg-red-700 cursor-pointer'
//             }
//           `}
//         >
//           {isLoggingOut ? 'Logging out...' : 'Logout'}
//         </button>
//       </div>
//     </div>
//   );
// };

// export default UserHeader;

import React, { useState, useEffect } from 'react';

const UserHeader = () => {
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [user, setUser] = useState(null); // Store user data from GitHub OAuth

  // Fetch user information when component mounts
  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/auth/me`, {
          credentials: 'include',
        });
        
        if (response.ok) {
          const userData = await response.json();
          console.log('User data received:', userData); // Debug log
          setUser(userData);
        } else {
          console.log('Auth/me response not ok:', response.status);
        }
      } catch (error) {
        console.error('Error fetching user info:', error);
      }
    };

    fetchUserInfo();
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

  return (
    <div className="bg-[#2d2b3e] border-b border-slate-600 p-4">
      <div className="max-w-6xl mx-auto flex justify-between items-center">
        {/* Left side - DevSum Logo */}
        <div className="flex items-center">
          <h1 className="text-white text-2xl font-bold">
            Dev<span className="text-blue-400">Sum</span>
          </h1>
        </div>

        {/* Right side - User welcome and logout */}
        <div className="flex items-center gap-4">
          {/* Welcome message with user's full name */}
          {user && (
            <span className="text-white text-lg">
              Welcome, <span className="font-semibold">{user.user?.fullName || user.user?.username}</span>
            </span>
          )}
          
          {/* Logout button */}
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