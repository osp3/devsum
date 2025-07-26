/**
 * Quality Metrics Calculator - Functional Pattern
 * Handles calculation of quality scores, patterns, and metrics
 * Pure functions for reliable metric computation
 */

/**
 * Calculate code quality score from code analysis results
 * @param {Object} codeAnalysis - Code analysis results
 * @returns {number} Quality score between 0 and 1
 */
export const calculateCodeQualityScore = (codeAnalysis) => {
  if (!codeAnalysis.insights || codeAnalysis.insights.length === 0) {
    return 0.6; // Neutral score if no code analysis
  }
  
  let score = 0.8; // Start optimistic
  
  // Penalize based on issues found
  codeAnalysis.insights.forEach(insight => {
    const issues = insight.analysis?.issues || [];
    issues.forEach(issue => {
      switch (issue.severity) {
        case 'critical': score -= 0.3; break;
        case 'high': score -= 0.2; break;
        case 'medium': score -= 0.1; break;
        case 'low': score -= 0.05; break;
      }
    });
    
    // Bonus for positive practices found
    const positives = insight.analysis?.positives || [];
    score += positives.length * 0.05;
  });
  
  return Math.max(0.1, Math.min(1.0, score));
};

/**
 * Analyze commit message quality using heuristics
 * @param {Array} commits - Array of commit objects
 * @returns {Object} Message quality metrics
 */
export const analyzeMessageQuality = (commits) => {
  let descriptiveCount = 0;
  let conventionalCount = 0;
  let vagueCount = 0;

  commits.forEach(commit => {
    const message = commit.message || '';
    
    // Check for conventional format
    if (/^(feat|fix|docs|style|refactor|test|chore)(\(.+\))?:/.test(message)) {
      conventionalCount++;
    }
    
    // Check for descriptive messages
    if (message.length > 20 && !/(^(fix|update|change|wip)$)/i.test(message.trim())) {
      descriptiveCount++;
    }
    
    // Check for vague messages
    if (message.length < 15 || /(^(fix|update|change|wip)$)/i.test(message.trim())) {
      vagueCount++;
    }
  });

  return {
    descriptivePercentage: Math.round((descriptiveCount / commits.length) * 100),
    conventionalPercentage: Math.round((conventionalCount / commits.length) * 100),
    vaguePercentage: Math.round((vagueCount / commits.length) * 100),
    averageLength: Math.round(commits.reduce((sum, c) => sum + (c.message?.length || 0), 0) / commits.length)
  };
};

/**
 * Detect commit patterns and behaviors
 * @param {Array} commits - Array of commit objects
 * @returns {Object} Detected patterns
 */
export const detectCommitPatterns = (commits) => {
  const messages = commits.map(c => c.message?.toLowerCase() || '');
  
  const patterns = {
    quickFixes: messages.filter(m => 
      m.includes('quick') || m.includes('hotfix') || m.includes('urgent')
    ).length,
    
    technicalDebt: messages.filter(m => 
      m.includes('todo') || m.includes('fixme') || m.includes('hack') || m.includes('temporary')
    ).length,
    
    securityFocus: messages.filter(m => 
      m.includes('security') || m.includes('auth') || m.includes('encrypt') || m.includes('validate')
    ).length,
    
    testingActivity: messages.filter(m => 
      m.includes('test') || m.includes('spec') || m.includes('coverage')
    ).length,
    
    documentation: messages.filter(m => 
      m.includes('doc') || m.includes('readme') || m.includes('comment')
    ).length,
    
    refactoring: messages.filter(m => 
      m.includes('refactor') || m.includes('cleanup') || m.includes('reorganize')
    ).length,
    
    performance: messages.filter(m => 
      m.includes('performance') || m.includes('optimize') || m.includes('speed')
    ).length
  };

  return {
    ...patterns,
    healthScore: calculatePatternHealthScore(patterns, commits.length)
  };
};

/**
 * Calculate pattern health score based on detected patterns
 * @param {Object} patterns - Detected commit patterns
 * @param {number} totalCommits - Total number of commits
 * @returns {number} Health score between 0 and 1
 */
