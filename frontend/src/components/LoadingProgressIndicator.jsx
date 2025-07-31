import React from 'react';

const LoadingProgressIndicator = ({
  message = 'Loading...',
  showSpinner = true,
  showProgressBar = true,
  size = 'medium',
  progress = null, // 0-100 percentage, null for animated progress
}) => {
  const sizeClasses = {
    small: 'h-4 w-4',
    medium: 'h-8 w-8',
    large: 'h-12 w-12',
  };

  // Ensure progress is within valid range
  const validProgress =
    progress !== null ? Math.max(0, Math.min(100, progress)) : null;

  return (
    <div className='flex flex-col items-center justify-center p-6 space-y-4'>
      {/* Spinner */}
      {showSpinner && (
        <div
          className={`animate-spin rounded-full border-2 border-gray-600 border-t-[#5b56dd] ${sizeClasses[size]}`}
        ></div>
      )}

      {/* Progress bar */}
      {showProgressBar && (
        <div className='w-full max-w-xs bg-gray-700 rounded-full h-2 overflow-hidden'>
          {validProgress !== null ? (
            // Real progress bar
            <>
              <div
                className='h-full bg-gradient-to-r from-[#5b56dd] to-[#7c71f5] rounded-full transition-all duration-500 ease-out'
                style={{ width: `${validProgress}%` }}
              />
              {/* Progress percentage text */}
              <div className='text-center text-xs text-gray-300 mt-2 font-medium'>
                {Math.round(validProgress)}%
              </div>
            </>
          ) : (
            // Animated progress bar (fallback)
            <div className='h-full bg-gradient-to-r from-[#5b56dd] to-[#7c71f5] rounded-full animate-pulse w-3/4'></div>
          )}
        </div>
      )}

      {/* Loading message */}
      <div className='text-white text-sm font-medium animate-pulse'>
        {message}
      </div>

      {/* Dots animation */}
      <div className='flex space-x-1'>
        <div className='w-2 h-2 bg-[#5b56dd] rounded-full animate-bounce'></div>
        <div className='w-2 h-2 bg-[#5b56dd] rounded-full animate-bounce [animation-delay:0.1s]'></div>
        <div className='w-2 h-2 bg-[#5b56dd] rounded-full animate-bounce [animation-delay:0.2s]'></div>
      </div>
    </div>
  );
};

export default LoadingProgressIndicator;
