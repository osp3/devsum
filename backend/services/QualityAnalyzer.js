import { QualityAnalysis } from '../models/aiModels.js';

class QualityAnalyzer {
  constructor(openaiClient, callOpenAI, promptBuilder, githubService = null) {
    this.openai = openaiClient;
    this.callOpenAI = callOpenAI;
    this.promptBuilder = promptBuilder;
    this.githubService = githubService; // Add GitHubService for authenticated API calls
  }

async analyzeCodeQuality(commits, repositoryId, timeframe = 'weekly', repositoryFullName = null) {
  console.log(`Enhanced code quality analysis for ${commits.length} commits...`);

  try {
    // STEP 1: Check cache first (save money on repeated analysis)
    const cacheKey = this._generateCacheKey(commits, repositoryId, timeframe);
    console.log(`🔑 Generated cache key: ${cacheKey}`);
    
    // Look for recent cache entries (within 4 hours) for better cache hit rates
    const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000);
    
    console.log(`🔍 Searching for cache with criteria:`, {
      repositoryId: repositoryId,
      cacheKey: cacheKey,
      createdAt_gte: fourHoursAgo.toISOString()
    });
    
    const existing = await QualityAnalysis.findOne({
      repositoryId: repositoryId,
      cacheKey: cacheKey,
      createdAt: { $gte: fourHoursAgo }  // Find entries newer than 4 hours
    }).lean();

    if (existing) {
      const minutesOld = Math.round((Date.now() - existing.createdAt.getTime()) / (1000 * 60));
      console.log(`✅ Using cached quality analysis for ${repositoryId} (${minutesOld} minutes old)`);
      return existing;
    }
    
    console.log(`❌ No recent cache found for ${repositoryId}, running fresh analysis...`);

    // STEP 2: Choose analysis method based on available data
    let qualityData;
    if (repositoryFullName) {
      console.log('Running ENHANCED analysis with code diffs...');
      qualityData = await this._analyzeCommitsWithDiffs(commits, repositoryFullName);
    } else {
      console.log('Running message-only analysis (no repository info)...');
      qualityData = await this._analyzeCommitMessages(commits);
    }
    
    // STEP 3: Add our calculated metrics to AI insights
    const enhancedQuality = this._enhanceQualityAnalysis(qualityData, commits);
    
    // STEP 4: Store for future caching and historical trends - AWAIT THIS!
    const today = new Date().toISOString().split('T')[0];
    console.log(`💾 Storing quality analysis with cache key: ${cacheKey}`);
    const storedAnalysis = await this._storeQualityAnalysis(enhancedQuality, repositoryId, today, cacheKey);
    console.log(`✅ Cache storage completed for ${repositoryId}`);
    
    return storedAnalysis || enhancedQuality;

  } catch (error) {
    console.error('Enhanced quality analysis failed:', error.message);
    return this._fallbackQualityAnalysis(commits, repositoryId);
  }
}

  /**
 * GET QUALITY TRENDS OVER TIME
 * 
 * This analyzes how code quality is changing:
 * - Is quality improving or declining?
 * - What areas are getting better/worse?
 * - Are there concerning patterns?
 * 
 * WHY THIS MATTERS:
 * - Early warning system for technical debt accumulation
 * - Shows if development practices are working
 * - Helps justify time for refactoring to management
 * - Tracks team improvement over time
 * 
 * @param {String} repositoryId - Repository to analyze
 * @param {Number} days - How far back to look (default 30 days)
 */

  async getQualityTrends(repositoryId, days = 30) {
    console.log(`Analyzing quality trends for last ${days} days...`);

    try {
      // get historical data from mongo
      const since = new Date(Date.now() - days * 24 * 60 * 1000);
      const sinceStr = since.toISOString().split('T')[0];

      const qualityHistory = await QualityAnalysis.find({
        repositoryId: repositoryId,
        analysisDate: { $gte: sinceStr }
      })
      .sort({ analysisDate: 1 }) //oldest first
      .lean();

      // need data to analyze trends
      if (qualityHistory.length === 0) {
        return {
          trend: 'insufficient_data',
          message: 'Need more historical data to analyze trends',
          suggestions: ['Run quality analysis for a few more days to see trends']
        };
      }

      // calc trend directions/insights
      const trends = this._calculateQualityTrends(qualityHistory);

      return {
        trend: trends.direction, //(improving, declining, stable)
        currentScore: qualityHistory[qualityHistory.length - 1]?.qualityScore || 0,
        averageScore: trends.averageScore,
        scoreChange: trends.scoreChange,
        historicalData: qualityHistory.map(q => ({
        date: q.analysisDate,
        score: q.qualityScore,
        issueCount: q.issues.length
      })),
      insights: trends.insights,
      recommendations: trends.recommendations
    };
    
    } catch (error) {
      console.error('Quality trends analysis failed:', error.message);
      return {
        trend: 'error',
        message: 'Unable to analyze quality trends',
        suggestions: ['Check your commit history and try again']
      };
    }
  }

  /**
 * ANALYZE COMMIT MESSAGES ONLY
 * 
 * Your original analysis method - now separated for clarity
 * This is the fallback when code diffs aren't available
 */
