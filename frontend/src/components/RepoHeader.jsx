import React from 'react';
//import { useState, useEffect } from 'react'

const RepoHeader = ({
    yesterdaySummary
}) => {
  if (!yesterdaySummary) return <div className='p-4 text-gray-400'>No  name available</div>;

  return (
    <div className='flex flex-col'>
    
      <div className=' border border-slate-400 rounded-2xl p-4 m-6 max-w-6xl mx-auto'>
        <h1>Name of repo being analyze</h1>
      </div>
    </div>
  );
};

export default RepoHeader;


