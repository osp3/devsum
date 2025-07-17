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
    <div>
      <h3>{repository.name}</h3>
      <p>{repository.description || 'No description'}</p>
      <p>Language: {repository.language || 'Not specified'}</p>

      {/* Analyze button that selects repo and navigates to analytics page */}
      <button
        onClick={handleAnalyze}
        style={{
          marginRight: '10px',
          padding: '8px 16px',
          backgroundColor: '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
        }}
      >
        Analyze
      </button>
    </div>
  );
};

export default RepoCard;