async _analyzeCommitMessages(commits) {
  console.log(`🔍 AI Quality: Analyzing commit message patterns for ${commits.length} commits`);
      const prompt = this.promptBuilder.createQualityPrompt(commits);
  const aiResponse = await this.callOpenAI(prompt);
  return this._parseQualityResponse(aiResponse);
}

/**
 * GET GIT DIFF FOR A COMMIT
 * 
 * Fetches actual code changes for deeper analysis using authenticated GitHubService
 * This is where we get the "real" code to analyze
 * 
 * WHY THIS IS POWERFUL:
 * - See actual code changes, not just commit messages
 * - Detect security vulnerabilities in the code
 * - Find performance issues and code smells
 * - Analyze complexity and maintainability
 * 
 * @param {String} commitSha - The commit hash
 * @param {String} repositoryFullName - "owner/repo-name" format
 * @returns {String} The git diff content
 */
async _getCommitDiff(commitSha, repositoryFullName) {
  try {
    console.log(`Fetching diff for commit ${commitSha.slice(0, 8)}...`);
    
    if (!this.githubService) {
      console.error('GitHubService not available for authenticated API calls');
      return null;
    }
    
    // Parse repository full name to get owner and repo
    const [owner, repo] = repositoryFullName.split('/');
    if (!owner || !repo) {
      console.error(`Invalid repository format: ${repositoryFullName}`);
      return null;
    }
    
    // Use authenticated GitHubService instead of direct fetch
    const commitData = await this.githubService.getCommitDiff(owner, repo, commitSha);
    
    // Extract diff content from files
    const diff = commitData.files
      .map(file => file.patch || '')
      .filter(patch => patch.length > 0)
      .join('\n');
    
    if (!diff || diff.trim().length === 0) {
      console.log(`No diff content available for commit ${commitSha.slice(0, 8)}`);
      return null;
    }
    
    // COST CONTROL: Limit diff size to prevent massive AI costs
    const maxDiffSize = 5000; // ~5KB limit
    if (diff.length > maxDiffSize) {
      console.log(`Diff too large (${diff.length} chars), truncating to ${maxDiffSize}`);
      return diff.slice(0, maxDiffSize) + '\n\n... (diff truncated for analysis)';
    }
    
    return diff;
    
  } catch (error) {
    console.error(`Failed to fetch diff for ${commitSha}:`, error.message);
    return null; // Return null if diff unavailable
  }
}

/**
 * ANALYZE COMMITS WITH CODE DIFFS
 * 
 * Enhanced analysis combining commit messages + actual code changes
 * 
 * STRATEGY:
 * - Analyze commit messages for patterns (fast, cheap)
 * - Get diffs for most important commits (detailed analysis)
 * - Combine insights for comprehensive quality assessment
 * 
 * @param {Array} commits - Commits with messages and metadata
 * @param {String} repositoryFullName - GitHub repo name
 * @returns {Object} Enhanced analysis with code insights
 */
