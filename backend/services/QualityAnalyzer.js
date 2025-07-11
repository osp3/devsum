import { QualityAnalysis } from '../models/aiModels.js';

class QualityAnalyzer {
  constructor(openaiClient, callOpenAI) {
    this.openai = openaiClient;
    this.callOpenAI = callOpenAI;
  }

async analyzeCodeQuality(commits, repositoryId, timeframe = 'weekly', repositoryFullName = null) {
  console.log(`Enhanced code quality analysis for ${commits.length} commits...`);

  try {
    // STEP 1: Check cache first (save money on repeated analysis)
    const today = new Date().toISOString().split('T')[0];
    const existing = await QualityAnalysis.findOne({
      repositoryId: repositoryId,
      analysisDate: today
    }).lean();

    if (existing && timeframe === 'daily') {
      console.log('Using cached enhanced quality analysis');
      return existing;
    }

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
    
    // STEP 4: Store for future caching and historical trends
    await this._storeQualityAnalysis(enhancedQuality, repositoryId, today);
    
    console.log(`Enhanced quality analysis complete. Score: ${enhancedQuality.qualityScore}`);
    return enhancedQuality;

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
  const prompt = this._createQualityPrompt(commits);
  const aiResponse = await this.callOpenAI(prompt);
  return this._parseQualityResponse(aiResponse);
}

/**
 * GET GIT DIFF FOR A COMMIT
 * 
 * Fetches actual code changes for deeper analysis
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
    
    // INTEGRATION POINT: This will work with Backend Engineer A's GitHub service
    // For now, we'll create a simple GitHub API call
    const response = await fetch(`https://api.github.com/repos/${repositoryFullName}/commits/${commitSha}`, {
      headers: {
        'Accept': 'application/vnd.github.v3.diff',
        'User-Agent': 'DevSum-AI-Analysis'
      }
    });
    
    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`);
    }
    
    const diff = await response.text();
    
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
  const selected = [];
  
  // STRATEGY 1: Always analyze the 3 most recent commits
  const recentCommits = commits.slice(0, 3);
  selected.push(...recentCommits);
  
  // STRATEGY 2: Analyze commits with concerning patterns
  const concerningCommits = commits.filter(commit => {
    const message = commit.message?.toLowerCase() || '';
    return message.includes('quick') || 
           message.includes('hotfix') || 
           message.includes('urgent') ||
           message.includes('todo') ||
           message.includes('fixme') ||
           message.includes('hack') ||
           message.includes('temporary');
  }).slice(0, 3); // Limit to avoid costs
  
  // STRATEGY 3: Analyze security-related commits  
  const securityCommits = commits.filter(commit => {
    const message = commit.message?.toLowerCase() || '';
    return message.includes('security') ||
           message.includes('auth') ||
           message.includes('encrypt') ||
           message.includes('validate') ||
           message.includes('permission') ||
           message.includes('token');
  }).slice(0, 2);
  
  // COMBINE and DEDUPLICATE
  const allSelected = [...recentCommits, ...concerningCommits, ...securityCommits];
  const uniqueSelected = allSelected.filter((commit, index, self) => 
    index === self.findIndex(c => c.sha === commit.sha)
  );
  
  // FINAL COST CONTROL: Max 5 commits total
  return uniqueSelected.slice(0, 5);
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
      codeInsights.push({
        commitSha: commit.sha,
        commitMessage: commit.message,
        linesChanged: lineCount,
        analysis: codeAnalysis
      });
      
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
    const prompt = this._createCodeAnalysisPrompt(commit, diff);
    const aiResponse = await this.callOpenAI(prompt);
    return this._parseCodeAnalysisResponse(aiResponse);
    
  } catch (error) {
    console.error(`AI code analysis failed for ${commit.sha.slice(0, 8)}:`, error.message);
    return this._fallbackCodeAnalysis(commit, diff);
  }
}

/**
 * CREATE CODE ANALYSIS PROMPT
 * 
 * This prompt analyzes actual code changes, not just commit messages
 * Much more detailed and specific analysis possible
 * 
 * FOCUS AREAS:
 * - Security vulnerabilities (SQL injection, XSS, auth issues)
 * - Performance problems (inefficient queries, memory leaks)
 * - Code quality issues (complexity, naming, structure)
 * - Best practices violations
 * 
 * @param {Object} commit - Commit metadata
 * @param {String} diff - Git diff content
 * @returns {String} AI prompt for code analysis
 */
_createCodeAnalysisPrompt(commit, diff) {
  return `
You are a senior software engineer performing a detailed code review of this commit.

COMMIT INFO:
Message: "${commit.message}"
SHA: ${commit.sha}
Author: ${commit.author || 'Unknown'}
Date: ${commit.date || 'Unknown'}

CODE CHANGES (GIT DIFF):
${diff}

ANALYZE FOR:

1. SECURITY ISSUES:
   - Authentication/authorization problems
   - Input validation missing
   - SQL injection, XSS vulnerabilities
   - Hardcoded secrets or passwords
   - Insecure data handling

2. CODE QUALITY ISSUES:
   - Code smells (long functions, duplicate code)
   - Poor error handling
   - Missing edge case handling
   - Inefficient algorithms
   - Poor naming conventions

3. MAINTAINABILITY CONCERNS:
   - Complex logic that's hard to understand
   - Missing comments for complex code
   - Tight coupling between components
   - Violations of SOLID principles

4. PERFORMANCE ISSUES:
   - Inefficient database queries
   - Memory leaks potential
   - Unnecessary loops or computations
   - Blocking operations

5. BEST PRACTICES:
   - Proper error handling
   - Good test coverage additions
   - Clear variable/function names
   - Appropriate design patterns

Respond with JSON:
{
  "severity": "low|medium|high|critical",
  "issues": [
    {
      "type": "security|performance|maintainability|quality",
      "severity": "low|medium|high|critical", 
      "line": "approximate line number or 'multiple'",
      "description": "Specific issue found",
      "suggestion": "How to fix it",
      "example": "Show better code if applicable"
    }
  ],
  "positives": [
    "Good practices found in this commit"
  ],
  "overallAssessment": "Brief summary of code quality",
  "recommendedActions": [
    "Specific actionable recommendations"
  ]
}

Focus on actionable, specific feedback. If code looks good, say so!
  `.trim();
}

/**
 * PARSE CODE ANALYSIS RESPONSE
 * 
 * Convert AI's detailed code analysis into structured data
 */
_parseCodeAnalysisResponse(aiResponse) {
  try {
    // Clean the response to handle markdown-formatted JSON
    const cleanedResponse = this._cleanJsonResponse(aiResponse);
    const parsed = JSON.parse(cleanedResponse);
    
    return {
      severity: parsed.severity || 'medium',
      issues: (parsed.issues || []).map(issue => ({
        type: issue.type || 'quality',
        severity: issue.severity || 'medium',
        line: issue.line || 'unknown',
        description: issue.description || 'Code issue detected',
        suggestion: issue.suggestion || 'Review and improve this code',
        example: issue.example || null
      })),
      positives: parsed.positives || [],
      overallAssessment: parsed.overallAssessment || 'Code analysis completed',
      recommendedActions: parsed.recommendedActions || []
    };
    
  } catch (error) {
    console.error('Failed to parse code analysis response:', error.message);
    return {
      severity: 'medium',
      issues: [{
        type: 'analysis_error',
        severity: 'low',
        line: 'unknown',
        description: 'Unable to fully analyze code changes',
        suggestion: 'Manual code review recommended'
      }],
      positives: [],
      overallAssessment: 'Code analysis incomplete',
      recommendedActions: ['Manual review recommended']
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
      type: 'quality',
      severity: 'low',
      description: 'Debug console.log statements detected',
      suggestion: 'Remove debug statements before production'
    });
  }
  
  if (diff.includes('TODO') || diff.includes('FIXME')) {
    issues.push({
      type: 'maintainability',
      severity: 'medium',
      description: 'TODO/FIXME comments added',
      suggestion: 'Address TODO items or create tickets for them'
    });
  }
  
  return {
    severity: issues.length > 0 ? 'medium' : 'low',
    issues: issues,
    positives: addedLines > removedLines ? ['Code additions detected'] : [],
    overallAssessment: `${addedLines} lines added, ${removedLines} lines removed`,
    recommendedActions: issues.length > 0 ? ['Address identified issues'] : ['Code looks clean']
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
 * CREATE QUALITY ANALYSIS PROMPT
 * 
 * This is the "brain" of quality analysis - how we talk to AI
 * 
 * STRATEGY:
 * - Group commits by type so AI can see patterns
 * - Give AI specific things to look for
 * - Ask for structured JSON response
 * - Focus on actionable insights, not just analysis
 */
    _createQualityPrompt(commits) {
  // Group commits by category for better AI analysis
  // Instead of a random list, AI sees organized patterns
  const commitsByCategory = commits.reduce((groups, commit) => {
    const category = commit.category || 'other';
    if (!groups[category]) groups[category] = [];
    groups[category].push(commit.message);
    return groups;
  }, {});
    //format for AI - Show category patterns clearly
      const commitSummary = Object.entries(commitsByCategory)
    .map(([category, messages]) => 
      `${category.toUpperCase()} (${messages.length}):\n${messages.map(m => `- ${m}`).join('\n')}`
    )
    .join('\n\n');

    return `
    You are a senior software engineer analyzing code quality patterns from git commits.

      RECENT COMMITS BY CATEGORY:
      ${commitSummary}

      ANALYSIS TASKS:
1. Identify code quality issues and technical debt patterns
2. Assess overall development practices  
3. Provide actionable recommendations

LOOK FOR THESE PATTERNS:
- Technical debt indicators (TODO, FIXME, quick fix, temporary, hack)
- Security-related changes (auth, validation, encryption, security)
- Performance improvements or concerns (optimize, performance, slow, memory)
- Testing patterns (test, spec, coverage) - or lack thereof
- Refactoring vs new features balance
- Code maintainability indicators (clean, refactor, organize)

QUALITY SCORING GUIDELINES:
- Good indicators: Descriptive commits, security focus, testing activity, refactoring
- Concerning indicators: Many "quick fixes", TODO comments, vague messages, no tests

Respond with valid JSON only:
{
  "qualityScore": 0.75,
  "issues": [
    {
      "type": "technical_debt",
      "severity": "medium",
      "description": "Multiple TODO comments indicate incomplete work",
      "suggestion": "Schedule dedicated time to address technical debt",
      "commitCount": 3
    }
  ],
  "insights": [
    "Good balance of features and bug fixes",
    "Strong focus on security improvements"
  ],
    "recommendations": [
    "Consider adding unit tests for new features",
    "Review and prioritize TODO items"
    ]
  }

    Quality score should be 0.0-1.0 where:
    - 0.9-1.0: Excellent (great practices, minimal debt)
    - 0.7-0.9: Good (solid practices, minor issues)  
    - 0.5-0.7: Fair (some concerns, needs attention)
    - 0.3-0.5: Poor (significant issues)
    - 0.0-0.3: Critical (major problems)
  `.trim();
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
    // Clean the response to handle markdown-formatted JSON
    const cleanedResponse = this._cleanJsonResponse(aiResponse);
    const parsed = JSON.parse(cleanedResponse);
    
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
 * STORE QUALITY ANALYSIS
 */
async _storeQualityAnalysis(qualityData, repositoryId, date) {
  try {
    await QualityAnalysis.findOneAndUpdate(
      { repositoryId: repositoryId, analysisDate: date },
      {
        repositoryId: repositoryId,
        analysisDate: date,
        qualityScore: qualityData.qualityScore,
        issues: qualityData.issues,
        insights: qualityData.insights,
        recommendations: qualityData.recommendations,
        commitAnalyzed: qualityData.metadata?.commitsAnalyzed || 0,
        trends: {
          improvingAreas: [],
          concerningAreas: []
        }
      },
      { upsert: true, new: true }
    );
    
    console.log(`Stored quality analysis for ${date}`);
    
  } catch (error) {
    console.error('Failed to store quality analysis:', error.message);
  }
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

/**
 * Clean AI response to handle markdown-formatted JSON
 * Removes ```json and ``` code block markers
 */
_cleanJsonResponse(response) {
  if (!response || typeof response !== 'string') {
    return response;
  }

  // Remove markdown code block markers
  let cleaned = response.trim();
  
  // Remove opening ```json or ``` markers
  cleaned = cleaned.replace(/^```json\s*/i, '');
  cleaned = cleaned.replace(/^```\s*/, '');
  
  // Remove closing ``` markers
  cleaned = cleaned.replace(/\s*```\s*$/, '');
  
  return cleaned.trim();
}
}

export default QualityAnalyzer;