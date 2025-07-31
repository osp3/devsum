import React from 'react';

// Component to display AI-generated task priorities for upcoming work
const TomorrowsPriorities = ({
  taskSuggestions, // Array of AI-generated task suggestions
  tasksLoading, // Loading state for task generation
  tasksError, // Error state for task suggestions
  // refreshTasks, // Function to regenerate task suggestions
}) => {
  //handle loading states first
  if (tasksLoading)
    return <div className='p-4 text-white'>Loading tasks...</div>;
  if (tasksError)
    return <div className='p-4 text-white'>Error:{tasksError}</div>;
  if (!taskSuggestions)
    return <div className='p4 text-white'>no task available</div>;

  //extract task from data structure in app.jsx
  const tasks = taskSuggestions;
  console.log(tasks);

  //renders the container with heading always visible
  return (
    <div className='p-2'>
      {/* Heading always renders regardless of task availability */}
      <div className='flex justify-items-start font-bold text-white'>
        Today's Priorities
      </div>

      {/* Conditional content based on tasks availability */}
      {!tasks || !Array.isArray(tasks) || tasks.length === 0 ? (
        <div className='p-4 text-gray-400'>No tasks found in suggestions</div>
      ) : (
        /* add a vertical scrollable bar with a height of 130 */
        <div className='max-h-130 overflow-y-auto pr-2'>
          {/* iterate on each task */}
          {tasks.map((task, index) => (
            <div key={index} className='mb-4'>
              {/* Task Details */}
              <div className='flex flex-col bg-[#272633] rounded-lg p-3 border-l-2 border-[#5b56dd]'>
                {/* gives task title in white  */}
                <h2 className='text-white font-semibold text-sm '>
                  {task.title}
                </h2>
                {/* gives task description added a padding of 3 so that is shows indented from the title */}
                <p className='text-white text-sm  p-3'>{task.description}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TomorrowsPriorities;