async _analyzeCommitsWithDiffs(commits, repositoryFullName) {
  console.log(`Enhanced analysis: ${commits.length} commits + code diffs`);
  
  try {
    // STEP 1: Analyze commit messages (all commits - fast and cheap)
    const messageAnalysis = await this._analyzeCommitMessages(commits);
    
    // STEP 2: Smart selection of commits for expensive code analysis
    const commitsForCodeAnalysis = this._selectCommitsForCodeAnalysis(commits);
    console.log(`Selected ${commitsForCodeAnalysis.length} commits for code analysis`);
    
    // STEP 3: Get diffs and analyze code changes
    const codeAnalysis = await this._analyzeCodeChanges(commitsForCodeAnalysis, repositoryFullName);
    
    // STEP 4: Combine message and code insights
    return this._combineMessageAndCodeAnalysis(messageAnalysis, codeAnalysis);
    
  } catch (error) {
    console.error('Enhanced analysis failed:', error.message);
    // Graceful fallback to message-only analysis
    return await this._analyzeCommitMessages(commits);
  }
}

/**
 * SELECT COMMITS FOR CODE ANALYSIS
 * 
 * We can't analyze diffs for every commit (too expensive!)
 * Smart selection based on:
 * - Recent commits (most relevant)
 * - Concerning commit messages (potential issues)
 * - Security-related commits (high impact)
 * 
 * COST CONTROL STRATEGY:
 * - Max 5 commits for code analysis per request
 * - Prioritize recent + concerning + security commits
 * - Skip obvious safe commits (docs, minor formatting)
 * 
 * @param {Array} commits - All commits
 * @returns {Array} Selected commits for expensive code analysis
 */
_selectCommitsForCodeAnalysis(commits) {
  // Analyze all commits for comprehensive code quality insights
  return commits;
}

/**
 * ANALYZE CODE CHANGES
 * 
 * Get diffs and send to AI for detailed code quality analysis
 * This is where the magic happens - AI analyzing actual code!
 * 
 * @param {Array} commits - Selected commits for analysis
 * @param {String} repositoryFullName - GitHub repo name
 * @returns {Object} Code analysis results
 */
async _analyzeCodeChanges(commits, repositoryFullName) {
  const codeInsights = [];
  let totalLinesAnalyzed = 0;
  
  for (const commit of commits) {
    try {
      // Get the actual code diff
      const diff = await this._getCommitDiff(commit.sha, repositoryFullName);
      
      if (!diff) {
        console.log(`Skipping code analysis for ${commit.sha.slice(0, 8)} - no diff available`);
        continue;
      }
      
      // Count lines for metrics
      const lineCount = diff.split('\n').length;
      totalLinesAnalyzed += lineCount;
      
      // Send this commit's code changes to AI
      const codeAnalysis = await this._analyzeIndividualCommitCode(commit, diff);
      
      // Validate the analysis structure before adding to insights
      if (codeAnalysis && typeof codeAnalysis === 'object') {
        // Validate and clean the issues array to match schema
        const validatedIssues = Array.isArray(codeAnalysis.issues) 
          ? codeAnalysis.issues.map(issue => {
              // Ensure all issue fields are proper strings
              const validatedIssue = {
                type: String(issue.type || 'quality'),
                severity: String(issue.severity || 'medium'),
                line: String(issue.line || 'unknown'),
                description: String(issue.description || 'Issue detected'),
                suggestion: String(issue.suggestion || 'Review and improve'),
                example: String(issue.example || '') // Convert null to empty string
              };
              
              // Debug: Log structure for troubleshooting
              console.log(`📋 Issue validation: ${JSON.stringify(validatedIssue)}`);
              return validatedIssue;
            })
          : [];
          
        // Validate and clean other arrays to ensure they contain only strings
        const validatedPositives = Array.isArray(codeAnalysis.positives) 
          ? codeAnalysis.positives.filter(item => item != null).map(item => String(item))
          : [];
          
        const validatedRecommendedActions = Array.isArray(codeAnalysis.recommendedActions) 
          ? codeAnalysis.recommendedActions.filter(item => item != null).map(item => String(item))
          : [];
          
        const insightData = {
          commitSha: String(commit.sha),
          commitMessage: String(commit.message),
          linesChanged: Number(lineCount),
          analysis: {
            severity: String(codeAnalysis.severity || 'medium'),
            issues: validatedIssues,
            positives: validatedPositives,
            overallAssessment: String(codeAnalysis.overallAssessment || 'Analysis completed'),
            recommendedActions: validatedRecommendedActions
          }
        };
        
        // Debug: Log the complete structure before adding
        console.log(`📊 Complete insight structure: ${JSON.stringify(insightData, null, 2)}`);
        codeInsights.push(insightData);
      } else {
        console.warn(`⚠️ Invalid analysis structure for commit ${commit.sha.slice(0, 8)}, skipping`);
      }
      
    } catch (error) {
      console.error(`Code analysis failed for ${commit.sha.slice(0, 8)}:`, error.message);
      // Continue with other commits
    }
  }
  
  return {
    commitsAnalyzed: commits.length,
    totalLinesAnalyzed: totalLinesAnalyzed,
    insights: codeInsights,
    summary: this._summarizeCodeAnalysis(codeInsights)
  };
}

