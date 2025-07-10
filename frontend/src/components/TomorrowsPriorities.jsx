import React from 'react';

const TomorrowsPriorities = () => {




  return (
    <div className=''>
      <div className='flex justify-center  text-[#5b56dd] text-2xl'>
        <h1>Tomorrow's Priorities </h1>
      </div>
      <div className='m-3'>
        <ul className='flex flex-col gap-3  items-start  list-disc rounded-lg text-[#5d58da]  '>
          <li className ='bg-[#272633] border border-[#5d58da] rounded-lg p-3 text-[#5d58da] '> 
             <span className="text-3xl flex-row item-center text-white ">•</span>
            <span> Start working on analysis page</span>
            
            </li>

          <li className='bg-[#272633] border border-[#5d58da] rounded-lg p-3 text-[#5d58da]'>  
            List of things to do tomorrow morning</li>
        </ul>
      </div>
    </div>
  );
};

export default TomorrowsPriorities;

//bullet point outside or inside
