class PromptBuilder {
  constructor() {
  }

  createWorkSignature(commits) {
    //signature of recent work patterns for smart caching
    const categories = this._groupByCategory(commits);
    const signature = Object.keys(categories)
      .sort().map(cat => `${cat}:${categories[cat].length}`)
      .join('|');

    return signature;
  }

  /**
   * Create prompt for commit message suggestions based on diff
   */
  createCommitSuggestionPrompt(diffContent, currentMessage = '') {
    return `You are a git commit message expert. Analyze the code diff and suggest an improved commit message following conventional commit format.

**CODE DIFF:**
\`\`\`diff
${diffContent.substring(0, 2000)} ${diffContent.length > 2000 ? '... (truncated)' : ''}
\`\`\`

**CURRENT MESSAGE:** "${currentMessage}"

**TASK:** Create a better conventional commit message that:
1. Follows conventional commit format: type(scope): description
2. Is clear and descriptive but concise
3. Accurately reflects the code changes
4. Uses appropriate type (feat, fix, docs, style, refactor, test, chore)

**RESPONSE FORMAT:**
{
  "suggested": "feat(auth): add OAuth 2.0 login with GitHub",
  "reasoning": "Added new authentication feature with OAuth integration",
  "type": "feat",
  "confidence": 0.9,
  "isImprovement": true
}`;
  }

  /**
   * Create prompt for AI-powered conventional commit formatting
   */
  createConventionalCommitPrompt(commit, commitDiff) {
    const diffContent = commitDiff.files?.map(file => file.patch).join('\n') || '';
    const truncatedDiff = diffContent.substring(0, 3000); // Limit diff size for AI processing
    
    return `You are an expert Git commit analyzer. Analyze the commit data and code diff to generate proper conventional commit format and a concise summary.

**ORIGINAL COMMIT:**
- Message: "${commit.message}"
- Author: ${commit.author?.name || 'Unknown'}
- Files Changed: ${commitDiff.files?.length || 0}
- Additions: ${commitDiff.stats?.additions || 0}
- Deletions: ${commitDiff.stats?.deletions || 0}

**CODE DIFF:**
\`\`\`diff
${truncatedDiff}${diffContent.length > 3000 ? '\n... (diff truncated for analysis)' : ''}
\`\`\`

**TASK:** Analyze the actual code changes and generate:
1. Proper conventional commit type (feat, fix, docs, style, refactor, test, chore, perf, ci, build, revert)
2. Appropriate scope (component/area affected, or null if broad)
3. Clear, concise description (max 80 chars)
4. Brief summary of what the commit actually does

**RULES:**
- Type MUST accurately reflect the code changes, not just the commit message
- Scope should be specific but optional
- Description should be imperative mood ("add" not "added")
- Summary should be 1-2 sentences explaining the change

**RESPONSE FORMAT (JSON only):**
{
  "type": "feat",
  "scope": "auth",
  "description": "add OAuth 2.0 login with GitHub integration",
  "formatted": "feat(auth): add OAuth 2.0 login with GitHub integration",
  "summary": "Implements OAuth 2.0 authentication flow with GitHub provider, including login and logout functionality.",
  "confidence": 0.9
}`;
  }

  /**
   * Create prompt for analyzing commit messages
   */
  createCategorizationPrompt(commits) {
    const commitList = commits.map((commit, index) =>
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
  
  Respond with valid JSON only:
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
      const categories = this._groupByCategory(commits);
  
      return `
      Generate a brief, friendly daily summary of development work.
      
      TODAY'S COMMITS:
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

    createMultiRepoSummaryPrompt(commits, repositories) {
      // Group commits by repository for better organization
      const commitsByRepo = commits.reduce((acc, commit) => {
        const repoName = commit.repository.name;
        if (!acc[repoName]) {
          acc[repoName] = [];
        }
        acc[repoName].push(commit);
        return acc;
      }, {});

      // Group all commits by category for overall analysis
      const categories = this._groupByCategory(commits);

      return `
      Generate a comprehensive daily summary of development work across multiple repositories.
      
      ACTIVITY OVERVIEW:
      - Total commits: ${commits.length}
      - Repositories active: ${repositories.length}
      - Categories: ${Object.keys(categories).join(', ')}

      REPOSITORY BREAKDOWN:
      ${Object.entries(commitsByRepo).map(([repoName, repoCommits]) => 
        `${repoName} (${repoCommits.length} commits):\n${repoCommits.map(c => `  - ${c.message}`).join('\n')}`
      ).join('\n\n')}

      CATEGORY BREAKDOWN:
      ${Object.entries(categories).map(([cat, commits]) =>
        `${cat.toUpperCase()}: ${commits.length} commits\n${commits.map(c => `- ${c.message} (${c.repository.name})`).join('\n')}`
      ).join('\n\n')}
      
      Write a 3-4 sentence summary focusing on:
      - Main accomplishments across all repositories
      - Types of work done and which repositories were most active
      - Overall development progress and patterns
      - Any notable cross-repository themes or focus areas
      
      Keep it positive, professional, and insightful. Start with "Today you worked across ${repositories.length} repositories..."
      `.trim();
    }
  
    createTaskPrompt(commits) {
      const recentWork = commits.slice(0, 10).map(c => c.message).join('\n- ');
  
      return `
      Based on recent development work, suggest 3-4 priority tasks for tomorrow.
      
      RECENT COMMITS:
      - ${recentWork}
      
      Respond with valid JSON:
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
        `.trim();
    }

    groupByCategory(commits) {
      return commits.reduce((groups, commit) => {
        const category = commit.category || 'other';
        if (!groups[category]) groups[category] = [];
        groups[category].push(commit);
        return groups;
      }, {});
    }

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
        // Clean the response to handle markdown-formatted JSON
        const cleanedResponse = this._cleanJsonResponse(aiResponse);
        const parsed = JSON.parse(cleanedResponse);
  
        return commits.map((commit, index) => {
          const analysis = parsed.analysis?.find(a => a.index === index + 1);
          
          // Ensure date field is present for CommitAnalysis model
          const commitDate = commit.author?.date || commit.date || new Date().toISOString();
  
          return {
            ...commit,
            category: analysis?.category || 'other',
            confidence: analysis?.confidence || 0.5,
            aiReason: analysis?.reason || 'Auto-categorized',
            date: new Date(commitDate) // Ensure date is a Date object
          };
        });
      } catch (error) {
        console.error('Failed to parse AI response:', error.message);
        throw new Error('Failed to parse AI response');
      }
    }
  
    parseTaskResponse(aiResponse) {
      try {
        // Clean the response to handle markdown-formatted JSON
        const cleanedResponse = this._cleanJsonResponse(aiResponse);
        const parsed = JSON.parse(cleanedResponse);
        return parsed.tasks || [];
      } catch (error) {
        console.error('Failed to parse task response:', error.message);
        return [];
      }
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
    cleanCommitSuggestion(suggestion) {
      return suggestion
        .trim()
        .replace(/^["']|["']$/g, '') //remove quotes
        .replace(/\n.*/, '') //take only first line
        .slice(0, 72); //git commit message best practice limit
    }
  }
  export default PromptBuilder;