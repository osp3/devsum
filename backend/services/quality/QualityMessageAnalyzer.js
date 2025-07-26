import { parseQualityResponse } from './QualityResponseParser.js';
import { analyzeMessageQuality, detectCommitPatterns, calculateFallbackQualityScore } from './QualityMetricsCalculator.js';

/**
 * Commit Message Analyzer - Functional Pattern
 * Analyzes commit message patterns and quality using AI and heuristics
 * Pure functions for reliable commit message analysis
 */

/**
 * Analyze commit messages for quality patterns
 * @param {Array} commits - Array of commit objects
 * @param {Function} callOpenAI - Function to call OpenAI API
 * @param {Object} promptBuilder - Prompt builder instance
 * @returns {Promise<Object>} Quality analysis results
 */
export const analyzeCommitMessages = async (commits, callOpenAI, promptBuilder) => {
  console.log(`🔍 AI Quality: Analyzing commit message patterns for ${commits.length} commits`);
  
  try {
    const prompt = promptBuilder.createQualityPrompt(commits);
    const aiResponse = await callOpenAI(prompt);
    return parseQualityResponse(aiResponse);
    
  } catch (error) {
    console.error('❌ AI commit message analysis failed:', error.message);
    return createFallbackMessageAnalysis(commits);
  }
};

/**
 * Create fallback analysis when AI fails
 * @param {Array} commits - Array of commit objects
 * @returns {Object} Fallback analysis results
 */
export const createFallbackMessageAnalysis = (commits) => {
  console.log('⚡ Using fallback commit message analysis');
  
  const messageQuality = analyzeMessageQuality(commits);
  const patterns = detectCommitPatterns(commits);
  const score = calculateFallbackQualityScore(commits);
  
  const issues = [];
  
  // Generate issues based on patterns
  if (patterns.technicalDebt > 0) {
    issues.push({
      type: 'technical_debt',
      severity: 'medium',
      description: `Found ${patterns.technicalDebt} commits with technical debt indicators`,
      suggestion: 'Review TODO and FIXME comments for prioritization',
      commitCount: patterns.technicalDebt
    });
  }
  
  if (patterns.quickFixes / commits.length > 0.3) {
    issues.push({
      type: 'process',
      severity: 'medium',
      description: 'High percentage of quick fixes and hotfixes',
      suggestion: 'Consider implementing better testing and review processes',
      commitCount: patterns.quickFixes
    });
  }
  
  if (messageQuality.vaguePercentage > 50) {
    issues.push({
      type: 'documentation',
      severity: 'low',
      description: 'Many commit messages are too vague or short',
      suggestion: 'Use more descriptive commit messages following conventional format',
      commitCount: Math.round(commits.length * messageQuality.vaguePercentage / 100)
    });
  }

  return {
    qualityScore: score,
    issues: issues,
    insights: [
      `Analyzed ${commits.length} commits`,
      `${messageQuality.conventionalPercentage}% use conventional format`,
      `${patterns.testingActivity} commits related to testing`,
      `Average message length: ${messageQuality.averageLength} characters`
    ],
    recommendations: [
      messageQuality.conventionalPercentage < 50 ? 'Consider using conventional commit format' : 'Good commit message format',
      patterns.testingActivity === 0 ? 'Consider adding more test coverage' : 'Good testing activity',
      patterns.documentation === 0 ? 'Consider adding documentation updates' : 'Good documentation activity',
      'Continue monitoring code quality metrics'
    ],
    metadata: {
      commitsAnalyzed: commits.length,
      method: 'fallback',
      analysisDate: new Date().toISOString()
    }
  };
};

/**
 * Analyze commit message sentiment and tone
 * @param {Array} commits - Array of commit objects
 * @returns {Object} Sentiment analysis results
 */
export const analyzeCommitSentiment = (commits) => {
  const positiveWords = ['improve', 'enhance', 'optimize', 'add', 'implement', 'create', 'upgrade', 'better'];
  const negativeWords = ['fix', 'bug', 'error', 'issue', 'problem', 'broken', 'fail', 'crash'];
  const urgentWords = ['urgent', 'critical', 'hotfix', 'emergency', 'asap', 'immediate'];

  let positiveCount = 0;
  let negativeCount = 0;
  let urgentCount = 0;
  let neutralCount = 0;

  commits.forEach(commit => {
    const message = commit.message?.toLowerCase() || '';
    
    const hasPositive = positiveWords.some(word => message.includes(word));
    const hasNegative = negativeWords.some(word => message.includes(word));
    const hasUrgent = urgentWords.some(word => message.includes(word));

    if (hasUrgent) {
      urgentCount++;
    } else if (hasNegative) {
      negativeCount++;
    } else if (hasPositive) {
      positiveCount++;
    } else {
      neutralCount++;
    }
  });

  const total = commits.length;
  return {
    positive: {
      count: positiveCount,
      percentage: Math.round((positiveCount / total) * 100)
    },
    negative: {
      count: negativeCount,
      percentage: Math.round((negativeCount / total) * 100)
    },
    urgent: {
      count: urgentCount,
      percentage: Math.round((urgentCount / total) * 100)
    },
    neutral: {
      count: neutralCount,
      percentage: Math.round((neutralCount / total) * 100)
    },
    overallSentiment: urgentCount > total * 0.2 ? 'urgent' :
                     negativeCount > total * 0.5 ? 'negative' :
                     positiveCount > total * 0.4 ? 'positive' : 'neutral'
  };
};

/**
 * Detect commit message anti-patterns
 * @param {Array} commits - Array of commit objects
 * @returns {Object} Anti-pattern detection results
 */
