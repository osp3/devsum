/**
 * Task Prompt Builder - Functional Pattern
 * Functions for creating task suggestion AI prompts
 * Pure functions for reliable task generation prompt creation
 */

import { getTotalRepositories, separateCommitsByAnalysis } from './PromptUtils.js';

/**
 * Create task prompt - chooses between enhanced and basic based on available data
 * @param {Array} commits - Array of commit objects
 * @returns {string} Task generation prompt for AI
 */
export const createTaskPrompt = (commits) => {
  const { hasAIAnalysis } = separateCommitsByAnalysis(commits);

  if (hasAIAnalysis) {
    return createEnhancedTaskPrompt(commits);
  } else {
    return createBasicTaskPrompt(commits);
  }
};

/**
 * Create enhanced task prompt using AI analysis data
 * @param {Array} commits - Array of commit objects with AI analysis
 * @returns {string} Enhanced task generation prompt for AI
 */
export const createEnhancedTaskPrompt = (commits) => {
  const { analyzed, unanalyzed } = separateCommitsByAnalysis(commits);
  const totalRepositories = getTotalRepositories(commits);
  
  const aiAnalysisSection = analyzed.length > 0 ? `
DETAILED AI ANALYSIS OF YESTERDAY'S COMMITS (${analyzed.length} commits):
${analyzed.map((c, index) => `
COMMIT ${index + 1} [${c.sha?.substring(0, 7)}]:
- Repository: ${c.repository}
- Original Message: "${c.message || c.description}"
- AI Analysis: ${c.aiAnalysis.commitAnalysis}
- AI Suggested Better Message: "${c.aiAnalysis.suggestedMessage}"
- AI Description: ${c.aiAnalysis.suggestedDescription}
- Code Quality/Impact: ${c.aiAnalysis.confidence > 0.8 ? 'High Quality' : c.aiAnalysis.confidence > 0.6 ? 'Medium Quality' : 'Needs Improvement'}
- Confidence Score: ${c.aiAnalysis.confidence}
- Diff Size: ${c.aiAnalysis.diffSize || 'N/A'} characters
- Analysis Date: ${c.aiAnalysis.analysisDate}`).join('\n')}
`.trim() : '';

  const basicCommitsSection = unanalyzed.length > 0 ? `
ADDITIONAL COMMITS (${unanalyzed.length} commits):
${unanalyzed.map(c => `- ${c.message} (${c.repository})`).join('\n')}
`.trim() : '';

  return `
You are a senior developer analyzing yesterday's development work to suggest intelligent tasks for today.

YESTERDAY'S DEVELOPMENT OVERVIEW:
${commits.length} total commits across ${totalRepositories} repositories

${aiAnalysisSection}

${basicCommitsSection}

TASK GENERATION INSTRUCTIONS:
Based on the detailed AI analysis above, generate 3-4 specific, actionable tasks for today. Each task should be directly inspired by the AI analysis insights:

1. **Build on AI-Identified Strengths**: Continue work on areas where AI analysis showed high confidence and good practices
2. **Address AI-Identified Issues**: Fix problems, inconsistencies, or areas marked as "Needs Improvement" by AI analysis
3. **Complete AI-Suggested Improvements**: Implement the AI's suggested better messages, descriptions, and code enhancements
4. **Resolve Quality Concerns**: Focus on commits with lower confidence scores or large diff sizes that need attention
5. **Follow AI Recommendations**: Address specific suggestions from the AI analysis (error handling, refactoring, testing, etc.)

CRITICAL: Each task must reference the specific AI analysis that inspired it. Use the actual commit analysis text, confidence scores, and AI suggestions as the foundation for your tasks.

PRIORITIZATION CRITERIA:
- HIGH: Critical bugs, security issues, or blocking features
- MEDIUM: Feature improvements, code quality enhancements, testing
- LOW: Documentation, minor refactoring, housekeeping

TASK CATEGORIES:
- feature: New functionality or enhancements
- bugfix: Fix bugs or issues identified in yesterday's work
- refactor: Improve code structure based on AI analysis
- testing: Add tests for new features or fix test issues
- docs: Update documentation
- optimization: Performance improvements or code quality

CRITICAL: You MUST respond with ONLY valid JSON. Do NOT include any markdown formatting, explanations, or other text. Send the JSON object directly.

You MUST include ALL required fields in EVERY task:
- title (string): Task title
- description (string): Task description  
- priority (string): high/medium/low
- category (string): feature/bugfix/refactor/testing/docs/optimization
- estimatedTime (string): Time estimate
- basedOn (string): REQUIRED - Which specific AI analysis or commit pattern inspired this task
- repositories (array): REQUIRED - Array of repository names this task applies to

Expected JSON format:
{
  "tasks": [
    {
      "title": "Improve error handling in AuthController methods",
      "description": "Implement the AI-suggested enhancements to error handling in AuthController methods, creating more specific error messages and improving code readability as identified in commit analysis",
      "priority": "high",
      "category": "refactor",
      "estimatedTime": "2-3 hours",
      "basedOn": "AI analysis of commit f6658c4: 'This commit focuses on improving error handling within the AuthController methods. It refactors error messages to be more descriptive and enhances code readability' (confidence: 0.85)",
      "repositories": ["devsum"]
    }
  ]
}

Generate exactly 3-4 tasks that are:
- Directly inspired by the AI analysis insights from specific commits above
- Include the actual commit SHA and AI analysis text in the basedOn field
- Address the specific issues, suggestions, or improvements mentioned in the AI analysis
- Prioritized based on confidence scores and impact (low confidence = high priority)
- Include realistic time estimates based on diff size and complexity
- Reference the exact AI commitAnalysis text that inspired each task
- Target the specific repositories from the analyzed commits

CRITICAL: The basedOn field MUST quote the actual AI analysis text and include the commit SHA for traceability.

RESPOND WITH ONLY THE JSON OBJECT - NO OTHER TEXT.
`.trim();
};

