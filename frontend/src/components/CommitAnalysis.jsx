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
      
      // Find the specific commit analysis from codeAnalysis.insights
      const qualityAnalysis = location.state.qualityAnalysis;
      if (qualityAnalysis.codeAnalysis && qualityAnalysis.codeAnalysis.insights) {
        const commitAnalysis = qualityAnalysis.codeAnalysis.insights.find(
          insight => insight.commitSha === commitSha
        );
        
        if (commitAnalysis) {
          console.log('📊 Found commit-specific analysis:', commitAnalysis);
          setAnalysisData(commitAnalysis);
        } else {
          console.error('📊 No analysis found for commit:', commitSha);
          setError(`No analysis found for commit ${commitSha.substring(0, 8)}`);
        }
      } else {
        console.error('📊 No code analysis insights available');
        setError('No code analysis insights available');
      }
      setLoading(false);
    } else {
      // No data provided - redirect back to repository page
      console.log('📊 No quality analysis data provided, redirecting to repository page');
      navigate('/repository', { replace: true });
    }
  }, [repositoryId, commitSha, location.state, navigate]);

  // Handle back navigation
  const handleBack = () => {
    // Pass back the quality analysis data to preserve cache and avoid re-fetching
    if (location.state && location.state.qualityAnalysis) {
      navigate('/repository', { 
        state: { 
          preserveQualityAnalysis: location.state.qualityAnalysis,
          repositoryId: repositoryId 
        } 
      });
    } else {
      navigate('/repository');
    }
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
            Back to Repository
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
            Back to Repository
          </button>
          <div className="text-center text-gray-400">
            <p>Analyzing commits...</p>
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
          Back to Repository
        </button>

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-white text-2xl font-bold mb-2">
            Commit Analysis
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
            {/* Commit Details */}
            <div className="bg-[#272633] border border-slate-400 rounded-lg p-6">
              <h2 className="text-white text-xl font-bold mb-4">Commit Details</h2>
              <div className="space-y-3">
                <div>
                  <p className="text-gray-400 text-sm">Message</p>
                  <p className="text-white">{analysisData.commitMessage}</p>
                </div>
                <div className="flex gap-6">
                  <div>
                    <p className="text-gray-400 text-sm">Lines Changed</p>
                    <p className="text-white font-mono">{analysisData.linesChanged}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Severity</p>
                    <span className={`px-2 py-1 rounded text-sm font-medium ${
                      analysisData.analysis?.severity === 'high' ? 'bg-red-600 text-white' :
                      analysisData.analysis?.severity === 'medium' ? 'bg-yellow-600 text-white' :
                      'bg-green-600 text-white'
                    }`}>
                      {analysisData.analysis?.severity || 'low'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Issues Found */}
            {analysisData.analysis?.issues && analysisData.analysis.issues.length > 0 && (
              <div className="bg-[#272633] border border-slate-400 rounded-lg p-6">
                <h2 className="text-white text-xl font-bold mb-4">Issues Found ({analysisData.analysis.issues.length})</h2>
                <div className="space-y-3">
                  {analysisData.analysis.issues.map((issue, index) => (
                    <div key={index} className="border-l-4 border-red-500 pl-4">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-red-400 font-medium capitalize">
                          {issue.severity} - {issue.type.replace('_', ' ')}
                        </span>
                        {issue.line && issue.line !== 'unknown' && (
                          <span className="text-gray-400 text-sm">
                            Line {issue.line}
                          </span>
                        )}
                      </div>
                      <p className="text-gray-300 mb-2">{issue.description}</p>
                      {issue.suggestion && (
                        <p className="text-blue-400 text-sm"> {issue.suggestion}</p>
                      )}
                      {issue.example && (
                        <p className="text-green-400 text-sm">Example: {issue.example}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Positive Aspects */}
            {analysisData.analysis?.positives && analysisData.analysis.positives.length > 0 && (
              <div className="bg-[#272633] border border-slate-400 rounded-lg p-6">
                <h2 className="text-white text-xl font-bold mb-4">Positive Aspects</h2>
                <ul className="space-y-2">
                  {analysisData.analysis.positives.map((positive, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-green-400 mt-1">✓</span>
                      <span className="text-gray-300">{positive}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Overall Assessment */}
            {analysisData.analysis?.overallAssessment && (
              <div className="bg-[#272633] border border-slate-400 rounded-lg p-6">
                <h2 className="text-white text-xl font-bold mb-4">Overall Assessment</h2>
                <p className="text-gray-300 leading-relaxed">{analysisData.analysis.overallAssessment}</p>
              </div>
            )}

            {/* Recommended Actions */}
            {analysisData.analysis?.recommendedActions && analysisData.analysis.recommendedActions.length > 0 && (
              <div className="bg-[#272633] border border-slate-400 rounded-lg p-6">
                <h2 className="text-white text-xl font-bold mb-4">Recommended Actions</h2>
                <ul className="space-y-2">
                  {analysisData.analysis.recommendedActions.map((action, index) => (
                    <li key={index} className="flex items-start gap-2">
                     
                      <span className="text-gray-300">{action}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CommitAnalysis; 