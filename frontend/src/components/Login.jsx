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
        style={{
          padding: '12px 24px',
          fontSize: '16px',
          backgroundColor: '#24292e',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer',
          marginTop: '10px',
        }}
      >
        Login with GitHub
      </button>
    </div>
  );
};

export default Login;
