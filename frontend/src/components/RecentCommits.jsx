import React from 'react';
import CommitItem from './CommitItem.jsx';

const RecentCommits = () => {
  return (
    <div className='p4'>
      <div className='flex justify-items-start font-bold text-white'>
       Recent Commits
      </div>
      <div className='relative flex flex-row justify-between items-center rounded-lg text-[#5b56dd] bg-[#272633] shadow-[-4px_0_0_0px] m-3'>
        <button className='btn bg-[#44905e] text-white px-3 py-1 rounded'>
          {} repos
        </button>
        <h1 className='flex-1 p-2 text-white'>{}</h1>
        <span className='absolute top-2 right-2 text-xs text-gray-500'>
          date
        </span>
      </div>
    </div>

  );
};

export default RecentCommits;
  

//- took out commit items don't think its we need it
 
//flex-3  border border-slate-400 rounded-2xl w-150 h-120 p-4


//  <div>
//       <h1>RECENT COMMITS</h1>
      
//       <CommitItem />

      
//     </div>