/**
 * ANALYZE INDIVIDUAL COMMIT CODE
 * 
 * Send a single commit's diff to AI for detailed analysis
 * This is where we get specific, actionable code feedback
 * 
 * @param {Object} commit - Commit metadata
 * @param {String} diff - Git diff content
 * @returns {Object} AI analysis of the code changes
 */
async _analyzeIndividualCommitCode(commit, diff) {
  try {
    console.log(`🔍 AI Code Quality: Analyzing code diff for commit ${commit.sha.slice(0, 8)} (${diff.split('\n').length} lines)`);
    const prompt = this.promptBuilder.createCodeAnalysisPrompt(commit, diff);
    const aiResponse = await this.callOpenAI(prompt);
    return this._parseCodeAnalysisResponse(aiResponse);
    
  } catch (error) {
    console.error(`AI code analysis failed for ${commit.sha.slice(0, 8)}:`, error.message);
    return this._fallbackCodeAnalysis(commit, diff);
  }
}



/**
 * PARSE CODE ANALYSIS RESPONSE
 * 
 * Convert AI's detailed code analysis into structured data
 */
_parseCodeAnalysisResponse(aiResponse) {
  try {
    const parsed = JSON.parse(aiResponse);
    
    // Helper function to parse nested JSON strings that AI sometimes returns
    const parseIfNeeded = (value) => {
      if (typeof value === 'string' && (value.startsWith('[') || value.startsWith('{'))) {
        try {
          return JSON.parse(value);
        } catch (e) {
          console.warn('Failed to parse nested JSON:', value);
          return value;
        }
      }
      return value;
    };
    
    // Parse issues array (handle both array and JSON string cases)
    let issues = parseIfNeeded(parsed.issues) || [];
    if (!Array.isArray(issues)) {
      console.warn('Issues is not an array after parsing:', typeof issues);
      issues = [];
    }
    
    // Parse positives and recommendedActions arrays
    let positives = parseIfNeeded(parsed.positives) || [];
    if (!Array.isArray(positives)) positives = [];
    
    let recommendedActions = parseIfNeeded(parsed.recommendedActions) || [];
    if (!Array.isArray(recommendedActions)) recommendedActions = [];
    
    return {
      severity: parsed.severity || 'medium',
      issues: issues.map(issue => ({
        type: String(issue.type || 'quality'),
        severity: String(issue.severity || 'medium'),
        line: String(issue.line || 'unknown'),
        description: String(issue.description || 'Code issue detected'),
        suggestion: String(issue.suggestion || 'Review and improve this code'),
        example: String(issue.example || '') // Always return string, never null
      })),
      positives: positives.filter(item => item != null).map(item => String(item)),
      overallAssessment: String(parsed.overallAssessment || 'Code analysis completed'),
      recommendedActions: recommendedActions.filter(item => item != null).map(item => String(item))
    };
    
  } catch (error) {
    console.error('Failed to parse code analysis response:', error.message);
    return {
      severity: String('medium'),
      issues: [{
        type: String('analysis_error'),
        severity: String('low'),
        line: String('unknown'),
        description: String('Unable to fully analyze code changes'),
        suggestion: String('Manual code review recommended'),
        example: String('')
      }],
      positives: [],
      overallAssessment: String('Code analysis incomplete'),
      recommendedActions: [String('Manual review recommended')]
    };
  }
}

