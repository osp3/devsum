import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import UserHeader from './UserHeader';
import RepoHeader from './RepoHeader.jsx';
import RepoMetricDisplay from './RepoMetricDisplay.jsx';
import RecentCommits from './RecentCommits.jsx';

// Helper function to format metric values for display
const formatMetricValue = (key, value) => {
  if (value === null || value === undefined) return 'N/A';
  
  // Handle specific metric types based on the actual backend response
  if (typeof value === 'object' && value !== null) {
    // Handle commit distribution
    if (key === 'commitDistribution') {
      const entries = Object.entries(value);
      return entries.map(([type, count]) => `${count} ${type} commits`).join(', ');
    }
    
    // Handle message quality object
    if (key === 'messageQuality') {
      const { descriptivePercentage, conventionalPercentage, averageLength } = value;
      return `${descriptivePercentage}% descriptive, ${conventionalPercentage}% conventional, avg length: ${averageLength}`;
    }
    
    // Handle patterns object
    if (key === 'patterns') {
      const { healthScore, ...patterns } = value;
      const activePatterns = Object.entries(patterns)
        .filter(entry => entry[1] > 0)
        .map(([k, v]) => `${k}: ${v}`);
      
      const health = healthScore ? `Health: ${Math.round(healthScore * 100)}%` : '';
      const patternText = activePatterns.length > 0 ? activePatterns.slice(0, 2).join(', ') : 'No significant patterns';
      
      return health ? `${health}, ${patternText}` : patternText;
    }
    
    // Generic object handling - show key properties
    const entries = Object.entries(value).slice(0, 2);
    return entries.map(([k, v]) => {
      if (typeof v === 'number' && v >= 0 && v <= 1 && !Number.isInteger(v)) {
        return `${k}: ${Math.round(v * 100)}%`;
      }
      return `${k}: ${v}`;
    }).join(', ') + (Object.keys(value).length > 2 ? '...' : '');
  }
  
  // Handle numbers
  if (typeof value === 'number') {
    // If it looks like a percentage (0-1 range), format as percentage
    if (value >= 0 && value <= 1 && !Number.isInteger(value)) {
      return Math.round(value * 100) + '%';
    }
    return value.toString();
  }
  
  // Handle strings and other types
  const str = String(value);
  // Truncate long strings to prevent overflow
  return str.length > 60 ? str.substring(0, 57) + '...' : str;
};

// Helper function to format metric names for display
const formatMetricName = (key) => {
  const nameMap = {
    'commitDistribution': 'Commit Distribution',
    'messageQuality': 'Message Quality',
    'patterns': 'Code Patterns'
  };
  
  return nameMap[key] || key
    .replace(/([A-Z])/g, ' $1') // Add space before capital letters
    .replace(/^./, str => str.toUpperCase()) // Capitalize first letter
    .trim();
};

// Helper function to get severity color
const getSeverityColor = (severity) => {
  switch (severity?.toLowerCase()) {
    case 'critical': return 'text-red-500';
    case 'high': return 'text-red-400';
    case 'medium': return 'text-yellow-400';
    case 'low': return 'text-blue-400';
    default: return 'text-gray-400';
  }
};

// Color mapping for commit types (same as Dashboard)
const commitTypeColors = {
  feat: 'bg-green-500 text-white',
  fix: 'bg-red-500 text-white',
  docs: 'bg-blue-500 text-white',
  style: 'bg-purple-500 text-white',
  refactor: 'bg-yellow-500 text-black',
  test: 'bg-orange-500 text-white',
  chore: 'bg-gray-500 text-white',
  perf: 'bg-pink-500 text-white',
  ci: 'bg-indigo-500 text-white',
  build: 'bg-cyan-500 text-white',
  revert: 'bg-red-700 text-white',
  other: 'bg-gray-400 text-white'
};

// Helper function to get commit type color class
const getCommitTypeColor = (type) => {
  return commitTypeColors[type] || commitTypeColors.other;
};