/**
 * Create basic task prompt when only commit messages are available
 * @param {Array} commits - Array of commit objects
 * @returns {string} Basic task generation prompt for AI
 */
export const createBasicTaskPrompt = (commits) => {
  const recentWork = commits.slice(0, 10).map(c => c.message).join('\n- ');

  return `
Based on recent development work, suggest 3-4 priority tasks for tomorrow.

RECENT COMMITS:
- ${recentWork}

CRITICAL: You MUST respond with ONLY valid JSON. Do NOT include any markdown formatting, explanations, or other text.

Expected JSON format:
{
  "tasks": [
    {
      "title": "Fix authentication bug",
      "description": "Address login issues from recent commits",
      "priority": "high",
      "category": "bugfix",
      "estimatedTime": "2 hours"
    }
  ]
}

Priorities: high, medium, low
Categories: feature, bugfix, refactor, docs, testing

RESPOND WITH ONLY THE JSON OBJECT - NO OTHER TEXT.
  `.trim();
};

/**
 * Create prompt for sprint planning based on commit history
 * @param {Array} commits - Array of commit objects from recent sprints
 * @param {string} sprintGoal - Optional sprint goal or theme
 * @returns {string} Sprint planning prompt for AI
 */
export const createSprintPlanningPrompt = (commits, sprintGoal = '') => {
  const totalRepositories = getTotalRepositories(commits);
  const { hasAIAnalysis, analyzed } = separateCommitsByAnalysis(commits);

  const recentPatterns = commits.reduce((acc, commit) => {
    const category = commit.category || 'other';
    acc[category] = (acc[category] || 0) + 1;
    return acc;
  }, {});

  return `
Generate sprint planning tasks based on recent development patterns and goals.

SPRINT CONTEXT:
${sprintGoal ? `Sprint Goal: ${sprintGoal}` : 'General development sprint'}
Recent Activity: ${commits.length} commits across ${totalRepositories} repositories

DEVELOPMENT PATTERNS:
${Object.entries(recentPatterns).map(([category, count]) => 
  `${category.toUpperCase()}: ${count} commits (${Math.round((count / commits.length) * 100)}%)`
).join('\n')}

${hasAIAnalysis ? `
QUALITY INSIGHTS FROM AI ANALYSIS:
${analyzed.slice(0, 5).map(c => 
  `- ${c.aiAnalysis.suggestedMessage} (Quality Score: ${Math.round(c.aiAnalysis.confidence * 100)}%)`
).join('\n')}
` : ''}

RECENT WORK SAMPLES:
${commits.slice(0, 8).map((commit, index) => 
  `${index + 1}. ${commit.message} (${commit.repository})`
).join('\n')}

INSTRUCTIONS:
1. Generate 5-7 tasks that align with recent development patterns
2. Include a mix of feature work, technical debt, and quality improvements
3. Consider the sprint goal if provided
4. Balance innovation with maintenance work
5. Include realistic estimates for a 2-week sprint

TASK CATEGORIES:
- feature: New functionality aligned with sprint goals
- bugfix: Address issues identified in recent work
- refactor: Improve code quality based on patterns
- testing: Strengthen test coverage
- docs: Documentation improvements
- infrastructure: DevOps, build, deployment improvements

PRIORITY LEVELS:
- high: Must-have for sprint success
- medium: Important but can be adjusted
- low: Nice-to-have or stretch goals

RESPOND WITH ONLY JSON:
{
  "tasks": [
    {
      "title": "Task title",
      "description": "Detailed description",
      "priority": "high|medium|low",
      "category": "feature|bugfix|refactor|testing|docs|infrastructure",
      "estimatedTime": "1-2 days",
      "sprintValue": "How this contributes to sprint success",
      "repositories": ["repo1", "repo2"]
    }
  ]
}
  `.trim();
};

