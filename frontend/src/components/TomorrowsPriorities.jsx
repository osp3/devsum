import React from 'react';
import PriorityTag from './PriorityTag.jsx';

// Component to display AI-generated task priorities for upcoming work
const TomorrowsPriorities = ({
  taskSuggestions, // Array of AI-generated task suggestions
  tasksLoading, // Loading state for task generation
  tasksError, // Error state for task suggestions
  // refreshTasks, // Function to regenerate task suggestions
}) => {
  //handle loading states first
  if (tasksLoading)
    return <div className='p-4 text-fg/60'>Loading tasks...</div>;
  if (tasksError)
    return <div className='p-4 text-node-red'>Error: {tasksError}</div>;
  if (!taskSuggestions)
    return <div className='p-4 text-fg/60'>No tasks available</div>;

  //extract task from data structure in app.jsx
  const tasks = taskSuggestions;

  //renders the container with heading always visible
  return (
    <div className='p-2'>
      {/* Heading always renders regardless of task availability */}
      <p className='eyebrow'>Today&apos;s priorities</p>

      {/* Conditional content based on tasks availability */}
      {!tasks || !Array.isArray(tasks) || tasks.length === 0 ? (
        <div className='p-4 text-fg/60'>No tasks found in suggestions</div>
      ) : (
        /* add a vertical scrollable bar with a height of 130 */
        <ul className='mt-3 max-h-130 overflow-y-auto divide-y divide-line border-y border-line pr-2'>
          {tasks.map((task, index) => (
            <li key={index} className='py-3'>
              <div className='flex items-start gap-3'>
                <PriorityTag level={task.priority} />
                <h2 className='text-sm font-semibold leading-5'>{task.title}</h2>
              </div>
              <p className='mt-1.5 text-sm leading-6 text-fg/65'>{task.description}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default TomorrowsPriorities;