// Helper function to format commit with AI data
const formatCommitDisplay = (commit) => {
  if (commit.aiGenerated) {
    return {
      type: commit.aiGenerated.type,
      scope: commit.aiGenerated.scope,
      description: commit.aiGenerated.description,
      formatted: commit.aiGenerated.formatted,
      summary: commit.aiGenerated.summary,
      confidence: commit.aiGenerated.confidence
    };
  }
  
  // Fallback to original message parsing if no AI data
  const message = commit.message || 'Unknown commit';
  const firstLine = message.split('\n')[0];
  const conventionalMatch = firstLine.match(/^(\w+)(\(.+\))?\s*:\s*(.+)/);
  
  if (conventionalMatch) {
    return {
      type: conventionalMatch[1],
      scope: conventionalMatch[2] ? conventionalMatch[2].slice(1, -1) : null,
      description: conventionalMatch[3],
      formatted: firstLine,
      summary: firstLine,
      confidence: 0.5
    };
  }
  
  return {
    type: 'other',
    scope: null,
    description: firstLine,
    formatted: `other: ${firstLine}`,
    summary: firstLine,
    confidence: 0.3
  };
};

const RepoAnalytics = ({ 
  selectedRepo,        // Currently selected repository object
  reposLoading,        // Boolean: true while fetching repositories
  getCachedAnalysis,   // Function to get cached analysis for a repo
  setCachedAnalysis,   // Function to cache analysis for a repo
  clearAnalysisCache,  // Function to clear analysis cache
  currentAnalysisLoading, // Loading state for current analysis
  setCurrentAnalysisLoading // Function to update analysis loading state
}) => {
    const navigate = useNavigate();
  
  const [analysisError, setAnalysisError] = useState(null);
  const [commits, setCommits] = useState([]);
  const [qualityAnalysis, setQualityAnalysis] = useState(null);
  const [isCurrentlyFetching, setIsCurrentlyFetching] = useState(false);

  const abortControllerRef = useRef(null);
  const analyzedRepoRef = useRef(null);

  // AI-powered commit formatting function
  const formatCommitsWithAI = async (commits, repositoryFullName, signal) => {
    try {
      console.log(`🤖 Formatting ${commits.length} commits with AI...`);
      
      const response = await fetch('/api/ai/format-commits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        signal,
        body: JSON.stringify({
          commits,
          repositoryFullName
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to format commits: ${response.status}`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'AI formatting failed');
      }

      console.log(`✅ AI formatting complete: ${result.data.length} commits formatted`);
      console.log(`📊 Stats: ${result.meta.aiProcessed} AI-processed, ${result.meta.fallbackUsed} fallback`);
      
      return result.data;

    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('AI formatting request cancelled');
        throw error;
      }
      
      console.error('AI formatting failed:', error.message);
      
      // Return commits with client-side fallback formatting
      return commits.map(commit => ({
        ...commit,
        aiGenerated: {
          type: 'other',
          scope: null,
          description: commit.message?.split('\n')[0]?.substring(0, 80) || 'Unknown commit',
          formatted: `other: ${commit.message?.split('\n')[0] || 'Unknown commit'}`,
          summary: commit.message || 'No commit message',
          confidence: 0.2
        },
        original: {
          message: commit.message,
          sha: commit.sha,
          author: commit.author,
          date: commit.date || commit.author?.date
        }
      }));
    }
  };

  // Redirect if no repository is selected
  useEffect(() => {
    if (!reposLoading && !selectedRepo) {
      navigate('/repositories');
    }
  }, [selectedRepo, reposLoading, navigate]);

  // Reset analysis state when repository changes
  useEffect(() => {
    if (selectedRepo) {
      const repoKey = `${selectedRepo.id}-${selectedRepo.fullName}`;
      // Only clear state if switching to a different repository
      if (analyzedRepoRef.current && analyzedRepoRef.current !== repoKey) {
        setQualityAnalysis(null);
        setCommits([]);
        setAnalysisError(null);
        analyzedRepoRef.current = null;
        // Optionally clear cache for the previous repository if needed
        console.log('Cleared analysis state for new repository');
      }
    }
  }, [selectedRepo]);

  // Memoized function to prevent duplicate API calls
  const fetchRepoAnalysis = useCallback(async () => {
    if (!selectedRepo || isCurrentlyFetching) return;
    
    // Check cache first
    const cachedData = getCachedAnalysis(selectedRepo.id);
    if (cachedData) {
      console.log(`Using cached analysis for repository: ${selectedRepo.fullName}`);
      setCommits(cachedData.commits);
      setQualityAnalysis(cachedData.qualityAnalysis);
      analyzedRepoRef.current = `${selectedRepo.id}-${selectedRepo.fullName}`;
      return;
    }

    // Prevent duplicate analysis for the same repository
    const repoKey = `${selectedRepo.id}-${selectedRepo.fullName}`;
    if (analyzedRepoRef.current === repoKey) {
      console.log('Analysis already completed for this repository, skipping...');
      return;
    }

    // Cancel any ongoing requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Create new abort controller for this request
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    setIsCurrentlyFetching(true);
    setCurrentAnalysisLoading(true);
    setAnalysisError(null);
    
    console.log(`Starting fresh analysis for repository: ${selectedRepo.fullName}`);

    try {
      // Split fullName into owner and repo
      const [owner, repo] = selectedRepo.fullName.split('/');
      
      // First, fetch recent commits for the repository
      const commitsResponse = await fetch(
        `${import.meta.env.VITE_API_URL}/api/repos/${owner}/${repo}/commits?limit=20`,
        { credentials: 'include', signal }
      );

      if (commitsResponse.ok) {
        const commitsData = await commitsResponse.json();
        if (commitsData.success) {
          
          // Format commits with AI and run quality analysis in parallel
          const [formattedCommits, qualityResponse] = await Promise.all([
            formatCommitsWithAI(commitsData.data.commits, selectedRepo.fullName, signal),
            fetch(
              `${import.meta.env.VITE_API_URL}/api/ai/analyze-quality`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                signal,
                body: JSON.stringify({
                  commits: commitsData.data.commits,
                  repositoryId: selectedRepo.id,
                  repositoryFullName: selectedRepo.fullName
                }),
              }
            )
          ]);

          setCommits(formattedCommits);
          console.log(`✅ Fetched and formatted ${formattedCommits.length} commits`);

          // Handle quality analysis response
          let qualityData = null;
          if (qualityResponse.ok) {
            const qualityResult = await qualityResponse.json();
            if (qualityResult.success) {
              qualityData = qualityResult.data;
              setQualityAnalysis(qualityData);
              console.log('Quality Analysis:', qualityData);
            }
          }
          
          // Cache the analysis results
          setCachedAnalysis(selectedRepo.id, formattedCommits, qualityData);
          
          // Mark this repository as analyzed to prevent future duplicates
          analyzedRepoRef.current = repoKey;
          console.log(`Analysis completed and cached for repository: ${selectedRepo.fullName}`);
        }
      } else {
        throw new Error(`Failed to fetch commits: ${commitsResponse.status}`);
      }

    } catch (error) {
      // Don't show error for cancelled requests
      if (error.name === 'AbortError') {
        console.log('Repository analysis request was cancelled');
      } else {
        console.error('Repository analysis error:', error);
        setAnalysisError(error.message);
      }
    } finally {
      setCurrentAnalysisLoading(false);
      setIsCurrentlyFetching(false);
      abortControllerRef.current = null;
    }
  }, [selectedRepo, isCurrentlyFetching, getCachedAnalysis, setCachedAnalysis, setCurrentAnalysisLoading]);

  // Fetch commits and AI analysis when repo is selected
  useEffect(() => {
    if (selectedRepo && selectedRepo.fullName && !isCurrentlyFetching) {
      fetchRepoAnalysis();
    }
  }, [selectedRepo, fetchRepoAnalysis, isCurrentlyFetching]);

  // Cleanup: Cancel any ongoing requests when component unmounts
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        console.log('Cancelled ongoing requests due to component unmount');
      }
    };
  }, []);

  // Show loading state while repositories are being fetched
  if (reposLoading) {
    return (
      <div className='min-h-screen bg-[#1a1928] flex items-center justify-center'>
        <div className='text-gray-400 text-lg'>Loading repositories...</div>
      </div>
    );
  }

  // Show message if no repository is selected
  if (!selectedRepo) {
    return (
      <div className='min-h-screen bg-[#1a1928] flex items-center justify-center'>
        <div className='text-center'>
          <div className='text-gray-400 text-lg mb-4'>No repository selected</div>
          <button 
            onClick={() => navigate('/repositories')}
            className='px-4 py-2 bg-[#5b56dd] text-white rounded-lg hover:bg-[#4c47cc] transition-colors'
          >
            Select Repository
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-[#1a1928]'>
      <UserHeader />

      <div className='max-w-7xl mx-auto px-6 py-8'>
        {/* Repository Header */}
        <div className='mb-8'>
          <div className='flex items-center justify-between'>
            <div>
              <h1 className='text-3xl font-bold text-white mb-2'>{selectedRepo.name}</h1>
              <p className='text-gray-400'>{selectedRepo.description || 'No description available'}</p>
              <div className='flex items-center space-x-4 mt-2'>
                <span className='text-sm text-gray-500'>{selectedRepo.fullName}</span>
                {selectedRepo.language && (
                  <span className='text-sm text-gray-500'>• {selectedRepo.language}</span>
                )}
                {selectedRepo.private && (
                  <span className='text-xs px-2 py-1 bg-gray-600 text-gray-300 rounded-full'>Private</span>
                )}
              </div>
            </div>
            <div className='flex items-center space-x-3'>
              <button 
                onClick={() => {
                  clearAnalysisCache(selectedRepo?.id);
                  analyzedRepoRef.current = null;
                  setCommits([]);
                  setQualityAnalysis(null);
                  setAnalysisError(null);
                  fetchRepoAnalysis();
                }}
                disabled={currentAnalysisLoading}
                className='px-4 py-2 bg-[#5b56dd] text-white rounded-lg hover:bg-[#4c47cc] transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
              >
                {currentAnalysisLoading ? '🔄 Refreshing...' : '🔄 Refresh Analysis'}
              </button>
              <button 
                onClick={() => navigate('/repositories')}
                className='px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors'
              >
                ← Back to Repositories
              </button>
            </div>
          </div>
        </div>

                 {/* AI Analysis Section */}
         <div className='grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8'>
          {/* Commit Analysis */}
          <div className='border border-slate-600 rounded-2xl p-6 bg-[#272633]'>
            <h2 className='text-xl font-bold text-white mb-4'>AI Commit Analysis</h2>
            
            {currentAnalysisLoading && (
              <div className='text-center py-8'>
                <div className='text-gray-400'>Analyzing repository commits...</div>
              </div>
            )}

            {analysisError && (
              <div className='text-center py-8'>
                <div className='text-red-400 mb-4'>Error: {analysisError}</div>
                <div className='space-x-2'>
                  <button 
                    onClick={fetchRepoAnalysis}
                    className='px-4 py-2 bg-[#5b56dd] text-white rounded-lg hover:bg-[#4c47cc] transition-colors'
                  >
                    Retry Analysis
                  </button>
                  <button 
                    onClick={() => {
                      clearAnalysisCache(selectedRepo?.id);
                      analyzedRepoRef.current = null;
                      fetchRepoAnalysis();
                    }}
                    className='px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors'
                  >
                    Clear Cache & Retry
                  </button>
                </div>
              </div>
            )}

            {commits.length > 0 && (
              <div className='space-y-4'>
                <div className='grid grid-cols-2 gap-4'>
                  <div className='bg-[#2a2a3e] rounded-lg p-4'>
                    <div className='text-2xl font-bold text-white'>{commits.length}</div>
                    <div className='text-sm text-gray-400'>Total Commits Analyzed</div>
                  </div>
                  <div className='bg-[#2a2a3e] rounded-lg p-4'>
                    <div className='text-2xl font-bold text-[#5b56dd]'>
                      {Object.keys(commits.reduce((acc, commit) => {
                        const parsedCommit = formatCommitDisplay(commit);
                        acc[parsedCommit.type] = true;
                        return acc;
                      }, {})).length}
                    </div>
                    <div className='text-sm text-gray-400'>Commit Types Found</div>
                  </div>
                </div>

                {/* AI Processing Stats */}
                <div className='grid grid-cols-2 gap-4'>
                  <div className='bg-[#2a2a3e] rounded-lg p-4'>
                    <div className='text-2xl font-bold text-green-500'>
                      {commits.filter(commit => commit.aiGenerated && commit.aiGenerated.confidence > 0.5).length}
                    </div>
                    <div className='text-sm text-gray-400'>High Confidence AI</div>
                  </div>
                  <div className='bg-[#2a2a3e] rounded-lg p-4'>
                    <div className='text-2xl font-bold text-blue-500'>
                      {commits.filter(commit => commit.aiGenerated).length}
                    </div>
                    <div className='text-sm text-gray-400'>AI Processed</div>
                  </div>
                </div>

                {/* Commit Type breakdown */}
                <div className='mt-6'>
                  <h3 className='text-lg font-semibold text-white mb-3'>Commit Type Distribution</h3>
                  <div className='space-y-2'>
                    {Object.entries(
                      commits.reduce((acc, commit) => {
                        const parsedCommit = formatCommitDisplay(commit);
                        acc[parsedCommit.type] = (acc[parsedCommit.type] || 0) + 1;
                        return acc;
                      }, {})
                    ).map(([type, count]) => (
                      <div key={type} className='flex justify-between items-center p-2 bg-[#2a2a3e] rounded'>
                        <div className='flex items-center space-x-2'>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${getCommitTypeColor(type)}`}>
                            {type}
                          </span>
                          <span className='text-white capitalize'>{type}</span>
                        </div>
                        <span className='text-gray-400'>{count} commits</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Repository Overview */}
          <div className='border border-slate-600 rounded-2xl p-6 bg-[#272633]'>
            <h2 className='text-xl font-bold text-white mb-4'>Repository Overview</h2>
            
            {/* Summary stats */}
            <div className='grid grid-cols-2 gap-4 mb-4'>
              <div className='bg-[#2a2a3e] rounded-lg p-4'>
                <div className='text-2xl font-bold text-white'>{commits.length}</div>
                <div className='text-sm text-gray-400'>Recent Commits</div>
              </div>
              <div className='bg-[#2a2a3e] rounded-lg p-4'>
                <div className='text-2xl font-bold text-green-500'>{selectedRepo.language || 'Unknown'}</div>
                <div className='text-sm text-gray-400'>Primary Language</div>
              </div>
            </div>
            
            {/* Recent Commits List */}
            {commits.length > 0 && (
              <div className='space-y-2'>
                <h3 className='text-lg font-semibold text-white mb-3'>Latest Commits</h3>
                <div className='max-h-96 overflow-y-auto space-y-2'>
                  {commits.slice(0, 20).map((commit, index) => {
                    const parsedCommit = formatCommitDisplay(commit);
                    return (
                      <div key={`${commit.sha}-${index}`} className='bg-[#2a2a3e] rounded-lg p-3 border-l-4 border-[#5b56dd]'>
                        <div className='flex items-start space-x-3'>
                          {/* Commit type badge */}
                          <span className={`px-2 py-1 rounded text-xs font-medium ${getCommitTypeColor(parsedCommit.type)} flex-shrink-0`}>
                            {parsedCommit.type}
                          </span>
                          
                          {/* Commit details */}
                          <div className='flex-1 min-w-0'>
                            <div className='text-white font-medium text-sm break-words'>
                              {parsedCommit.formatted}
                            </div>
                            
                            {/* AI-generated summary */}
                            {commit.aiGenerated?.summary && commit.aiGenerated.summary !== parsedCommit.formatted && (
                              <div className='text-blue-300 text-xs mt-1 break-words italic'>
                                🤖 {commit.aiGenerated.summary}
                              </div>
                            )}
                            
                            <div className='text-gray-400 text-xs mt-1 flex items-center space-x-4'>
                              <span>#{commit.sha?.substring(0, 7) || 'unknown'}</span>
                              <span>{commit.author?.name || commit.author || 'Unknown'}</span>
                              <span>{commit.date ? new Date(commit.date).toLocaleTimeString('en-US', { 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              }) : 'Unknown time'}</span>
                              
                              {/* AI confidence indicator */}
                              {commit.aiGenerated?.confidence && commit.aiGenerated.confidence > 0.5 && (
                                <span className='text-green-400 text-xs'>
                                  AI: {Math.round(commit.aiGenerated.confidence * 100)}%
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            
            {commits.length === 0 && !currentAnalysisLoading && (
              <div className='text-center py-4'>
                <div className='text-gray-400'>No commits found</div>
              </div>
            )}
          </div>

           {/* Code Quality Analysis */}
           <div className='border border-slate-600 rounded-2xl p-6 bg-[#272633]'>
             <h2 className='text-xl font-bold text-white mb-4'>Code Quality</h2>
             
             {isCurrentlyFetching && (
               <div className='text-center py-8'>
                 <div className='text-gray-400'>Analyzing code quality...</div>
               </div>
             )}

             {qualityAnalysis && (
               <div className='space-y-4'>
                 {/* Quality Score */}
                 <div className='bg-[#2a2a3e] rounded-lg p-4'>
                   <div className='text-2xl font-bold text-green-500'>
                     {qualityAnalysis.qualityScore 
                       ? Math.round(qualityAnalysis.qualityScore * 100) + '%'
                       : qualityAnalysis.overallScore 
                         ? Math.round(qualityAnalysis.overallScore * 100) + '%'
                         : 'N/A'
                     }
                   </div>
                   <div className='text-sm text-gray-400'>Quality Score</div>
                 </div>

                 {/* Issues Summary */}
                 {qualityAnalysis.issues && qualityAnalysis.issues.length > 0 && (
                   <div className='space-y-2'>
                     <h3 className='text-lg font-semibold text-white mb-2'>Issues Found</h3>
                     <div className='max-h-48 overflow-y-auto space-y-2'>
                       {qualityAnalysis.issues.slice(0, 5).map((issue, index) => (
                         <div key={index} className='p-3 bg-[#2a2a3e] rounded border-l-4 border-gray-500'>
                           <div className='flex justify-between items-start mb-1'>
                             <span className={`text-sm font-medium ${getSeverityColor(issue.severity)}`}>
                               {issue.type?.replace(/_/g, ' ').toUpperCase()} - {issue.severity?.toUpperCase()}
                             </span>
                             <span className='text-xs text-gray-500'>{issue.commitCount} commits</span>
                           </div>
                           <p className='text-sm text-gray-300 break-words'>{issue.description}</p>
                           <p className='text-xs text-gray-500 mt-1 break-words'>{issue.suggestion}</p>
                         </div>
                       ))}
                     </div>
                   </div>
                 )}

                 {/* Metrics */}
                 {qualityAnalysis.metrics && (
                   <div className='space-y-2'>
                     <h3 className='text-lg font-semibold text-white mb-2'>Metrics</h3>
                     <div className='space-y-2'>
                       {Object.entries(qualityAnalysis.metrics).map(([metric, value]) => (
                         <div key={metric} className='flex justify-between items-start p-3 bg-[#2a2a3e] rounded'>
                           <span className='text-white font-medium flex-shrink-0 mr-4'>
                             {formatMetricName(metric)}
                           </span>
                           <span className='text-gray-400 text-sm text-right break-words min-w-0 flex-1'>
                             {formatMetricValue(metric, value)}
                           </span>
                         </div>
                       ))}
                     </div>
                   </div>
                 )}

                 {/* Insights */}
                 {qualityAnalysis.insights && qualityAnalysis.insights.length > 0 && (
                   <div className='space-y-2'>
                     <h3 className='text-lg font-semibold text-white mb-2'>Insights</h3>
                     <div className='max-h-96 overflow-y-auto space-y-2'>
                       {qualityAnalysis.insights.slice(0, 8).map((insight, index) => (
                         <div key={index} className='p-2 bg-[#2a2a3e] rounded text-sm text-blue-300 break-words leading-relaxed'>
                           • {typeof insight === 'string' ? insight : JSON.stringify(insight)}
                         </div>
                       ))}
                     </div>
                     {qualityAnalysis.insights.length > 8 && (
                       <div className='text-xs text-gray-500 mt-2'>
                         Showing 8 of {qualityAnalysis.insights.length} insights
                       </div>
                     )}
                   </div>
                 )}

                 {/* Recommendations */}
                 {qualityAnalysis.recommendations && qualityAnalysis.recommendations.length > 0 && (
                   <div className='space-y-2'>
                     <h3 className='text-lg font-semibold text-white mb-2'>Recommendations</h3>
                     <div className='max-h-screen overflow-y-auto space-y-2'>
                       {qualityAnalysis.recommendations.slice(0, 10).map((rec, index) => (
                         <div key={index} className='p-2 bg-[#2a2a3e] rounded text-sm text-green-300 break-words leading-relaxed'>
                           • {typeof rec === 'string' ? rec : JSON.stringify(rec)}
                         </div>
                       ))}
                     </div>
                     {qualityAnalysis.recommendations.length > 10 && (
                       <div className='text-xs text-gray-500 mt-2'>
                         Showing 10 of {qualityAnalysis.recommendations.length} recommendations
                       </div>
                     )}
                   </div>
                 )}

                 {/* Summary Stats */}
                 {qualityAnalysis.metadata && (
                   <div className='grid grid-cols-2 gap-4 mt-4'>
                     <div className='bg-[#2a2a3e] rounded-lg p-3'>
                       <div className='text-lg font-bold text-white'>{qualityAnalysis.metadata.commitsAnalyzed || 'N/A'}</div>
                       <div className='text-xs text-gray-400'>Commits Analyzed</div>
                     </div>
                     <div className='bg-[#2a2a3e] rounded-lg p-3'>
                       <div className='text-lg font-bold text-white'>{qualityAnalysis.metadata.timeframe || 'N/A'}</div>
                       <div className='text-xs text-gray-400'>Analysis Period</div>
                     </div>
                   </div>
                 )}
               </div>
             )}

             {!isCurrentlyFetching && !qualityAnalysis && (
               <div className='text-center py-8'>
                 <div className='text-gray-400'>No quality analysis available</div>
               </div>
             )}
           </div>
         </div>

         {/* Original components */}
        <div className='flex flex-col items-center border border-slate-400 rounded-2xl p-4 gap-6 max-w-6xl mx-auto'>
          <RepoMetricDisplay selectedRepo={selectedRepo} />
          <RecentCommits selectedRepo={selectedRepo} commits={commits} />
        </div>
      </div>
    </div>
  );
};

export default RepoAnalytics;
