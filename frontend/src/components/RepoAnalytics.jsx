import React, { useState, useEffect } from 'react';
import UserHeader from './UserHeader';
import RepoHeader from './RepoHeader.jsx';
import RepoMetricDisplay from './RepoMetricDisplay.jsx';
import RecentCommits from './RecentCommits.jsx';

const RepoAnalytics = ({ user, selectedRepo }) => {
  // State for commit data
  const [commits, setCommits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch commit data for the selected repository
  const fetchCommits = async (repo) => {
    if (!repo) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const [owner, name] = repo.fullName.split('/');
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/repos/${owner}/${name}/commits?per_page=20`,
        {
          credentials: 'include',
        }
      );
      
      if (!response.ok) {
        throw new Error(`Failed to fetch commits: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        setCommits(data.data.commits);
        console.log(`📊 Fetched ${data.data.commits.length} commits for ${repo.fullName}`);
      } else {
        throw new Error('Failed to load commits');
      }
    } catch (error) {
      console.error('Commit fetch error:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch commits when selectedRepo changes
  useEffect(() => {
    if (selectedRepo) {
      fetchCommits(selectedRepo);
    }
  }, [selectedRepo]);

  // Show message if no repository is selected
  if (!selectedRepo) {
    return (
      <div className='min-h-screen bg-[#1a1928]'>
        <UserHeader user={user} />
        <div className='flex justify-center items-center h-64'>
          <div className='text-white text-xl'>
            Please select a repository to view analytics
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-[#1a1928]'>
      <UserHeader user={user} />

      <div className='flex justify-center'>
        <RepoHeader selectedRepo={selectedRepo} />
      </div>

      <div className='flex flex-col  items-center  border border-slate-400   rounded-2xl  p-4 gap-6 max-w-6xl mx-auto '>
        <RepoMetricDisplay selectedRepo={selectedRepo} commits={commits} loading={loading} />
        <RecentCommits 
          commits={commits} 
          loading={loading} 
          error={error} 
          selectedRepo={selectedRepo}
        />
      </div>
    </div>
  );
};

export default RepoAnalytics;
