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
    // Set this repository as the currently selected one
    // This makes the repo data available to other components (like RepoAnalytics)
    setSelectedRepo(repository);
    // Navigate to the RepoAnalytics page (/repository route)
    // The selected repo data will be available there via props
    navigate('/repository');
  };

  return (
    <div className='panel p-6 transition-colors hover:border-fg/25'>
      <h3 className='text-lg font-semibold tracking-tight mb-2 truncate'>
        {repository.name}
      </h3>
      <p className='text-sm leading-6 text-fg/65 mb-4 line-clamp-2 min-h-12'>
        {repository.description || 'No description'}
      </p>
      <p className='font-geist-mono text-xs text-fg/60 mb-6'>
        {repository.language || 'Language not specified'}
      </p>

      {/* Analyze button that selects repo and navigates to analytics page */}
      <button
        onClick={handleAnalyze}
        className='btn-primary w-full h-9 px-4 font-medium text-sm cursor-pointer'
      >
        Analyze
      </button>
    </div>
  );
};

export default RepoCard;
