import React from 'react';
import { useState, useEffect } from 'react';

const TomorrowsPriorities = ({ yesterdaySummary }) => {
  // State management for AI-generated task suggestions
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch AI-powered task suggestions based on yesterday's summary
  useEffect(() => {
    const fetchTaskSuggestions = async () => {
      // Guard clause - exit early if no summary data
      if (!yesterdaySummary) return;

      // Set loading state
      setLoading(true);
      setError(null);

      try {
        // API call to generate task suggestions
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

        // Handle HTTP errors
        if (!response.ok) {
          throw new Error(
            `Failed to fetch task suggestions: ${response.status}`
          );
        }

        const result = await response.json();

        // Process successful response
        if (result.success) {
          setTasks(result.data.tasks || []);
          console.log('🎯 Task suggestions generated:', result.data);
        } else {
          throw new Error(
            result.error || 'Failed to generate task suggestions'
          );
        }
      } catch (error) {
        // Handle all errors
        console.error('Task suggestion error:', error);
        setError(error.message);
      } finally {
        // Reset loading state
        setLoading(false);
      }
    };

    // Trigger fetch only if summary has commit data
    if (
      yesterdaySummary &&
      yesterdaySummary.formattedCommits?.allCommits?.length > 0
    ) {
      fetchTaskSuggestions();
    }
  }, [yesterdaySummary]);

  return (
    <div className="">
      <div className="flex justify-center  text-[#5b56dd] text-2xl">
        <h1>Tomorrow's Priorities </h1>
      </div>
      <div className="m-3">
        <ul className="flex flex-col gap-3  items-start rounded-lg text-[#5d58da]  ">
          <li className="bg-[#272633] border border-[#5d58da] rounded-lg p-3 text-[#FFFFFF] ">
            <span className="text-3xl flex-row item-center text-white "></span>
            <span> Start working on analysis page</span>
          </li>

          <li className="bg-[#272633] border border-[#5d58da] rounded-lg p-3 text-[#FFFFFF]">
            List of things to do tomorrow morning
          </li>
        </ul>
      </div>
    </div>
  );
};

export default TomorrowsPriorities;