/**
 * COMBINE MESSAGE AND CODE ANALYSIS
 * 
 * Merge insights from commit messages and actual code changes
 * This creates the most comprehensive quality assessment possible
 */
_combineMessageAndCodeAnalysis(messageAnalysis, codeAnalysis) {
  // Calculate enhanced quality score (weight code analysis higher)
  const messageScore = messageAnalysis.qualityScore || 0.6;
  const codeScore = this._calculateCodeQualityScore(codeAnalysis);
  const combinedScore = (messageScore * 0.4) + (codeScore * 0.6); // Code analysis is more important
  
  // Combine all issues found
  const messageIssues = messageAnalysis.issues || [];
  const codeIssues = this._extractCodeIssues(codeAnalysis);
  
  return {
    qualityScore: combinedScore,
    issues: [...messageIssues, ...codeIssues],
    insights: [
      ...(messageAnalysis.insights || []),
      ...this._extractCodeInsights(codeAnalysis)
    ],
    recommendations: [
      ...(messageAnalysis.recommendations || []),
      ...this._extractCodeRecommendations(codeAnalysis)
    ],
    codeAnalysis: codeAnalysis, // Include detailed code analysis
    analysisMethod: 'enhanced' // Flag that this used code analysis
  };
}

/**
 * CALCULATE CODE QUALITY SCORE FROM CODE ANALYSIS
 */
_calculateCodeQualityScore(codeAnalysis) {
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
}

/**
 * EXTRACT CODE ISSUES FOR COMBINED ANALYSIS
 */
_extractCodeIssues(codeAnalysis) {
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
}

/**
 * EXTRACT CODE INSIGHTS
 */
_extractCodeInsights(codeAnalysis) {
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
}

/**
 * EXTRACT CODE RECOMMENDATIONS
 */
_extractCodeRecommendations(codeAnalysis) {
  const recommendations = [];
  
  if (codeAnalysis.insights) {
    codeAnalysis.insights.forEach(insight => {
      const actions = insight.analysis?.recommendedActions || [];
      recommendations.push(...actions);
    });
  }
  
  return recommendations;
}

/**
 * FALLBACK CODE ANALYSIS
 */
_fallbackCodeAnalysis(commit, diff) {
  const lines = diff.split('\n');
  const addedLines = lines.filter(line => line.startsWith('+')).length;
  const removedLines = lines.filter(line => line.startsWith('-')).length;
  
  // Simple heuristics when AI fails
  const issues = [];
  if (diff.includes('console.log')) {
    issues.push({
      type: String('quality'),
      severity: String('low'),
      line: String('multiple'),
      description: String('Debug console.log statements detected'),
      suggestion: String('Remove debug statements before production'),
      example: String('')
    });
  }
  
  if (diff.includes('TODO') || diff.includes('FIXME')) {
    issues.push({
      type: String('maintainability'),
      severity: String('medium'), 
      line: String('multiple'),
      description: String('TODO/FIXME comments added'),
      suggestion: String('Address TODO items or create tickets for them'),
      example: String('')
    });
  }
  
  return {
    severity: String(issues.length > 0 ? 'medium' : 'low'),
    issues: issues,
    positives: addedLines > removedLines ? [String('Code additions detected')] : [],
    overallAssessment: String(`${addedLines} lines added, ${removedLines} lines removed`),
    recommendedActions: issues.length > 0 ? [String('Address identified issues')] : [String('Code looks clean')]
  };
}

