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
        return parsed.tasks || [];
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