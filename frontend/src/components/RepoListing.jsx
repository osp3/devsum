import React, { useState, useEffect } from 'react';
import UserHeader from './UserHeader';
import RepoGrid from './RepoGrid.jsx';

const RepoListing = () => {
  const [repositories, setRepositories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Fetch repositories from backend API
  useEffect(() => {
    const fetchRepositories = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/repos`, {
          credentials: 'include' // Include session cookies
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch repositories: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.success) {
          setRepositories(data.data.repositories);
          setLastUpdated(data.data.lastUpdated);
        } else {
          throw new Error('Failed to load repositories');
        }
      } catch (err) {
        console.error('Repository fetch error:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchRepositories();
  }, []);

  // Refresh repositories
  const handleRefresh = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/repos`, {
        credentials: 'include',
        cache: 'no-cache' // Force fresh fetch
      });

      if (!response.ok) {
        throw new Error(`Failed to refresh repositories: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setRepositories(data.data.repositories);
        setLastUpdated(data.data.lastUpdated);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <UserHeader />
    </div>
  );
};

export default RepoListing;