/**
 * SUMMARIZE CODE ANALYSIS RESULTS
 */
_summarizeCodeAnalysis(codeInsights) {
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
}



/**
 * PARSE QUALITY RESPONSE FROM AI
 * 
 * Convert AI's JSON response into clean, structured data
 * 
 * AI responses can be inconsistent, so we:
 * - Validate all fields exist
 * - Set safe defaults for missing data
 * - Clean up any formatting issues
 */
_parseQualityResponse(aiResponse) {
  try {
    const parsed = JSON.parse(aiResponse);
    
    // VALIDATE AND CLEAN: Ensure quality score is between 0-1
    const cleanScore = Math.max(0, Math.min(1, parsed.qualityScore || 0.5));
    
    // VALIDATE AND CLEAN: Ensure issues have required fields
    const cleanIssues = (parsed.issues || []).map(issue => ({
      type: issue.type || 'maintainability',
      severity: ['low', 'medium', 'high', 'critical'].includes(issue.severity) 
        ? issue.severity : 'medium',
      description: issue.description || 'Quality issue detected',
      suggestion: issue.suggestion || 'Review and address this issue',
      commitCount: Math.max(0, issue.commitCount || 1)
    }));
    
    return {
      qualityScore: cleanScore,
      issues: cleanIssues,
      insights: Array.isArray(parsed.insights) ? parsed.insights : ['Code quality analysis completed'],
      recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : ['Continue monitoring code quality']
    };
    
  } catch (error) {
    console.error('Failed to parse quality response:', error.message);

    // if AI gives invalid JSON, return default
    return {
      qualityScore: 0.6,
      issues: [{
        type: 'analysis_error',
        severity: 'low',
        description: 'Unable to fully analyze quality patterns',
        suggestion: 'Manual code review recommended',
        commitCount: 0
      }],
      insights: ['Quality analysis completed with limited data'],
      recommendations: ['Ensure commit messages are descriptive']
    };
  }
}
  /**
 * ENHANCE QUALITY ANALYSIS
 * 
 * Take AI's basic analysis and add our own calculated metrics
 */
_enhanceQualityAnalysis(qualityData, commits) {
  // Calculate how commits are distributed across categories
  const commitTypes = commits.reduce((acc, commit) => {
    acc[commit.category || 'other'] = (acc[commit.category || 'other'] || 0) + 1;
    return acc;
  }, {});

  // Analyze commit message quality using heuristics
  const messageQuality = this._analyzeMessageQuality(commits);
  
  // Detect patterns in commit behavior
  const patterns = this._detectCommitPatterns(commits);

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
}

/**
 * ANALYZE MESSAGE QUALITY
 */
_analyzeMessageQuality(commits) {
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
}

/**
 * DETECT COMMIT PATTERNS
 */
_detectCommitPatterns(commits) {
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
    ).length
  };

  return {
    ...patterns,
    healthScore: this._calculatePatternHealthScore(patterns, commits.length)
  };
}

/**
 * CALCULATE PATTERN HEALTH SCORE
 */
_calculatePatternHealthScore(patterns, totalCommits) {
  let score = 0.7; // Start neutral
  
  // Positive indicators
  if (patterns.testingActivity > 0) score += 0.1;
  if (patterns.documentation > 0) score += 0.1;
  if (patterns.securityFocus > 0) score += 0.1;
  
  // Negative indicators
  if (patterns.quickFixes / totalCommits > 0.3) score -= 0.2;
  if (patterns.technicalDebt / totalCommits > 0.2) score -= 0.1;
  
  return Math.max(0, Math.min(1, score));
}

/**
 * STORE ANALYSIS IN DATABASE
 * Saves quality analysis to database for future caching and historical trends
 */
