import React from 'react';

const Login = () => {
  const handleGitHubLogin = () => {
    const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    window.location.href = `${backendUrl}/auth/github`;
  };

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh',
      flexDirection: 'column',
      gap: '20px'
    }}>
      <h1>DevSum</h1>
      <button 
        onClick={handleGitHubLogin}
        style={{
          padding: '12px 24px',
          fontSize: '16px',
          backgroundColor: '#24292e',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer'
        }}
      >
        Login with GitHub
      </button>
    </div>
  );
};

export default Login;
