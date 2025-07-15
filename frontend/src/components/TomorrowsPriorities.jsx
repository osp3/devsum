import React from 'react';

// Component to display AI-generated task priorities for upcoming work
const TomorrowsPriorities = ({
  taskSuggestions, // Array of AI-generated task suggestions
  tasksLoading, // Loading state for task generation
  tasksError, // Error state for task suggestions
  refreshTasks, // Function to regenerate task suggestions
}) => {
  //handle loading states first
  if(tasksLoading)return <div className='p-4 text-white'>Loading tasks...</div>
  if(tasksError) return <div className= 'p-4 text-white'>Error:{tasksError}</div>
 if(!taskSuggestions)return <div className = 'p4 text-white'>no task available</div>
 // Access tasks from the nested data structure
  const tasks = taskSuggestions;
  console.log(tasks)

 if (!tasks || !Array.isArray(tasks) || tasks.length === 0) 
    return <div className='p-4 text-gray-400'>No tasks found in suggestions</div>;
  return (
      <div className='p-2'>
      <div className='flex justify-items-start font-bold text-white'>
       Todays Priorities
      </div>
      
      <div className='max-h-130 overflow-y-auto pr-2'>
        {tasks.map((task, index) => (
          <div key={index} className='mb-4'>
        
            {/* Task Details */}
            
            <div className='
            flex flex-col bg-[#272633] rounded-lg p-3 border-l-4 border-[#5b56dd]'>
              <h2 className='text-white font-semibold text-sm '>{task.title}</h2>
              <p className='text-white text-sm mb-3 p-3'>{task.description}</p>
              
              <div className='flex items-center gap-4 text-xs text-gray-400'>
               
             
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};


export default TomorrowsPriorities;
