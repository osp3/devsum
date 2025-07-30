import React from 'react';
import { useNavigate } from 'react-router-dom';

// RepoCard displays individual repository info & actions
// Props:
// repository: object containing GitHub repository data (name, description, language, etc.)
// setSelectedRepo: function to update selected repository in App.jsx state
const RepoCard = ({ repository, setSelectedRepo }) => {
  const navigate = useNavigate();

  // Handler function for when user clicks "Analyze" button
  const handleAnalyze = () => {
    console.log('Analyzing repository:', repository.name);
    // Set this repository as the currently selected one
    // This makes the repo data available to other components (like RepoAnalytics)
    setSelectedRepo(repository);
    // Navigate to the RepoAnalytics page (/repository route)
    // The selected repo data will be available there via props
    navigate('/repository');
  };

  return (
    <div className='bg-white/10 backdrop-blur border border-white/20 rounded-lg p-6 hover:bg-white/15 transition-all duration-200 hover:scale-105'>
      <h3 className='text-xl font-semibold text-white mb-3 truncate'>
        {repository.name}
      </h3>
      <p className='text-white/80 mb-4 line-clamp-2 min-h-[3rem]'>
        {repository.description || 'No description'}
      </p>
      <p className='text-white/60 mb-6'>
        <span className='text-white/80 font-medium'>Language:</span>{' '}
        {repository.language || 'Not specified'}
      </p>

      {/* Analyze button that selects repo and navigates to analytics page */}
      <button
        onClick={handleAnalyze}
        className='w-full px-4 py-2 bg-blue-700 hover:bg-blue-600 text-white font-medium text-sm rounded shadow-md border border-blue-600 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-transparent'
      >
        Analyze
      </button>
    </div>
  );
};

export default RepoCard;
