import React from 'react';

const TomorrowsPriorities = ({ 
  taskSuggestions, 
  tasksLoading, 
  tasksError, 
  refreshTasks 
}) => {

  

  return (
    <div className="">
      <div className="flex justify-center items-center gap-3 text-[#5b56dd] text-2xl">
        <h1>Today's Priorities</h1>
        <button
          onClick={refreshTasks}
          className="text-sm bg-[#5b56dd] text-white px-3 py-1 rounded-lg hover:bg-[#4a48c7] transition-colors"
          title="Refresh task suggestions"
        >
          🔄
        </button>
      </div>
      <div className="m-3">
        {/* Loading state */}
        {tasksLoading && (
          <div className="flex justify-center items-center p-6">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#5b56dd]"></div>
            <span className="ml-3 text-[#5b56dd]">Generating priorities...</span>
          </div>
        )}
        
        {/* Error state */}
        {tasksError && (
          <div className="bg-red-900/20 border border-red-500 rounded-lg p-4 text-red-400">
            <p className="font-semibold">Failed to generate priorities</p>
            <p className="text-sm mt-1">{tasksError}</p>
          </div>
        )}
        
        {/* Task suggestions */}
        {!tasksLoading && !tasksError && taskSuggestions.length > 0 && (
          <ul className="flex flex-col gap-3 items-start rounded-lg text-[#5d58da]">
            {taskSuggestions.map((task, index) => (
              <li key={index} className="bg-[#272633] border border-[#5d58da] rounded-lg p-3 text-[#FFFFFF] w-full">
                <div className="flex items-start gap-3">
                  <span className="text-xl">🎯</span>
                  <div className="flex-1">
                    <div className="font-semibold text-[#5b56dd] mb-1">
                      {task.title}
                    </div>
                    <div className="text-gray-300 text-sm mb-2">
                      {task.description}
                    </div>
                    
                    {/* Based On field */}
                    {task.basedOn && (
                      <div className="text-gray-400 text-xs mb-2 italic">
                        <span className="text-[#5b56dd]">Based on:</span> {task.basedOn}
                      </div>
                    )}
                    
                    {/* Repositories field */}
                    {task.repositories && task.repositories.length > 0 && (
                      <div className="flex items-center gap-1 mb-2 text-xs">
                        <span className="text-[#5b56dd]">Repos:</span>
                        <div className="flex gap-1">
                          {task.repositories.map((repo, repoIndex) => (
                            <span key={repoIndex} className="bg-[#5b56dd]/20 text-[#5b56dd] px-2 py-1 rounded-full text-xs">
                              {repo}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-4 text-xs text-gray-400">
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
                        {task.priority}
                      </span>
                      {task.estimatedTime && (
                        <span className="flex items-center gap-1">
                          <span>⏱️</span>
                          {task.estimatedTime}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
        
        {/* No tasks available */}
        {!tasksLoading && !tasksError && taskSuggestions.length === 0 && (
          <div className="bg-[#272633] border border-[#5d58da] rounded-lg p-4 text-center text-gray-400">
            <p>No priority tasks generated yet.</p>
            <p className="text-sm mt-1">Make some commits to see AI-generated suggestions!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TomorrowsPriorities;