async _storeQualityAnalysis(qualityData, repositoryId, date, cacheKey) {
  try {
    // Debug the codeAnalysis structure before saving
    if (qualityData.codeAnalysis && qualityData.codeAnalysis.insights) {
      console.log(`📊 Saving ${qualityData.codeAnalysis.insights.length} code insights for ${repositoryId}`);
      console.log(`📊 Sample insight structure:`, JSON.stringify(qualityData.codeAnalysis.insights[0], null, 2));
    }
    
    const storedAnalysis = await QualityAnalysis.findOneAndUpdate(
      { repositoryId: repositoryId, analysisDate: date, cacheKey: cacheKey },
      {
        repositoryId: repositoryId,
        analysisDate: date,
        cacheKey: cacheKey,
        qualityScore: qualityData.qualityScore,
        issues: qualityData.issues,
        insights: qualityData.insights,
        recommendations: qualityData.recommendations,
        commitAnalyzed: qualityData.metadata?.commitsAnalyzed || 0,
        trends: {
          improvingAreas: [],
          concerningAreas: []
        },
        codeAnalysis: qualityData.codeAnalysis || null,
        analysisMethod: qualityData.analysisMethod || 'basic'
      },
      { upsert: true, new: true }
    );
    
    console.log(`✅ Stored quality analysis cache for ${repositoryId}`);
    return storedAnalysis;
    
  } catch (error) {
    console.error('Failed to store quality analysis:', error.message);
    console.error('Error details:', error);
    return null;
  }
}

/**
 * GENERATE CACHE KEY
 * Creates a cache key that allows reuse when analyzing similar time periods
 * Uses repository + timeframe + date + commit count buckets instead of specific commit SHAs
 */
_generateCacheKey(commits, repositoryId, timeframe) {
  // Use repository and timeframe as primary cache key
  // This allows cache reuse even when new commits are added to similar time periods
  const today = new Date().toISOString().split('T')[0];
  
  // Use commit count buckets to allow cache reuse with minor commit changes
  // Round to nearest 10 (e.g., 5-14 commits all use bucket "10")
  const commitCountBucket = Math.floor((commits.length + 5) / 10) * 10;
  
  return `quality-${repositoryId.replace('/', '-')}-${timeframe}-${today}-${commitCountBucket}`;
}

/**
 * FALLBACK QUALITY ANALYSIS
 */
_fallbackQualityAnalysis(commits, repositoryId) {
  console.log(' Using fallback quality analysis');
  
  const messageQuality = this._analyzeMessageQuality(commits);
  const patterns = this._detectCommitPatterns(commits);
  
  let score = 0.6;
  if (messageQuality.conventionalPercentage > 50) score += 0.1;
  if (messageQuality.descriptivePercentage > 70) score += 0.1;
  if (patterns.testingActivity > 0) score += 0.1;
  if (patterns.quickFixes / commits.length > 0.3) score -= 0.2;
  
  return {
    qualityScore: Math.max(0.1, Math.min(1.0, score)),
    issues: patterns.technicalDebt > 0 ? [{
      type: 'technical_debt',
      severity: 'medium',
      description: `Found ${patterns.technicalDebt} commits with technical debt indicators`,
      suggestion: 'Review TODO and FIXME comments for prioritization',
      commitCount: patterns.technicalDebt
    }] : [],
    insights: [
      `Analyzed ${commits.length} commits`,
      `${messageQuality.conventionalPercentage}% use conventional format`,
      `${patterns.testingActivity} commits related to testing`
    ],
    recommendations: [
      messageQuality.conventionalPercentage < 50 ? 'Consider using conventional commit format' : 'Good commit message format',
      patterns.testingActivity === 0 ? 'Consider adding more test coverage' : 'Good testing activity',
      'Continue monitoring code quality metrics'
    ],
    metadata: {
      commitsAnalyzed: commits.length,
      method: 'fallback',
      analysisDate: new Date().toISOString()
    }
  };
}

/**
 * CALCULATE QUALITY TRENDS
 */
_calculateQualityTrends(qualityHistory) {
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
}
}

export default QualityAnalyzer;