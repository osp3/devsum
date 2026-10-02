import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import AppShell from './AppShell.jsx';
import PriorityTag from './PriorityTag.jsx';

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
      if (
        qualityAnalysis.codeAnalysis &&
        qualityAnalysis.codeAnalysis.insights
      ) {
        const commitAnalysis = qualityAnalysis.codeAnalysis.insights.find(
          (insight) => insight.commitSha === commitSha
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
      console.log(
        '📊 No quality analysis data provided, redirecting to repository page'
      );
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
          repositoryId: repositoryId,
        },
      });
    } else {
      navigate('/repository');
    }
  };

  // Show error state
  if (error) {
    return (
      <AppShell user={user}>
        <div className='max-w-4xl mx-auto p-4 sm:p-6'>
          <button onClick={handleBack} className='btn-ghost mb-4 text-sm cursor-pointer'>
            Back to Repository
          </button>
          <div className='text-center text-node-red'>
            <h2 className='text-xl mb-2'>Error Loading Analysis</h2>
            <p>{error}</p>
          </div>
        </div>
      </AppShell>
    );
  }

  // Show loading state
  if (loading) {
    return (
      <AppShell user={user}>
        <div className='max-w-4xl mx-auto p-4 sm:p-6'>
          <button onClick={handleBack} className='btn-ghost mb-4 text-sm cursor-pointer'>
            Back to Repository
          </button>
          <div className='text-center text-fg/60'>
            <p>Analyzing commits...</p>
          </div>
        </div>
      </AppShell>
    );
  }

  // Main analysis display
  return (
    <AppShell user={user}>
      <div className='max-w-4xl mx-auto p-4 sm:p-6'>
        {/* Navigation */}
        <button onClick={handleBack} className='btn-ghost mb-6 text-sm cursor-pointer'>
          Back to Repository
        </button>

        {/* Header */}
        <div className='mb-6'>
          <p className='eyebrow'>Commit analysis</p>
          <h1 className='mt-2 mb-3 text-3xl font-semibold tracking-[-0.03em] break-all'>
            {repositoryId}
          </h1>
          <p className='text-fg/60 text-sm'>
            Commit:{' '}
            <span className='text-fg font-geist-mono'>
              {commitSha?.substring(0, 8)}
            </span>
          </p>
        </div>

        {/* Analysis Results */}
        {analysisData && (
          <div className='space-y-6'>
            {/* Commit Details */}
            <div className='panel p-6'>
              <h2 className='text-lg font-semibold tracking-tight mb-4'>
                Commit Details
              </h2>
              <div className='space-y-3'>
                <div>
                  <p className='font-geist-mono text-xs uppercase tracking-[0.14em] text-fg/60'>Message</p>
                  <p className='mt-1'>{analysisData.commitMessage}</p>
                </div>
                <div className='flex gap-6'>
                  <div>
                    <p className='font-geist-mono text-xs uppercase tracking-[0.14em] text-fg/60'>Lines changed</p>
                    <p className='mt-1 font-geist-mono'>
                      {analysisData.linesChanged}
                    </p>
                  </div>
                  <div>
                    <p className='mb-1.5 font-geist-mono text-xs uppercase tracking-[0.14em] text-fg/60'>Severity</p>
                    <PriorityTag level={analysisData.analysis?.severity || 'low'} />
                  </div>
                </div>
              </div>
            </div>

            {/* Issues Found */}
            {analysisData.analysis?.issues &&
              analysisData.analysis.issues.length > 0 && (
                <div className='panel p-6'>
                  <h2 className='text-lg font-semibold tracking-tight mb-4'>
                    Issues Found ({analysisData.analysis.issues.length})
                  </h2>
                  <div className='space-y-3'>
                    {analysisData.analysis.issues.map((issue, index) => (
                      <div
                        key={index}
                        className='rounded-lg border border-line bg-inset p-4'
                      >
                        <div className='flex items-center gap-2 mb-2'>
                          <PriorityTag level={issue.severity} />
                          <span className='font-medium capitalize'>
                            {issue.type.replace('_', ' ')}
                          </span>
                          {issue.line && issue.line !== 'unknown' && (
                            <span className='font-geist-mono text-fg/50 text-xs'>
                              Line {issue.line}
                            </span>
                          )}
                        </div>
                        <p className='text-fg/70 text-sm leading-6 mb-2'>
                          {issue.description}
                        </p>
                        {issue.suggestion && (
                          <p className='text-steam text-sm'>
                            {issue.suggestion}
                          </p>
                        )}
                        {issue.example && (
                          <p className='mt-1 font-geist-mono text-fg/60 text-xs'>
                            Example: {issue.example}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

            {/* Positive Aspects */}
            {analysisData.analysis?.positives &&
              analysisData.analysis.positives.length > 0 && (
                <div className='panel p-6'>
                  <h2 className='text-lg font-semibold tracking-tight mb-4'>
                    Positive Aspects
                  </h2>
                  <ul className='space-y-2'>
                    {analysisData.analysis.positives.map((positive, index) => (
                      <li key={index} className='flex items-start gap-2'>
                        <span className='text-steam'>✓</span>
                        <span className='text-fg/70 text-sm leading-6'>{positive}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

            {/* Overall Assessment */}
            {analysisData.analysis?.overallAssessment && (
              <div className='panel p-6'>
                <h2 className='text-lg font-semibold tracking-tight mb-4'>
                  Overall Assessment
                </h2>
                <p className='text-fg/70 text-sm leading-7'>
                  {analysisData.analysis.overallAssessment}
                </p>
              </div>
            )}

            {/* Recommended Actions */}
            {analysisData.analysis?.recommendedActions &&
              analysisData.analysis.recommendedActions.length > 0 && (
                <div className='panel p-6'>
                  <h2 className='text-lg font-semibold tracking-tight mb-4'>
                    Recommended Actions
                  </h2>
                  <ul className='space-y-2'>
                    {analysisData.analysis.recommendedActions.map(
                      (action, index) => (
                        <li key={index} className='flex items-start gap-2'>
                          <span className='text-steam'>→</span>
                          <span className='text-fg/70 text-sm leading-6'>{action}</span>
                        </li>
                      )
                    )}
                  </ul>
                </div>
              )}
          </div>
        )}
      </div>
    </AppShell>
  );
};

export default CommitAnalysis;
