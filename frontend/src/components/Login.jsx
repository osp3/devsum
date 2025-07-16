import React from 'react';
import logo from '../assets/devsum-logo.png'; // Update path if needed

const Login = () => {
  const handleGitHubLogin = () => {
    const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    window.location.href = `${backendUrl}/auth/github`;
  };

  return (
    <div
      style={{
        backgroundColor: '#1a172e',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        flexDirection: 'column',
        gap: '20px',
        color: 'white',
        fontFamily: 'sans-serif',
        textAlign: 'center',
      }}
    >
      <img
        src={logo}
        alt='DevSum logo'
        style={{ width: '300px', height: 'auto' }}
      />
      <h1 style={{ fontSize: '2.5rem', margin: 0 }}>
        Dev<span className='text-blue-400'>Sum</span>
      </h1>
      <p style={{ margin: 0 }}>Your daily dev bites.</p>
      <p style={{ fontStyle: 'italic', color: '#AAA' }}>
        Smart. Steamy. Structured.
      </p>
      <button
        onClick={handleGitHubLogin}
        className="flex items-center gap-3 px-6 py-3 bg-[#24292e] hover:bg-[#2f363d] text-white font-semibold rounded-lg border border-[#3d444d] transition-colors duration-200 shadow-lg hover:shadow-xl cursor-pointer"
      >
        {/* GitHub Logo SVG */}
        <svg 
          className="w-5 h-5" 
          fill="currentColor" 
          viewBox="0 0 24 24" 
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
        </svg>
        Continue with GitHub
      </button>
    </div>
  );
};

export default Login;