/**
 * Create prompt for technical debt prioritization
 * @param {Array} commits - Array of commit objects
 * @returns {string} Technical debt prioritization prompt for AI
 */
export const createTechnicalDebtPrompt = (commits) => {
  const { hasAIAnalysis, analyzed } = separateCommitsByAnalysis(commits);
  
  const debtIndicators = commits.filter(commit => {
    const message = commit.message?.toLowerCase() || '';
    return message.includes('todo') || message.includes('fixme') || 
           message.includes('hack') || message.includes('temporary') ||
           message.includes('quick fix') || message.includes('workaround');
  });

  return `
Analyze recent development work to identify and prioritize technical debt.

TECHNICAL DEBT INDICATORS FOUND:
${debtIndicators.length > 0 ? debtIndicators.map(commit => 
  `- ${commit.message} (${commit.repository})`
).join('\n') : 'No obvious debt indicators in commit messages'}

${hasAIAnalysis ? `
AI QUALITY CONCERNS:
${analyzed.filter(c => c.aiAnalysis.confidence < 0.7).map(c => 
  `- ${c.aiAnalysis.suggestedMessage}: ${c.aiAnalysis.commitAnalysis} (Score: ${Math.round(c.aiAnalysis.confidence * 100)}%)`
).join('\n')}
` : ''}

ALL RECENT COMMITS:
${commits.slice(0, 15).map(commit => 
  `- ${commit.message} (${commit.repository})`
).join('\n')}

INSTRUCTIONS:
1. Identify technical debt from commit patterns
2. Prioritize based on impact and effort
3. Consider code quality, maintainability, and security
4. Suggest specific actionable tasks
5. Estimate effort required

DEBT CATEGORIES:
- code_quality: Poor structure, duplication, complexity
- security: Vulnerabilities, unsafe practices
- performance: Inefficient algorithms, memory issues
- maintainability: Hard to understand, brittle code
- testing: Missing tests, poor coverage
- documentation: Missing or outdated docs

RESPOND WITH ONLY JSON:
{
  "technicalDebtItems": [
    {
      "title": "Refactor authentication middleware",
      "description": "Current implementation has security vulnerabilities and poor error handling",
      "category": "security",
      "priority": "high",
      "effort": "3-5 days",
      "impact": "High - affects all API endpoints",
      "repositories": ["devsum"],
      "evidenceFromCommits": ["commit SHA or pattern that indicates this debt"]
    }
  ]
}
  `.trim();
};

/**
 * Create prompt for feature completion planning
 * @param {Array} commits - Array of commit objects
 * @param {string} featureName - Name of the feature being developed
 * @returns {string} Feature completion prompt for AI
 */
export const createFeatureCompletionPrompt = (commits, featureName) => {
  const featureCommits = commits.filter(commit => 
    commit.message?.toLowerCase().includes(featureName.toLowerCase()) ||
    commit.category === 'feature'
  );

  const { hasAIAnalysis, analyzed } = separateCommitsByAnalysis(featureCommits);

  return `
Analyze progress on feature: ${featureName}

FEATURE-RELATED COMMITS (${featureCommits.length} found):
${featureCommits.map(commit => 
  `- ${commit.message} (${commit.repository})`
).join('\n')}

${hasAIAnalysis ? `
AI ANALYSIS OF FEATURE COMMITS:
${analyzed.map(c => 
  `- ${c.aiAnalysis.suggestedMessage}: ${c.aiAnalysis.commitAnalysis}`
).join('\n')}
` : ''}

OVERALL DEVELOPMENT CONTEXT:
${commits.length} total commits across repositories

INSTRUCTIONS:
1. Assess current feature completion status
2. Identify remaining work needed
3. Suggest next steps and tasks
4. Consider testing, documentation, and integration needs
5. Estimate effort to completion

COMPLETION AREAS TO CONSIDER:
- core_functionality: Main feature implementation
- testing: Unit tests, integration tests, e2e tests
- documentation: User docs, API docs, technical docs
- integration: How feature connects with existing system
- performance: Optimization and efficiency
- security: Vulnerability assessment and hardening

RESPOND WITH ONLY JSON:
{
  "featureStatus": {
    "name": "${featureName}",
    "estimatedCompletion": "60%",
    "completedAreas": ["core implementation", "basic testing"],
    "remainingWork": [
      {
        "title": "Complete user authentication flow",
        "description": "Implement password reset and email verification",
        "category": "core_functionality",
        "priority": "high",
        "estimatedTime": "2-3 days",
        "repositories": ["devsum"]
      }
    ]
  }
}
  `.trim();
}; 