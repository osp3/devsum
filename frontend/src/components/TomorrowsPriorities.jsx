import React from 'react';
import { useState, useEffect } from 'react';

const TomorrowsPriorities = ({ yesterdaySummary }) => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchTaskSuggestions = async () => {
    if (!yesterdaySummary) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/ai/task-suggestions`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            yesterdaySummary: yesterdaySummary,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch task suggestions: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        setTasks(result.data.tasks || []);
        console.log('🎯 Task suggestions generated:', result.data);
      } else {
        throw new Error(result.error || 'Failed to generate task suggestions');
      }
    } catch (error) {
      console.error('Task suggestion error:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (yesterdaySummary && yesterdaySummary.formattedCommits?.allCommits?.length > 0) {
      fetchTaskSuggestions();
    }
  }, [yesterdaySummary]);

  const getPriorityColor = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'high':
        return 'border-red-500 bg-red-500/10 text-red-300';
      case 'medium':
        return 'border-yellow-500 bg-yellow-500/10 text-yellow-300';
      case 'low':
        return 'border-blue-500 bg-blue-500/10 text-blue-300';
      default:
        return 'border-gray-500 bg-gray-500/10 text-gray-300';
    }
  };

  const getPriorityIcon = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'high':
        return '🔴';
      case 'medium':
        return '🟡';
      case 'low':
        return '🔵';
      default:
        return '⚪';
    }
  };

  const getCategoryIcon = (category) => {
    switch (category?.toLowerCase()) {
      case 'feature':
        return '✨';
      case 'bugfix':
        return '🐛';
      case 'refactor':
        return '🔧';
      case 'testing':
        return '🧪';
      case 'docs':
        return '📚';
      case 'optimization':
        return '⚡';
      default:
        return '📋';
    }
  };

  return (
    <div className="bg-[#1a1928] rounded-lg p-6 border border-[#2d2b3e]">
      <div className="flex items-center justify-center mb-6">
        <h2 className="text-2xl font-bold text-[#5b56dd] flex items-center gap-2">
          🎯 Today's Priorities
        </h2>
      </div>

      {loading && (
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#5b56dd]"></div>
          <span className="ml-3 text-gray-300">Generating AI-powered task suggestions...</span>
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500 rounded-lg p-4 text-red-300">
          <div className="flex items-center gap-2">
            <span>❌</span>
            <span>Error: {error}</span>
          </div>
        </div>
      )}

      {!loading && !error && tasks.length === 0 && (
        <div className="text-center text-gray-400 p-8">
          <div className="text-4xl mb-4">📋</div>
          <p>No task suggestions available</p>
          <p className="text-sm mt-2">
            {yesterdaySummary ? 'Try refreshing the page to generate new tasks' : 'Yesterday\'s summary is needed to generate tasks'}
          </p>
        </div>
      )}

      {!loading && !error && tasks.length > 0 && (
        <div className="space-y-4">
          {tasks.map((task, index) => (
            <div
              key={index}
              className={`rounded-lg p-4 border-2 transition-all duration-200 hover:shadow-lg ${getPriorityColor(task.priority)}`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{getPriorityIcon(task.priority)}</span>
                  <span className="text-xl">{getCategoryIcon(task.category)}</span>
                  <h3 className="font-semibold text-white text-lg">{task.title}</h3>
                </div>
                <div className="flex flex-col items-end text-sm">
                  <span className="text-gray-300 capitalize">{task.priority} Priority</span>
                  <span className="text-gray-400">{task.estimatedTime}</span>
                </div>
              </div>
              
              <p className="text-gray-300 mb-3 leading-relaxed">{task.description}</p>
              
              {task.basedOn && (
                <div className="bg-[#2d2b3e] rounded-md p-2 text-sm text-gray-400 border-l-4 border-[#5b56dd]">
                  <strong>Based on:</strong> {task.basedOn}
                </div>
              )}
              
              <div className="flex items-center justify-between mt-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs bg-[#5b56dd] text-white px-2 py-1 rounded-full">
                    {task.category}
                  </span>
                  {task.repositories && task.repositories.length > 0 && (
                    <span className="text-xs bg-gray-600 text-gray-200 px-2 py-1 rounded-full">
                      {task.repositories.join(', ')}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && !error && tasks.length > 0 && (
        <div className="mt-6 p-4 bg-[#2d2b3e] rounded-lg border border-[#5b56dd]">
          <div className="flex items-center gap-2 text-sm text-gray-300">
            <span>🤖</span>
            <span>
              Generated {tasks.length} intelligent task suggestions based on yesterday's AI analysis
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default TomorrowsPriorities;
