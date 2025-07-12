import React from 'react';
import { useState, useEffect } from 'react';

const TodaysSummary = ({
  repositories,
  reposLoading,
  reposError,
  selectedRepo,
}) => {
  // console.log('TodaysSummary component loaded!')
  const [summary, setSummary] = useState('');
  const [commits, setCommits] = useState([]);
  const [loading, setLoading] = useState(false);
  //const [summaryDate, setSummaryDate]= useState()

  console.log('TodaysSummary - selectedRepo:', selectedRepo);

  const fetchCommitsAndSummary = async (repositoryId) => {
    if (!repositoryId) {
      console.log('no repository ID provided');
      return;
    }
    setLoading(true);
    console.log('Fetching commits for repository:', repositoryId);

    try {
      const [owner, repo] = selectedRepo.fullName.split('/');

      console.log(`Fetching commits for ${owner}/${repo}`);

      const today = new Date().toISOString().split('T')[0];
      const commitsResponse = await fetch(
        // taken from repository controller line40 route on api.js
        `${
          import.meta.env.VITE_API_URL
        }/api/repos/${owner}/${repo}/commits?per_page=50`,

        // `${import.meta.env.VITE_API_URL}/api/repos/${repositoryId}/commits?date=${today}`,
        {
          credentials: 'include',
        }
      );

      // /repos/:owner/:repo/commits'

      if (!commitsResponse.ok) {
        throw new Error(`Failed to fetch commits: ${commitsResponse.status}`);
      }

      const commitsData = await commitsResponse.json();
      const allCommits = commitsData.data?.commits || [];
      console.log(allCommits[0]);

      //  const today = new Date().toISOString().split('T')[0];
      const todaysCommits = allCommits.filter((commit) => {
        try {
          const dateValue = commit.commit?.author?.date || commit.date;
          if (!dateValue) return false;

          const commitDate = new Date(dateValue);
          if (isNaN(commitDate.getTime())) return false;

          return commitDate.toISOString().split('T')[0] === today;
        } catch (error) {
          console.warn('Invalid date in commit:', commit);
          return false;
        }
        // const commitDate = new Date().toISOString().split('T')[0];
        // return commitDate === today;
      });

      console.log("Today's commits after filtering:", todaysCommits);
      setCommits(todaysCommits);

      if (todaysCommits.length > 0) {
        console.log('Generating summary for', todaysCommits.length, 'commits');

        const summaryResponse = await fetch(
          `${import.meta.env.VITE_API_URL}/api/ai/daily-summary`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              commits: todaysCommits,
              repositoryId: repositoryId,
              date: today,
            }),
          }
        );

        if (!summaryResponse.ok) {
          throw new Error(`Summary API failed: ${summaryResponse.status}`);
        }
        const result = await summaryResponse.json();
        console.log('Summary API response:', result);

        if (result.success && result.data.summary) {
          setSummary(result.data.summary);
        } else {
          setSummary('Unable to generate summary');
        }
      } else {
        setSummary('No commits found for today');
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setSummary(`Error loading summary: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedRepo?.id && !reposLoading) {
      fetchCommitsAndSummary(selectedRepo.id);
    }
  }, [selectedRepo?.id, reposLoading]);

  //      console.log('Props received:', { commits, repositoryId, date });
  //     summaryData();

  //   }
  // }, [commits, repositoryId, date]);

  //possible for button colors
  const ProperCommits = {
    feature: { color: 'bg-green-100 text-green-800', label: 'Feature' },
    bug: { color: 'bg-red-100 text-red-800', label: 'Bug Fix' },
    refactor: { color: 'bg-blue-100 text-blue-800', label: 'Refactor' },
    docs: { color: 'bg-purple-100 text-purple-800', label: 'Docs' },
    test: { color: 'bg-yellow-100 text-yellow-800', label: 'Test' },
    chore: { color: 'bg-gray-100 text-gray-800', label: 'Chore' },
  };

  return (
    <div className='p-4'>
      {/* put on the left of summary component */}
      <div className='flex justify-items-start font-bold'>
        Today's Development Summary
      </div>

      {/* Creates box with background color and purple shadow at the left */}
      <div className=' relative flex flex-row justify-between items-center rounded-lg text-[#5b56dd] bg-[#272633] shadow-[-4px_0_0_0px] m-3'>
        <button className='btn bg-[#44905e] '>feat</button>

        {/*   puts this summery to the left next to button */}
        <h1 className='flex-1 p-2'>
          {' '}
          {loading ? 'Loading summary...' : summary || 'No summary available'}
          {commits}{' '}
        </h1>
        {/* if date want to be center just get ride of the absolute and relative */}

        <span className=' absolute top-2 right-2 text-xs text-gray-500 flex items-start'>
          {new Date().toLocaleDateString()}
        </span>
      </div>
    </div>
  );
};

export default TodaysSummary;
