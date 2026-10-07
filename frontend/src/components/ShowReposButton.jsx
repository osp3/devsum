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
        className='btn-primary h-11 px-6 font-medium cursor-pointer flex items-center m-6'
        onClick={handleClick}
      >
        <span>View Your GitHub Repositories</span>
      </button>
    </div>
  );
};

export default ShowReposButton;

//className='px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-medium transition-colors cursor-pointer'