export const calculatePatternHealthScore = (patterns, totalCommits) => {
  let score = 0.7; // Start neutral
  
  // Positive indicators
  if (patterns.testingActivity > 0) score += 0.1;
  if (patterns.documentation > 0) score += 0.1;
  if (patterns.securityFocus > 0) score += 0.1;
  if (patterns.refactoring > 0) score += 0.05;
  if (patterns.performance > 0) score += 0.05;
  
  // Negative indicators
  if (patterns.quickFixes / totalCommits > 0.3) score -= 0.2;
  if (patterns.technicalDebt / totalCommits > 0.2) score -= 0.1;
  
  return Math.max(0, Math.min(1, score));
};

/**
 * Calculate commit distribution by category
 * @param {Array} commits - Array of commit objects
 * @returns {Object} Commit distribution
 */
export const calculateCommitDistribution = (commits) => {
  return commits.reduce((acc, commit) => {
    acc[commit.category || 'other'] = (acc[commit.category || 'other'] || 0) + 1;
    return acc;
  }, {});
};

/**
 * Extract code issues for combined analysis
 * @param {Object} codeAnalysis - Code analysis results
 * @returns {Array} Array of formatted issues
 */
export const extractCodeIssues = (codeAnalysis) => {
  const issues = [];
  
  if (codeAnalysis.insights) {
    codeAnalysis.insights.forEach(insight => {
      const codeIssues = insight.analysis?.issues || [];
      codeIssues.forEach(issue => {
        issues.push({
          type: 'code_quality',
          severity: issue.severity || 'medium',
          description: `Code: ${issue.description}`,
          suggestion: issue.suggestion,
          commitCount: 1,
          location: issue.line
        });
      });
    });
  }
  
  return issues;
};

/**
 * Extract insights from code analysis
 * @param {Object} codeAnalysis - Code analysis results
 * @returns {Array} Array of insights
 */
export const extractCodeInsights = (codeAnalysis) => {
  const insights = [];
  
  if (codeAnalysis.commitsAnalyzed > 0) {
    insights.push(`Analyzed ${codeAnalysis.commitsAnalyzed} commits with ${codeAnalysis.totalLinesAnalyzed} lines of code`);
  }
  
  if (codeAnalysis.insights) {
    codeAnalysis.insights.forEach(insight => {
      if (insight.analysis?.overallAssessment) {
        insights.push(`Code review: ${insight.analysis.overallAssessment}`);
      }
    });
  }
  
  return insights;
};

/**
 * Extract recommendations from code analysis
 * @param {Object} codeAnalysis - Code analysis results
 * @returns {Array} Array of recommendations
 */
export const extractCodeRecommendations = (codeAnalysis) => {
  const recommendations = [];
  
  if (codeAnalysis.insights) {
    codeAnalysis.insights.forEach(insight => {
      const actions = insight.analysis?.recommendedActions || [];
      recommendations.push(...actions);
    });
  }
  
  return recommendations;
};

/**
 * Combine message and code analysis into unified score
 * @param {Object} messageAnalysis - Analysis from commit messages
 * @param {Object} codeAnalysis - Analysis from code diffs
 * @returns {Object} Combined analysis results
 */
export const combineMessageAndCodeAnalysis = (messageAnalysis, codeAnalysis) => {
  // Calculate enhanced quality score (weight code analysis higher)
  const messageScore = messageAnalysis.qualityScore || 0.6;
  const codeScore = calculateCodeQualityScore(codeAnalysis);
  const combinedScore = (messageScore * 0.4) + (codeScore * 0.6); // Code analysis is more important
  
  // Combine all issues found
  const messageIssues = messageAnalysis.issues || [];
  const codeIssues = extractCodeIssues(codeAnalysis);
  
  return {
    qualityScore: combinedScore,
    issues: [...messageIssues, ...codeIssues],
    insights: [
      ...(messageAnalysis.insights || []),
      ...extractCodeInsights(codeAnalysis)
    ],
    recommendations: [
      ...(messageAnalysis.recommendations || []),
      ...extractCodeRecommendations(codeAnalysis)
    ],
    codeAnalysis: codeAnalysis, // Include detailed code analysis
    analysisMethod: 'enhanced' // Flag that this used code analysis
  };
};

