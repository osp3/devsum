import React from 'react';

const ShowReposButton = () => {
  // const [button, setButton]= useState('')
  const handleClick = () => {
    window.location.href = 'http://localhost:5173/repositories';
  };

  return (
    <div className='flex justify-center '>
      <button
        className='bg-[#262728] boarder-2 boarder-black btn flex items-center m-5'
        onClick={handleClick}
      >
        <h1>GitHub Repos</h1>
      </button>
    </div>
  );
};

export default ShowReposButton;
