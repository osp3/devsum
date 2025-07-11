import React from 'react';
import { useNavigate } from 'react-router-dom';

const RepoCard = ({ repository, isSelected = false, onSelect }) => {
  const navigate = useNavigate();
  // Language colors for visual appeal
  const languageColors = {
    JavaScript: 'bg-yellow-500',
    TypeScript: 'bg-blue-500', 
    Python: 'bg-green-500',
    Java: 'bg-red-500',
    Go: 'bg-cyan-500',
    Rust: 'bg-orange-500',
    PHP: 'bg-purple-500',
    Ruby: 'bg-red-600',
    C: 'bg-blue-600',
    'C++': 'bg-blue-700',
    'C#': 'bg-purple-600',
    Swift: 'bg-orange-600',
    Kotlin: 'bg-purple-700',
  };

  const getLanguageColor = (language) => {
    return languageColors[language] || 'bg-gray-500';
  };

  const handleClick = () => {
    onSelect(); // Update selected repo in app state
    navigate('/repository'); // Navigate to analytics page
  };

  return (
    <div
      onClick={handleClick}
      className={`
        border rounded-lg p-6 cursor-pointer transition-all duration-200 hover:shadow-lg
        ${isSelected 
          ? 'border-[#5b56dd] bg-[#2a2a3e] shadow-lg ring-2 ring-[#5b56dd] ring-opacity-50' 
          : 'border-slate-600 bg-[#272633] hover:border-slate-500 hover:bg-[#2a2a3e]'
        }
      `}
    >
      {/* Repository name and privacy indicator */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-white truncate flex-1 mr-2">
          {repository.name}
        </h3>
        {repository.private && (
          <span className="text-xs px-2 py-1 bg-gray-600 text-gray-300 rounded-full">
            Private
          </span>
        )}
      </div>

      {/* Repository description */}
      <p className="text-gray-400 text-sm mb-4 h-12 overflow-hidden">
        {repository.description || 'No description available'}
      </p>

      {/* Repository metadata */}
      <div className="flex items-center justify-between">
        {/* Language indicator */}
        {repository.language && (
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${getLanguageColor(repository.language)}`}></div>
            <span className="text-xs text-gray-400">{repository.language}</span>
          </div>
        )}
        
        {/* Last updated */}
        <span className="text-xs text-gray-500">
          Updated {new Date(repository.updatedAt).toLocaleDateString()}
        </span>
      </div>

      {/* Selection indicator */}
      {isSelected && (
        <div className="mt-4 text-center">
          <span className="text-xs px-3 py-1 bg-[#5b56dd] text-white rounded-full">
            Selected
          </span>
        </div>
      )}
    </div>
  );
};

export default RepoCard;
