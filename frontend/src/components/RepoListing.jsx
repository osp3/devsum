import React, { useState, useEffect } from 'react';
import UserHeader from './UserHeader';
import RepoGrid from './RepoGrid.jsx';

const RepoListing = () => {
  const [repositories, setRepositories] = useState([]); // array to store all GitHub repos
  const [loading, setLoading] = useState(true); // tracks if data is still being fetched
  const [error, setError] = useState(null); // stores any error messages (null = no error)
  const [lastUpdated, setLastUpdated] = useState(null); // remembers when data was last fetched

  // Runs once when the component first loads
  useEffect(() => {
    // API call to get repositories
    const fetchRepositories = async () => {
      try {
        // Step 1: Set loading to true and clear any previous errors
        setLoading(true);
        setError(null);

        // Step 2: Make HTTP request to your backend API
        const response = await fetch(
          `${import.meta.env.VITE_API_URL}/api/repos`,
          {
            credentials: 'include', // send cookies with request (for user authentication)
          }
        );

        // Step 3: Check if the request was successful
        if (!response.ok) {
          // If not successful, throw an error with the status code
          throw new Error(`Failed to fetch repositories: ${response.status}`);
        }

        // Step 4: Convert the response to JSON format
        const data = await response.json();

        // Step 5: Check if your backend says the operation was successful
        if (data.success) {
          // Save the repositories and timestamp to your state
          setRepositories(data.data.repositories);
          setLastUpdated(data.data.lastUpdated);
        } else {
          // Backend returned an error
          throw new Error('Failed to load repositories');
        }
      } catch (err) {
        // Step 6: Handle any errors that occurred
        console.error('Repository fetch error:', err);
        setError(err.message); // store error message to display to user
      } finally {
        // Step 7: Always turn off loading spinner, whether successful or not
        setLoading(false);
      }
    };

    // Call the function to start fetching data
    fetchRepositories();
  }, []); // empty array means this only runs once when component mounts

  // Called when user clicks a refresh button
  const handleRefresh = async () => {
    // Step 1: Reset loading and error states
    setLoading(true);
    setError(null);

    try {
      // Step 2: Make API call with cache disabled to get fresh data
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/repos`,
        {
          credentials: 'include',
          cache: 'no-cache', // force fresh fetch, don't use cached data
        }
      );

      // Step 3: Check if request was successful
      if (!response.ok) {
        throw new Error(`Failed to refresh repositories: ${response.status}`);
      }

      // Step 4: Parse response and update state
      const data = await response.json();

      if (data.success) {
        setRepositories(data.data.repositories);
        setLastUpdated(data.data.lastUpdated);
      }
    } catch (err) {
      // Step 5: Handle errors
      setError(err.message);
    } finally {
      // Step 6: Turn off loading spinner
      setLoading(false);
    }
  };

  // RENDER THE COMPONENT - What the user sees on the page
  return (
    <div>
      <div>
        {/* Show user information at the top */}
        <UserHeader />

        {/* Show different content based on current state */}
        {loading ? (
          // LOADING STATE: Show spinner while fetching data
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <p>Loading repositories...</p>
          </div>
        ) : error ? (
          // ERROR STATE: Show error message and retry button
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <p style={{ color: 'red' }}>Error: {error}</p>
            <button onClick={handleRefresh} style={{ marginTop: '10px' }}>
              Try Again
            </button>
          </div>
        ) : (
          // SUCCESS STATE: Show the repositories
          <div>
            {/* Optional: Add a refresh button at the top */}
            <div style={{ padding: '20px', textAlign: 'center' }}>
              <button onClick={handleRefresh}>Refresh Repositories</button>
              {lastUpdated && (
                <p style={{ fontSize: '14px', color: '#666' }}>
                  Last updated: {new Date(lastUpdated).toLocaleString()}
                </p>
              )}
            </div>

            {/* Display the grid of repositories */}
            <RepoGrid repositories={repositories} />
          </div>
        )}
      </div>
    </div>
  );
};

export default RepoListing;
