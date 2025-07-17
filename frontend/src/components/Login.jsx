// import React from 'react';
// import logo from '../assets/devsum-logo.png'; // Update path if needed

// const Login = () => {
//   const handleGitHubLogin = () => {
//     const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
//     window.location.href = `${backendUrl}/auth/github`;
//   };

//   return (
//     <div
//       style={{
//         backgroundColor: '#1a172e',
//         display: 'flex',
//         justifyContent: 'center',
//         alignItems: 'center',
//         height: '100vh',
//         flexDirection: 'column',
//         gap: '20px',
//         color: 'white',
//         fontFamily: 'sans-serif',
//         textAlign: 'center',
//       }}
//     >
//       <img
//         src={logo}
//         alt='DevSum logo'
//         style={{ width: '300px', height: 'auto' }}
//       />
//       <h1 style={{ fontSize: '2.5rem', margin: 0 }}>
//         Dev<span className='text-blue-400'>Sum</span>
//       </h1>
//       <p style={{ margin: 0 }}>Your daily dev bites.</p>
//       <p style={{ fontStyle: 'italic', color: '#AAA' }}>
//         Smart. Steamy. Structured.
//       </p>
//       <button
//         onClick={handleGitHubLogin}
//         className="flex items-center gap-3 px-6 py-3 bg-[#24292e] hover:bg-[#2f363d] text-white font-semibold rounded-lg border border-[#3d444d] transition-colors duration-200 shadow-lg hover:shadow-xl cursor-pointer"
//       >
//         {/* GitHub Logo SVG */}
//         <svg
//           className="w-5 h-5"
//           fill="currentColor"
//           viewBox="0 0 24 24"
//           xmlns="http://www.w3.org/2000/svg"
//         >
//           <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
//         </svg>
//         Continue with GitHub
//       </button>
//     </div>
//   );
// };

// export default Login;

import React from 'react';
import logo from '../assets/devsum-logo.png';

const Login = () => {
  const handleGitHubLogin = () => {
    const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    window.location.href = `${backendUrl}/auth/github`;
  };

  // Create 50 particles with random positions and timings
  const particles = Array.from({ length: 50 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    top: Math.random() * 100,
    delay: Math.random() * 6,
    duration: 3 + Math.random() * 3,
  }));

  return (
    <div className='login-wrapper'>
      {/* Particles */}
      {particles.map((particle) => (
        <div
          key={particle.id}
          className='particle'
          style={{
            left: `${particle.left}%`,
            top: `${particle.top}%`,
            animationDelay: `${particle.delay}s`,
            animationDuration: `${particle.duration}s`,
          }}
        />
      ))}

      {/* Main Content */}
      <div className='login-content'>
        {/* DevSum Logo */}
        <img src={logo} alt='DevSum logo' className='logo' />

        <h1 className='title'>
          <span className='title-main'>Dev</span>
          <span className='title-accent'>Sum</span>
        </h1>
        <h3 className='tagline'>Your daily dev bites.</h3>
        <p className='subtitle'>Smart. Steamy. Structured.</p>

        <button className='github-button' onClick={handleGitHubLogin}>
          <svg width='20' height='20' fill='currentColor' viewBox='0 0 24 24'>
            <path d='M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z' />
          </svg>
          Continue with GitHub
        </button>
      </div>

      <style jsx>{`
        .login-wrapper {
          position: relative;
          width: 100%;
          height: 100vh;
          background: linear-gradient(
            135deg,
            #1a1a2e 0%,
            #16213e 50%,
            #0f3460 100%
          );
          overflow: hidden;
        }

        .particle {
          position: absolute;
          width: 3px;
          height: 3px;
          background: rgba(100, 200, 255, 0.7);
          border-radius: 50%;
          animation: float 6s ease-in-out infinite;
        }

        @keyframes float {
          0%,
          100% {
            transform: translateY(0px) rotate(0deg);
            opacity: 0.4;
          }
          50% {
            transform: translateY(-25px) rotate(180deg);
            opacity: 1;
          }
        }

        .login-content {
          position: relative;
          z-index: 10;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100vh;
          gap: 20px;
          color: white;
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          text-align: center;
        }

        .logo {
          width: 180px;
          height: 180px;
          object-fit: contain;
          margin-bottom: 30px;
          animation: logoFloat 3s ease-in-out infinite;
          filter: drop-shadow(0 8px 20px rgba(0, 0, 0, 0.3));
        }

        @keyframes logoFloat {
          0%,
          100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-12px);
          }
        }

        .title {
          font-size: 3.5rem;
          margin: 0 0 10px 0;
          font-weight: 700;
          text-shadow: 0 4px 12px rgba(255, 255, 255, 0.1);
        }

        .title-main {
          background: linear-gradient(135deg, #ffffff 0%, #a8d8ff 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .title-accent {
          color: #3b82f6;
        }

        .tagline {
          margin: 0 0 5px 0;
          font-size: 1.3rem;
          font-weight: 400;
          color: rgba(255, 255, 255, 0.9);
        }

        .subtitle {
          font-style: italic;
          color: rgba(255, 255, 255, 0.6);
          margin: 0 0 40px 0;
          font-size: 1rem;
        }

        .github-button {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px 32px;
          background: linear-gradient(135deg, #24292e 0%, #2f363d 100%);
          color: white;
          border: none;
          border-radius: 12px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
          position: relative;
          overflow: hidden;
        }

        .github-button::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(255, 255, 255, 0.1),
            transparent
          );
          transition: left 0.5s ease;
        }

        .github-button:hover::before {
          left: 100%;
        }

        .github-button:hover {
          background: linear-gradient(135deg, #2f363d 0%, #3a4148 100%);
          transform: translateY(-2px);
          box-shadow: 0 12px 35px rgba(0, 0, 0, 0.4);
        }
      `}</style>
    </div>
  );
};

export default Login;