/**
 * Enhance quality analysis with calculated metrics
 * @param {Object} qualityData - Base quality analysis data
 * @param {Array} commits - Array of commit objects
 * @returns {Object} Enhanced analysis with additional metrics
 */
export const enhanceQualityAnalysis = (qualityData, commits) => {
  // Calculate how commits are distributed across categories
  const commitTypes = calculateCommitDistribution(commits);

  // Analyze commit message quality using heuristics
  const messageQuality = analyzeMessageQuality(commits);
  
  // Detect patterns in commit behavior
  const patterns = detectCommitPatterns(commits);

  return {
    ...qualityData, // Keep AI insights
    metadata: {
      commitsAnalyzed: commits.length,
      timeframe: '7-day analysis',
      analysisDate: new Date().toISOString()
    },
    metrics: {
      commitDistribution: commitTypes,
      messageQuality: messageQuality,
      patterns: patterns
    }
  };
};

/**
 * Calculate fallback quality score when AI analysis fails
 * @param {Array} commits - Array of commit objects
 * @returns {number} Fallback quality score
 */
export const calculateFallbackQualityScore = (commits) => {
  const messageQuality = analyzeMessageQuality(commits);
  const patterns = detectCommitPatterns(commits);
  
  let score = 0.6;
  if (messageQuality.conventionalPercentage > 50) score += 0.1;
  if (messageQuality.descriptivePercentage > 70) score += 0.1;
  if (patterns.testingActivity > 0) score += 0.1;
  if (patterns.quickFixes / commits.length > 0.3) score -= 0.2;
  
  return Math.max(0.1, Math.min(1.0, score));
};

/**
 * Summarize code analysis results
 * @param {Array} codeInsights - Array of code analysis insights
 * @returns {Object} Summary of code analysis
 */
export const summarizeCodeAnalysis = (codeInsights) => {
  const totalIssues = codeInsights.reduce((sum, insight) => 
    sum + (insight.analysis?.issues?.length || 0), 0
  );
  
  const criticalIssues = codeInsights.reduce((sum, insight) => 
    sum + (insight.analysis?.issues?.filter(i => i.severity === 'critical').length || 0), 0
  );
  
  return {
    totalCommitsAnalyzed: codeInsights.length,
    totalIssuesFound: totalIssues,
    criticalIssuesFound: criticalIssues,
    overallCodeHealth: criticalIssues === 0 ? 'good' : criticalIssues > 2 ? 'concerning' : 'fair'
  };
};

/**
 * Calculate quality trends from historical data
 * @param {Array} qualityHistory - Array of historical quality analysis
 * @returns {Object} Trend analysis results
 */
export const calculateQualityTrends = (qualityHistory) => {
  if (qualityHistory.length < 2) {
    return {
      direction: 'insufficient_data',
      scoreChange: 0,
      averageScore: qualityHistory[0]?.qualityScore || 0.5,
      insights: ['Need more data points to determine trends'],
      recommendations: ['Continue daily quality monitoring']
    };
  }

  const scores = qualityHistory.map(q => q.qualityScore);
  const recent = scores.slice(-7);
  const older = scores.slice(0, Math.max(1, scores.length - 7));
  
  const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
  const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
  const change = recentAvg - olderAvg;
  
  let direction = 'stable';
  if (change > 0.05) direction = 'improving';
  else if (change < -0.05) direction = 'declining';
  
  return {
    direction: direction,
    scoreChange: Math.round(change * 1000) / 1000,
    averageScore: Math.round(recentAvg * 1000) / 1000,
    insights: [
      `Quality trend is ${direction}`,
      `Average score: ${Math.round(recentAvg * 100)}%`,
      change > 0 ? 'Quality improvements detected' : change < 0 ? 'Quality concerns detected' : 'Quality remains stable'
    ],
    recommendations: direction === 'declining' ? [
      'Review recent commits for quality issues',
      'Consider implementing code review practices',
      'Focus on addressing technical debt'
    ] : [
      'Continue current development practices',
      'Monitor for any quality regressions',
      'Consider sharing best practices with team'
    ]
  };
}; 