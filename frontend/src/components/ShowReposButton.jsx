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
        className='bg-[#262728]  hover:bg-blue-700  transition-colors cursor-pointer boarder-2 boarder-black btn flex items-center m-5'
        onClick={handleClick}
      >
        <h1>GitHub Repos</h1>
      </button>
    </div>
  );
};

export default ShowReposButton;


//className='px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-medium transition-colors cursor-pointer'