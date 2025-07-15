/** Wokrflow Integration
 * Git data import -> PromptBuilder structuresd for AI analysis -> AI responses ->
 * PromptBuilder parses into application data -> Dashboard Display -> PromptBuilder insights
 * -> User actions -> PromptBuilder generates improvement suggestions
 */

class PromptBuilder {
  constructor() {
  }

  createWorkSignature(commits) {
    //signature of recent work patterns for smart caching
    const categories = this.groupByCategory(commits); //step 1 Organize commits into logical categories
    const signature = Object.keys(categories) //Step 2 Create signature - organize alphabetical order
      .sort().map(cat => `${cat}:${categories[cat].length}`)
      .join('|');

    return signature;
  }

  createCategorizationPrompt(commits) { //Prompt for categorizing git commits by type
    const commitList = commits.map((commit, index) => //Create numbered list for AI analysis
    `${index + 1}. ${commit.message}`
  ).join('\n');
  return `
  Analyze these git commmit messages and categorize each one.
  
  Categories:
  -feature: new functionality, additions, enhancements
  -bugfix: fixing errors, bugs, issues
  -refactor: code imrovements, cleanup, optimization
  -docs: documentation, README, comments
  -other: configuration, build, misc
  
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
  }

    createSummaryPrompt(commits) {
      const categories = this.groupByCategory(commits); //check what level of analysis data is available
      const hasAIAnalysis = commits.some(c => c.aiAnalysis); //detection of analysis data
  
      if (hasAIAnalysis) {
        return this._createEnhancedSummaryPrompt(commits, categories);
      } else {
        return this._createBasicSummaryPrompt(commits, categories);
      }
    }

    _createEnhancedSummaryPrompt(commits, categories) {
      const commitsWithAI = commits.filter(c => c.aiAnalysis); //separate AI analyzed from basic commits
      const commitsWithoutAI = commits.filter(c => !c.aiAnalysis);
      
      const totalRepositories = new Set(commits.map(c => c.repository)).size; //repo analysis
      
      const aiAnalysisSection = commitsWithAI.length > 0 ? `
AI-ANALYZED COMMITS (${commitsWithAI.length} commits):
${commitsWithAI.map(c => `
- Original: "${c.message}"
- AI Suggested: "${c.aiAnalysis.suggestedMessage}"
- Description: ${c.aiAnalysis.suggestedDescription}
- Analysis: ${c.aiAnalysis.commitAnalysis}
- Quality Impact: ${c.aiAnalysis.confidence > 0.7 ? 'High' : c.aiAnalysis.confidence > 0.5 ? 'Medium' : 'Low'}
- Repository: ${c.repository}`).join('\n')}
      `.trim() : '';

      const basicCommitsSection = commitsWithoutAI.length > 0 ? `
ADDITIONAL COMMITS (${commitsWithoutAI.length} commits):
${Object.entries(this.groupByCategory(commitsWithoutAI)).map(([cat, commits]) =>
  `${cat.toUpperCase()}: ${commits.length} commits\n${commits.map(c => `- ${c.message} (${c.repository})`).join('\n')}`
).join('\n\n')}
      `.trim() : '';

      //instructions for AI comprehensive analysis
      return `
Generate a comprehensive daily development summary based on AI analysis of individual commits.

OVERVIEW: ${commits.length} total commits across ${totalRepositories} repositories

${aiAnalysisSection}

${basicCommitsSection}

SUMMARY REQUIREMENTS:
1. Synthesize the AI analysis to highlight key developments and patterns
2. Focus on actual code changes and their impact (not just commit messages)
3. Group related work across repositories when relevant
4. Mention code quality insights from AI analysis
5. Highlight significant features, fixes, or improvements
6. Keep it professional but engaging

Write a 4-6 sentence summary that captures:
- Most impactful changes based on AI analysis
- Overall development patterns and focus areas
- Code quality and improvement trends
- Cross-repository work coordination if applicable

Start with "Yesterday's development work focused on..." and provide actionable insights.
      `.trim();
    }
    //Generate Summaries when only commit messages are available - used when no diff available
    _createBasicSummaryPrompt(commits, categories) {
      return `
      Generate a brief, friendly daily summary of development work.
      
      YESTERDAY'S COMMITS:
      ${Object.entries(categories).map(([cat, commits]) =>
        `${cat.toUpperCase()}: ${commits.length} commits\n${commits.map(c => `- ${c.message}`).join('\n')}`
      ).join('\n\n')}
      
      Write a 2-3 sentence summary focusing on:
      -main accomplishments
      -types of work done
      -Overall progress
      
      Keep it positive and professional. Start with "Today you..."
      `.trim();
    }
    //cretae next step suggestions
    createTaskPrompt(commits) {
      const hasAIAnalysis = commits.some(c => c.aiAnalysis); //check for AI analysis availability

      if (hasAIAnalysis) { //choose appropriate task gen strategy (enhanced path vs basic path)
        return this._createEnhancedTaskPrompt(commits);
      } else {
        return this._createBasicTaskPrompt(commits);
      }
    }
    //Generate AI task suggestions using diff analysis
    _createEnhancedTaskPrompt(commits) {
      const commitsWithAI = commits.filter(c => c.aiAnalysis); //Separate AI-analyzed from basic commits
      const commitsWithoutAI = commits.filter(c => !c.aiAnalysis);
      
      const totalRepositories = new Set(commits.map(c => c.repository)).size; //multi repo development scope
      
      const aiAnalysisSection = commitsWithAI.length > 0 ? `
DETAILED AI ANALYSIS OF YESTERDAY'S COMMITS (${commitsWithAI.length} commits):
${commitsWithAI.map((c, index) => `
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

  //additional commits without AI analysis
  const basicCommitsSection = commitsWithoutAI.length > 0 ? `
ADDITIONAL COMMITS (${commitsWithoutAI.length} commits):
${commitsWithoutAI.map(c => `- ${c.message} (${c.repository})`).join('\n')}
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
}

_createBasicTaskPrompt(commits) {
  const recentWork = commits.slice(0, 10).map(c => c.message).join('\n- '); //extract patterns from recent commits

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
}

    createQualityPrompt(commits) {
      // Group commits by category for better AI analysis
      // Instead of a random list, AI sees organized patterns
      const commitsByCategory = commits.reduce((groups, commit) => {
        const category = commit.category || 'other';
        if (!groups[category]) groups[category] = [];
        groups[category].push(commit.message);
        return groups;
      }, {});
        //format for AI - Show category patterns
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
    }

    //Comprehensive code review of individual commits with git diff
    createCodeAnalysisPrompt(commit, diff) {
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
    }

    createCommitAnalysisPrompt(commit, diff) {
      const maxDiffLength = 2000;
      const truncatedDiff = diff.length > maxDiffLength
        ? diff.slice(0, maxDiffLength) + '\n... (diff truncated for analysis)'
        : diff;

      return `You are a senior developer analyzing a git commit. Provide a comprehensive analysis including a suggested conventional commit message and description.

COMMIT INFO:
Original Message: "${commit.message || 'No message'}"
SHA: ${commit.sha?.substring(0, 7)}
Author: ${commit.author?.name || 'Unknown'}
Date: ${commit.date || 'Unknown'}

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
    }

    groupByCategory(commits) {
      return commits.reduce((groups, commit) => {
        const category = commit.category || 'other'; //default for unclassified commits
        if (!groups[category]) groups[category] = []; // intialize category array if needed
        groups[category].push(commit); //add commit to appropriate category
        return groups; //return accumulator for next iteration
      }, {});
    }

    //Organize commits by category
    createCommitMessagePrompt(diffContent, currentMessage) {
      const maxDiffLength = 1500;
      const truncatedDiff = diffContent.length > maxDiffLength
        ? diffContent.slice(0, maxDiffLength) + '\n... (diff truncated for analysis)'
        : diffContent;

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
    -feat: add user authentication with JWT tokens
    -fix: resolve memory leak in data processing loop
    -docs: update API documentation for auth endpoints
    -refactor: extract user validation into separate service
    
    Respond with ONLY the improved commit message, nothing else.
      `.trim();
    }

     parseResponse(commits, aiResponse) {
      try {
        const parsed = JSON.parse(aiResponse);
  
        return commits.map((commit, index) => {
          const analysis = parsed.analysis?.find(a => a.index === index + 1);
  
          return {
            ...commit,
            category: analysis?.category || 'other',
            confidence: analysis?.confidence || 0.5,
            aiReason: analysis?.reason || 'Auto-categorized'
          };
        });
      } catch (error) {
        console.error('Failed to parse AI response:', error.message);
        throw new Error('Failed to parse AI response');
      }
    }
  
    parseTaskResponse(aiResponse) {
      try {
        const parsed = JSON.parse(aiResponse);
        const tasks = parsed.tasks || [];
        
        // Validate and ensure each task has required fields
        return tasks.map((task, index) => {
          // Ensure all required fields are present
          const validatedTask = {
            title: task.title || `Task ${index + 1}`,
            description: task.description || 'No description provided',
            priority: task.priority || 'medium',
            category: task.category || 'feature',
            estimatedTime: task.estimatedTime || '1-2 hours',
            basedOn: task.basedOn || 'AI analysis of yesterday\'s commits and development patterns',
            repositories: task.repositories || ['devsum']
          };
          
          // Log if fields were missing for debugging
          if (!task.basedOn) {
            console.warn(`Task "${task.title}" missing basedOn field - added default`);
          }
          if (!task.repositories) {
            console.warn(`Task "${task.title}" missing repositories field - added default`);
          }
          
          return validatedTask;
        });
      } catch (error) {
        console.error('Failed to parse task response:', error.message);
        return [];
      }
    }
    cleanCommitSuggestion(suggestion) {
      return suggestion
        .trim()
        .replace(/^["']|["']$/g, '') //remove quotes
        .replace(/\n.*/, '') //take only first line
        .slice(0, 72); //git commit message best practice limit
    }
  }
  export default PromptBuilder;