export const detectCommitAntiPatterns = (commits) => {
  const antiPatterns = {
    singleWord: commits.filter(c => (c.message || '').trim().split(' ').length === 1),
    allCaps: commits.filter(c => (c.message || '') === (c.message || '').toUpperCase() && (c.message || '').length > 3),
    noMessage: commits.filter(c => !c.message || c.message.trim().length === 0),
    tooLong: commits.filter(c => (c.message || '').length > 100),
    startsWithLowercase: commits.filter(c => {
      const msg = (c.message || '').trim();
      return msg.length > 0 && msg[0] === msg[0].toLowerCase() && msg[0] !== msg[0].toUpperCase();
    }),
    endWithPeriod: commits.filter(c => (c.message || '').trim().endsWith('.')),
    containsEmoji: commits.filter(c => /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]/u.test(c.message || ''))
  };

  const total = commits.length;
  const results = {};

  Object.entries(antiPatterns).forEach(([pattern, matches]) => {
    results[pattern] = {
      count: matches.length,
      percentage: Math.round((matches.length / total) * 100),
      examples: matches.slice(0, 3).map(c => c.message).filter(Boolean)
    };
  });

  return {
    antiPatterns: results,
    totalIssues: Object.values(antiPatterns).reduce((sum, pattern) => sum + pattern.length, 0),
    healthScore: Math.max(0, 1 - (Object.values(antiPatterns).reduce((sum, pattern) => sum + pattern.length, 0) / total))
  };
};

/**
 * Analyze commit frequency patterns
 * @param {Array} commits - Array of commit objects
 * @returns {Object} Frequency pattern analysis
 */
export const analyzeCommitFrequency = (commits) => {
  const commitsByHour = {};
  const commitsByDay = {};
  const commitsByAuthor = {};

  commits.forEach(commit => {
    if (!commit.author?.date) return;

    const date = new Date(commit.author.date);
    const hour = date.getHours();
    const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' });
    const author = commit.author?.name || 'Unknown';

    commitsByHour[hour] = (commitsByHour[hour] || 0) + 1;
    commitsByDay[dayOfWeek] = (commitsByDay[dayOfWeek] || 0) + 1;
    commitsByAuthor[author] = (commitsByAuthor[author] || 0) + 1;
  });

  // Find peak hours and days
  const peakHour = Object.entries(commitsByHour).sort((a, b) => b[1] - a[1])[0];
  const peakDay = Object.entries(commitsByDay).sort((a, b) => b[1] - a[1])[0];

  return {
    byHour: commitsByHour,
    byDay: commitsByDay,
    byAuthor: commitsByAuthor,
    patterns: {
      peakHour: peakHour ? { hour: parseInt(peakHour[0]), count: peakHour[1] } : null,
      peakDay: peakDay ? { day: peakDay[0], count: peakDay[1] } : null,
      weekendCommits: (commitsByDay['Saturday'] || 0) + (commitsByDay['Sunday'] || 0),
      lateNightCommits: Object.entries(commitsByHour)
        .filter(([hour]) => parseInt(hour) >= 22 || parseInt(hour) <= 6)
        .reduce((sum, [, count]) => sum + count, 0)
    }
  };
};

/**
 * Generate commit message quality recommendations
 * @param {Array} commits - Array of commit objects
 * @returns {Array} Array of specific recommendations
 */
export const generateMessageQualityRecommendations = (commits) => {
  const messageQuality = analyzeMessageQuality(commits);
  const patterns = detectCommitPatterns(commits);
  const antiPatterns = detectCommitAntiPatterns(commits);
  const sentiment = analyzeCommitSentiment(commits);
  
  const recommendations = [];

  // Conventional commit recommendations
  if (messageQuality.conventionalPercentage < 30) {
    recommendations.push({
      type: 'format',
      priority: 'high',
      title: 'Adopt Conventional Commit Format',
      description: 'Only ' + messageQuality.conventionalPercentage + '% of commits follow conventional format',
      action: 'Use prefixes like feat:, fix:, docs:, etc.',
      impact: 'Improves automation and release management'
    });
  }

  // Message length recommendations
  if (messageQuality.averageLength < 20) {
    recommendations.push({
      type: 'detail',
      priority: 'medium',
      title: 'Write More Descriptive Messages',
      description: 'Average commit message length is only ' + messageQuality.averageLength + ' characters',
      action: 'Include what was changed and why',
      impact: 'Improves code history understanding'
    });
  }

  // Anti-pattern recommendations
  if (antiPatterns.antiPatterns.singleWord.count > 0) {
    recommendations.push({
      type: 'clarity',
      priority: 'medium',
      title: 'Avoid Single-Word Commit Messages',
      description: `${antiPatterns.antiPatterns.singleWord.count} commits use only one word`,
      action: 'Describe what was actually changed',
      impact: 'Makes commit history more meaningful'
    });
  }

  // Sentiment recommendations
  if (sentiment.urgent.percentage > 20) {
    recommendations.push({
      type: 'process',
      priority: 'high',
      title: 'Reduce Urgent/Emergency Commits',
      description: `${sentiment.urgent.percentage}% of commits indicate urgency`,
      action: 'Implement better testing and planning processes',
      impact: 'Indicates potential process improvements needed'
    });
  }

  // Technical debt recommendations
  if (patterns.technicalDebt > commits.length * 0.15) {
    recommendations.push({
      type: 'maintenance',
      priority: 'medium',
      title: 'Address Technical Debt',
      description: `${patterns.technicalDebt} commits mention TODO/FIXME items`,
      action: 'Create tickets for TODOs and prioritize technical debt',
      impact: 'Prevents accumulation of technical debt'
    });
  }

  return recommendations;
}; 