/**
 * Quality Prompt Builder - Functional Pattern
 * Functions for creating quality analysis AI prompts
 * Pure functions for reliable quality assessment prompt generation
 */

import { formatCommitsByCategory, formatCommitInfo } from './PromptUtils.js';

/**
 * Create quality analysis prompt for commit patterns
 * @param {Array} commits - Array of commit objects
 * @returns {string} Quality analysis prompt for AI
 */
export const createQualityPrompt = (commits) => {
  const commitSummary = formatCommitsByCategory(commits);

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

IMPORTANT: Respond with ONLY raw JSON. Do not use markdown code blocks or any formatting. Your response must start with { and end with }.

Return this exact JSON structure:
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
};

/**
 * Create comprehensive code review prompt for individual commits
 * @param {Object} commit - Commit object with metadata
 * @param {string} diff - Git diff content
 * @returns {string} Code analysis prompt for AI
 */
export const createCodeAnalysisPrompt = (commit, diff) => {
  const commitInfo = formatCommitInfo(commit);
  
  return `
You are a senior software engineer performing a detailed code review of this commit.

COMMIT INFO:
${commitInfo}

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

IMPORTANT: Respond with ONLY raw JSON. Do not use markdown code blocks or any formatting. Your response must start with { and end with }.

Return this exact JSON structure:
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
};

/**
 * Create prompt for security-focused code analysis
 * @param {Object} commit - Commit object
 * @param {string} diff - Git diff content
 * @returns {string} Security analysis prompt for AI
 */
export const createSecurityAnalysisPrompt = (commit, diff) => {
  const commitInfo = formatCommitInfo(commit);
  
  return `
You are a cybersecurity expert performing a security review of this commit.

COMMIT INFO:
${commitInfo}

CODE CHANGES (GIT DIFF):
${diff}

SECURITY ANALYSIS FOCUS:

1. AUTHENTICATION & AUTHORIZATION:
   - Proper access controls
   - Session management
   - JWT token handling
   - Password security

2. INPUT VALIDATION & SANITIZATION:
   - SQL injection prevention
   - XSS protection
   - Command injection
   - Path traversal

3. DATA PROTECTION:
   - Encryption of sensitive data
   - Secure data transmission
   - PII handling
   - Database security

4. CONFIGURATION SECURITY:
   - Environment variables
   - API keys and secrets
   - CORS settings
   - Security headers

5. BUSINESS LOGIC SECURITY:
   - Race conditions
   - Access control bypasses
   - Privilege escalation
   - Data exposure

RESPOND WITH ONLY JSON:
{
  "securityRisk": "low|medium|high|critical",
  "vulnerabilities": [
    {
      "type": "authentication|authorization|injection|exposure|configuration",
      "severity": "low|medium|high|critical",
      "description": "Specific vulnerability found",
      "impact": "What could happen if exploited",
      "remediation": "How to fix this vulnerability",
      "cwe": "CWE-XXX if applicable"
    }
  ],
  "securityBestPractices": [
    "Security practices observed in the code"
  ],
  "recommendations": [
    "Specific security improvements needed"
  ]
}
  `.trim();
};

/**
 * Create prompt for performance analysis of code changes
 * @param {Object} commit - Commit object
 * @param {string} diff - Git diff content
 * @returns {string} Performance analysis prompt for AI
 */
export const createPerformanceAnalysisPrompt = (commit, diff) => {
  const commitInfo = formatCommitInfo(commit);
  
  return `
You are a performance engineering expert analyzing this commit for efficiency.

COMMIT INFO:
${commitInfo}

CODE CHANGES (GIT DIFF):
${diff}

PERFORMANCE ANALYSIS FOCUS:

1. ALGORITHMIC EFFICIENCY:
   - Time complexity (Big O)
   - Space complexity
   - Unnecessary loops or iterations
   - Inefficient data structures

2. DATABASE PERFORMANCE:
   - Query efficiency
   - N+1 query problems
   - Missing indexes
   - Large result sets

3. MEMORY MANAGEMENT:
   - Memory leaks
   - Excessive object creation
   - Large data structures
   - Garbage collection impact

4. I/O OPERATIONS:
   - File system operations
   - Network calls
   - Blocking operations
   - Caching opportunities

5. SCALABILITY CONCERNS:
   - Resource usage patterns
   - Concurrency issues
   - Bottleneck identification
   - Load handling

RESPOND WITH ONLY JSON:
{
  "performanceImpact": "positive|neutral|negative|critical",
  "issues": [
    {
      "type": "algorithm|database|memory|io|scalability",
      "severity": "low|medium|high|critical",
      "description": "Performance issue identified",
      "impact": "Expected performance impact",
      "suggestion": "How to improve performance",
      "estimatedGain": "Expected improvement if fixed"
    }
  ],
  "optimizations": [
    "Performance improvements found in the code"
  ],
  "recommendations": [
    "Specific performance improvement suggestions"
  ]
}
  `.trim();
};

/**
 * Create prompt for code maintainability analysis
 * @param {Array} commits - Array of recent commits
 * @returns {string} Maintainability analysis prompt for AI
 */
export const createMaintainabilityPrompt = (commits) => {
  const recentChanges = commits.slice(0, 15);
  
  return `
Analyze code maintainability based on recent development patterns.

RECENT COMMITS (${recentChanges.length}):
${recentChanges.map((commit, index) => 
  `${index + 1}. ${commit.message} (${commit.repository || 'unknown'})`
).join('\n')}

MAINTAINABILITY FACTORS TO ANALYZE:

1. CODE ORGANIZATION:
   - Clear structure and separation of concerns
   - Consistent naming conventions
   - Appropriate file organization

2. DOCUMENTATION:
   - Code comments quality
   - README updates
   - API documentation

3. TESTING:
   - Test coverage patterns
   - Test quality and maintainability
   - Automated testing practices

4. REFACTORING PATTERNS:
   - Code cleanup activities
   - Technical debt reduction
   - Architecture improvements

5. COMPLEXITY MANAGEMENT:
   - Function/method size
   - Cyclomatic complexity
   - Dependency management

RESPOND WITH ONLY JSON:
{
  "maintainabilityScore": 0.75,
  "strengths": [
    "Areas where maintainability is good"
  ],
  "concerns": [
    {
      "category": "organization|documentation|testing|complexity",
      "severity": "low|medium|high",
      "description": "Specific maintainability concern",
      "suggestion": "How to improve"
    }
  ],
  "trends": {
    "improving": ["Areas that are getting better"],
    "declining": ["Areas that need attention"]
  },
  "recommendations": [
    "Specific actions to improve maintainability"
  ]
}
  `.trim();
};

/**
 * Create prompt for code review quality assessment
 * @param {Array} commits - Array of commits
 * @returns {string} Code review quality prompt for AI
 */
export const createCodeReviewQualityPrompt = (commits) => {
  const reviewableCommits = commits.filter(commit => 
    commit.message && commit.message.length > 10
  );

  return `
Assess the quality of code review practices based on commit patterns.

COMMITS FOR REVIEW ANALYSIS (${reviewableCommits.length}):
${reviewableCommits.map(commit => 
  `- ${commit.message}${commit.author ? ` (${commit.author.name})` : ''}`
).join('\n')}

REVIEW QUALITY INDICATORS:

1. COMMIT MESSAGE QUALITY:
   - Descriptive and informative
   - Follows conventional format
   - Explains what and why

2. COMMIT SIZE AND SCOPE:
   - Atomic commits (single responsibility)
   - Appropriate size for review
   - Logical grouping of changes

3. DEVELOPMENT PATTERNS:
   - Regular small commits vs large dumps
   - Feature branch patterns
   - Bug fix patterns

4. COLLABORATION INDICATORS:
   - Multiple contributors
   - Review-related commits
   - Issue references

RESPOND WITH ONLY JSON:
{
  "reviewQualityScore": 0.75,
  "commitQuality": {
    "averageMessageLength": 45,
    "conventionalFormatUsage": 60,
    "atomicCommitsPercentage": 80
  },
  "patterns": {
    "goodPractices": [
      "Practices that support good code review"
    ],
    "concerns": [
      "Patterns that hinder effective code review"
    ]
  },
  "recommendations": [
    "Suggestions to improve code review quality"
  ]
}
  `.trim();
}; 