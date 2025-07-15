import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import UserHeader from './UserHeader';

// Component to display detailed quality analysis for a specific commit
const CommitAnalysis = ({ user }) => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get URL parameters
  const repositoryId = searchParams.get('repo');
  const commitSha = searchParams.get('commit');
  
  // State for analysis data
  const [analysisData, setAnalysisData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Initialize with data from navigation state only - no fetching
  useEffect(() => {
    if (!repositoryId || !commitSha) {
      setError('Missing repository or commit information');
      setLoading(false);
      return;
    }

    // Only use data from navigation state (passed from RepoAnalytics)
    if (location.state && location.state.qualityAnalysis) {
      console.log('📊 Using quality analysis data from navigation state');
      setAnalysisData(location.state.qualityAnalysis);
      setLoading(false);
    } else {
      // No data provided - redirect back to repository page
      console.log('📊 No quality analysis data provided, redirecting to repository page');
      navigate('/repository', { replace: true });
    }
  }, [repositoryId, commitSha, location.state, navigate]);

  // Handle back navigation
  const handleBack = () => {
    navigate('/repository');
  };

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen bg-[#1a1928]">
        <UserHeader user={user} />
        <div className="max-w-4xl mx-auto p-6">
          <button
            onClick={handleBack}
            className="mb-4 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded text-sm transition-colors"
          >
            ← Back to Repository
          </button>
          <div className="text-center text-red-400">
            <h2 className="text-xl mb-2">Error Loading Analysis</h2>
            <p>{error}</p>
          </div>
        </div>
      </div>
    );
  }

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-[#1a1928]">
        <UserHeader user={user} />
        <div className="max-w-4xl mx-auto p-6">
          <button
            onClick={handleBack}
            className="mb-4 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded text-sm transition-colors"
          >
            ← Back to Repository
          </button>
          <div className="text-center text-gray-300">
            <h2 className="text-xl mb-2">Loading Analysis...</h2>
            <div className="animate-spin h-8 w-8 border-b-2 border-white mx-auto"></div>
          </div>
        </div>
      </div>
    );
  }

  // Main analysis display
  return (
    <div className="min-h-screen bg-[#1a1928]">
      <UserHeader user={user} />
      
      <div className="max-w-4xl mx-auto p-6">
        {/* Navigation */}
        <button
          onClick={handleBack}
          className="mb-6 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded text-sm transition-colors"
        >
          ← Back to Repository
        </button>

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-white text-2xl font-bold mb-2">
            Code Quality Analysis
          </h1>
          <p className="text-gray-400">
            Repository: <span className="text-white">{repositoryId}</span>
          </p>
          <p className="text-gray-400">
            Commit: <span className="text-white font-mono">{commitSha?.substring(0, 8)}</span>
          </p>
        </div>

        {/* Analysis Results */}
        {analysisData && (
          <div className="space-y-6">
            {/* Quality Score */}
            <div className="bg-[#272633] border border-slate-400 rounded-lg p-6">
              <h2 className="text-white text-xl font-bold mb-4">Quality Score</h2>
              <div className="flex items-center gap-4">
                <div className="text-4xl font-bold text-blue-400">
                  {Math.round(analysisData.qualityScore * 100)}/100
                </div>
                <div className="flex-1">
                  <div className="w-full bg-gray-700 rounded-full h-3">
                    <div 
                      className="bg-blue-400 h-3 rounded-full transition-all duration-300"
                      style={{ width: `${analysisData.qualityScore * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Issues Found */}
            {analysisData.issues && analysisData.issues.length > 0 && (
              <div className="bg-[#272633] border border-slate-400 rounded-lg p-6">
                <h2 className="text-white text-xl font-bold mb-4">Issues Found</h2>
                <div className="space-y-3">
                  {analysisData.issues.map((issue, index) => (
                    <div key={index} className="border-l-4 border-red-500 pl-4">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-red-400 font-medium capitalize">
                          {issue.severity} - {issue.type.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-gray-300 mb-2">{issue.description}</p>
                      {issue.suggestion && (
                        <p className="text-blue-400 text-sm">💡 {issue.suggestion}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recommendations */}
            {analysisData.recommendations && analysisData.recommendations.length > 0 && (
              <div className="bg-[#272633] border border-slate-400 rounded-lg p-6">
                <h2 className="text-white text-xl font-bold mb-4">Recommendations</h2>
                <ul className="space-y-2">
                  {analysisData.recommendations.map((rec, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-green-400">✓</span>
                      <span className="text-gray-300">{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Insights */}
            {analysisData.insights && analysisData.insights.length > 0 && (
              <div className="bg-[#272633] border border-slate-400 rounded-lg p-6">
                <h2 className="text-white text-xl font-bold mb-4">Insights</h2>
                <ul className="space-y-2">
                  {analysisData.insights.map((insight, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-blue-400">💡</span>
                      <span className="text-gray-300">{insight}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Code Analysis Summary */}
            {analysisData.codeAnalysis && (
              <div className="bg-[#272633] border border-slate-400 rounded-lg p-6">
                <h2 className="text-white text-xl font-bold mb-4">Code Analysis</h2>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-gray-400">Commits Analyzed</p>
                    <p className="text-white text-lg">{analysisData.codeAnalysis.commitsAnalyzed}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Lines Analyzed</p>
                    <p className="text-white text-lg">{analysisData.codeAnalysis.totalLinesAnalyzed}</p>
                  </div>
                </div>
                {analysisData.codeAnalysis.summary && (
                  <div>
                    <p className="text-gray-400 mb-2">Overall Health</p>
                    <p className="text-green-400 capitalize">
                      {analysisData.codeAnalysis.summary.overallCodeHealth}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CommitAnalysis; 