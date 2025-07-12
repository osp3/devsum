import React from 'react';

const RepoMetricDisplay = () => {
  return (
    <div className='flex flex-row gap-2'>
      <div className='flex-1 flex-item-center border border-slate-400 rounded-lg m-4 '>
        <h1 className='flex justify-center m-2'>6</h1>
        <h1 className='flex justify-center m-2'>Total commits </h1>
      </div>
      <div className='flex-1 min-w-30 flex-item-center border border-slate-400   rounded-lg m-4 '>
        <h1 className='flex justify-center m-2'>6</h1>
        <h1 className='flex justify-center m-2'>Feature</h1>
      </div>
    </div>
  );
};

export default RepoMetricDisplay;


// I need to bring from app js yesterday summary
