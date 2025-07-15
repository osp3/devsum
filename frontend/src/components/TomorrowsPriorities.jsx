import React from 'react';

// Component to display AI-generated task priorities for upcoming work
const TomorrowsPriorities = ({
  taskSuggestions, // Array of AI-generated task suggestions
  tasksLoading, // Loading state for task generation
  tasksError, // Error state for task suggestions
  refreshTasks, // Function to regenerate task suggestions
}) => {
  if(tasksLoading)return <div className='p-4 text-white'>Loading tasks...</div>
  if(tasksError) return <div className= 'p-4 text-white'>Error:{tasksError}</div>
 if(!taskSuggestions)return <div className = 'p4 text-white'>no task available</div>
  return (
    <div className="">
      {/* Header section with priorities title */}
      <div className="flex justify-start font-bold text-1x p-2">
        <h1>Today's Priorities </h1>
      </div>
      
      {/* Priority tasks list container */}
      <div className="m-3 ">
        {/* Hardcoded task list - should be replaced with dynamic taskSuggestions */}
        <div className="flex flex-col gap-3 p-1 items-start rounded-lg text-[#5d58da] ">
          


          {/* Sample priority task item */}
          <li className="bg-[#272633] border border-[#5d58da] rounded-lg p-2 text-[#FFFFFF] ">
            <span className="text-3xl flex-row item-center text-white "></span>
            <span>{taskSuggestions.description}</span>
          </li>

        </div>
      </div>
    </div>
  );
};

export default TomorrowsPriorities;
