import React from 'react';

const TodaysMetrics = () => {
  return (
    <div className='flex flex-row justify-items-center gap-2'>

      <div className=' rounded-lg   text-[#5b56dd] text-center  bg-[#272633] w-50 h-26 m-4 '>
        <h4 className='flex flex-col justify-items-center text-2xl m-2'>38</h4>
        <h1>Commits Today</h1>
      </div>
      
      <div className=' rounded-lg text-[#5d58da] text-center bg-[#272633] w-50 h-26 m-4'>
        <h4 className='flex flex-col justify-items-center text-2xl m-2'>38</h4>
        <h1>Code Health</h1>
      </div>

      <div className=' rounded-lg  text-[#5d58da] text-center bg-[#272633] w-50 h-26 m-4'>
         <h4 className='flex flex-col justify-items-center text-2xl m-2'>38</h4>
        ???
      </div>

      <div className=' rounded-lg text-[#5d58da] text-center bg-[#272633] w-50 h-26 m-4'>
         <h4 className='flex flex-col justify-items-center text-2xl m-2'>38</h4>
        ??
      </div>
    </div>
  );
};

export default TodaysMetrics;
