import React, { useState, useEffect } from 'react';
import UserHeader from './UserHeader';
import RepoHeader from './RepoHeader.jsx';
import RepoMetricDisplay from './RepoMetricDisplay.jsx';
import RecentCommits from './RecentCommits.jsx';

// Main repository analytics page component
const RepoAnalytics = ({ user, selectedRepo }) => {
  // State management for commit data and UI feedback
  const [commits, setCommits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch recent commits for the selected repository
  const fetchCommits = async (repo) => {
    if (!repo) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Parse repository owner and name from fullName
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

  // Auto-fetch commits when repository selection changes
  useEffect(() => {
    if (selectedRepo) {
      fetchCommits(selectedRepo);
    }
  }, [selectedRepo]);

  // Display prompt when no repository is selected
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

  // Main analytics dashboard layout
  return (
    <div className='min-h-screen bg-[#1a1928]'>
      <UserHeader user={user} />

      {/* Repository header section */}
      <div className='flex justify-center'>
        <RepoHeader selectedRepo={selectedRepo} />
      </div>

      {/* Analytics content container */}
      <div className='flex flex-col  items-center  border border-slate-400   rounded-2xl  p-4 gap-6 max-w-6xl mx-auto '>
        {/* Repository metrics display */}
        <RepoMetricDisplay selectedRepo={selectedRepo} commits={commits} loading={loading} />
        {/* Recent commits list */}
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
