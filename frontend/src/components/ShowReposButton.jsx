import React from 'react';
import { useNavigate } from 'react-router-dom';

const ShowReposButton = () => {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate('/repositories'); // Client-side navigation - no page reload!
  };

  return (
    <div className='flex justify-center '>
      <button
        className='bg-blue-700 hover:bg-blue-600 text-white font-medium text-base transition-all duration-200 cursor-pointer shadow-md border border-blue-600 rounded px-6 py-3 flex items-center m-5'
        onClick={handleClick}
      >
        <span>View Your GitHub Repositories</span>
      </button>
    </div>
  );
};

export default ShowReposButton;

//className='px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-medium transition-colors cursor-pointer'
