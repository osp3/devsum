/**
 * Commit Prompt Builder - Functional Pattern
 * Functions for creating commit-related AI prompts
 * Pure functions for reliable commit analysis prompt generation
 */

import { createNumberedCommitList, truncateDiff, formatCommitInfo } from './PromptUtils.js';

/**
 * Create prompt for categorizing git commits by type
 * @param {Array} commits - Array of commit objects
 * @returns {string} Categorization prompt for AI
 */
export const createCategorizationPrompt = (commits) => {
  const commitList = createNumberedCommitList(commits);
  
  return `
Analyze these git commit messages and categorize each one.

Categories:
- feature: new functionality, additions, enhancements
- bugfix: fixing errors, bugs, issues
- refactor: code improvements, cleanup, optimization
- docs: documentation, README, comments
- other: configuration, build, misc

Commits:
${commitList}

IMPORTANT: Respond with ONLY raw JSON. Do not use markdown code blocks or any formatting. Your response must start with { and end with }.

Return this exact JSON structure:
{
  "analysis": [
    {
      "index": 1,
      "category": "feature",
      "confidence": 0.95,
      "reason": "adds new user dashboard functionality"
    }
  ]
}
  `.trim();
};

/**
 * Create comprehensive commit analysis prompt with git diff
 * @param {Object} commit - Commit object with metadata
 * @param {string} diff - Git diff content
 * @returns {string} Analysis prompt for AI
 */
export const createCommitAnalysisPrompt = (commit, diff) => {
  const truncatedDiff = truncateDiff(diff, 2000);
  const commitInfo = formatCommitInfo(commit);

  return `You are a senior developer analyzing a git commit. Provide a comprehensive analysis including a suggested conventional commit message and description.

COMMIT INFO:
${commitInfo}

CODE CHANGES (GIT DIFF):
${truncatedDiff}

TASKS:
1. Analyze what this commit actually does
2. Suggest a better conventional commit message (format: type(scope): description)
3. Provide a clear description of the changes
4. Assess the quality/impact of the changes

CONVENTIONAL COMMIT TYPES:
- feat: new feature
- fix: bug fix
- docs: documentation
- style: formatting, missing semi-colons, etc.
- refactor: code change that neither fixes a bug nor adds a feature
- test: adding tests
- chore: updating build tasks, package manager configs, etc.

IMPORTANT: Respond using ONLY raw JSON. Do NOT use markdown code blocks. Send the JSON object directly without any backticks.

Expected JSON format:
{
  "suggestedMessage": "feat(auth): add JWT token validation middleware",
  "description": "Implements JWT token validation middleware for API route protection, including error handling and token expiration checks",
  "analysis": "This commit adds important security infrastructure by implementing JWT validation. The middleware properly handles token verification, expiration, and error cases. Good separation of concerns and error handling.",
  "confidence": 0.9,
  "impact": "medium",
  "quality": "high"
}`.trim();
};

/**
 * Create prompt for improving commit messages
 * @param {string} diffContent - Git diff content
 * @param {string} currentMessage - Current commit message
 * @returns {string} Message improvement prompt for AI
 */
export const createCommitMessagePrompt = (diffContent, currentMessage) => {
  const truncatedDiff = truncateDiff(diffContent, 1500);

  return `
You are a Git expert helping improve commit messages. Analyze the code changed and suggest a better commit message.

CURRENT MESSAGE: "${currentMessage}"

CODE CHANGES (GIT DIFF):
${truncatedDiff}

INSTRUCTIONS:
1. Follow conventional commits format: type(scope): description
2. Types: feat, fix, doc, style, refactor, test, chore
3. Be specific about what actually changed
4. Keep under 50 characters if possible
5. Focus on WHY and WHAT, not just WHAT

EXAMPLES:
- feat: add user authentication with JWT tokens
- fix: resolve memory leak in data processing loop
- docs: update API documentation for auth endpoints
- refactor: extract user validation into separate service

Respond with ONLY the improved commit message, nothing else.
  `.trim();
};

/**
 * Create prompt for analyzing individual commit code quality
 * @param {Object} commit - Commit object
 * @param {string} diff - Git diff content
 * @returns {string} Code quality analysis prompt
 */
export const createCommitCodeQualityPrompt = (commit, diff) => {
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
 * Create prompt for commit message best practices analysis
 * @param {Array} commits - Array of commit objects
 * @returns {string} Message quality analysis prompt
 */
export const createCommitMessageQualityPrompt = (commits) => {
  const messagesList = commits.map((commit, index) => 
    `${index + 1}. "${commit.message}"`
  ).join('\n');

  return `
Analyze these commit messages for quality and adherence to best practices.

COMMIT MESSAGES:
${messagesList}

EVALUATE FOR:
1. Conventional commit format usage
2. Message clarity and descriptiveness
3. Appropriate length (under 50 chars for subject)
4. Grammar and spelling
5. Use of imperative mood
6. Meaningful descriptions

PROVIDE:
- Overall quality score (0.0-1.0)
- Specific issues found
- Recommendations for improvement
- Examples of good practices observed

IMPORTANT: Respond with ONLY raw JSON. Do not use markdown code blocks.

Expected JSON format:
{
  "qualityScore": 0.75,
  "issues": [
    {
      "type": "format|clarity|length|grammar",
      "severity": "low|medium|high",
      "messageIndex": 1,
      "description": "Issue description",
      "suggestion": "How to improve"
    }
  ],
  "recommendations": [
    "Use conventional commit format",
    "Be more descriptive in commit messages"
  ],
  "goodPractices": [
    "Clear and concise descriptions",
    "Proper use of imperative mood"
  ]
}
  `.trim();
}; 