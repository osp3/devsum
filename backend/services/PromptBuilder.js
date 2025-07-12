class PromptBuilder {
  constructor() {
  }

  createWorkSignature(commits) {
    //signature of recent work patterns for smart caching
    const categories = this.groupByCategory(commits);
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
      const categories = this.groupByCategory(commits);
      const hasAIAnalysis = commits.some(c => c.aiAnalysis);
  
      if (hasAIAnalysis) {
        return this._createEnhancedSummaryPrompt(commits, categories);
      } else {
        return this._createBasicSummaryPrompt(commits, categories);
      }
    }

    _createEnhancedSummaryPrompt(commits, categories) {
      const commitsWithAI = commits.filter(c => c.aiAnalysis);
      const commitsWithoutAI = commits.filter(c => !c.aiAnalysis);
      
      const totalRepositories = new Set(commits.map(c => c.repository)).size;
      
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

Start with "Today's development work focused on..." and provide actionable insights.
      `.trim();
    }

    _createBasicSummaryPrompt(commits, categories) {
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
  
    createTaskPrompt(commits) {
      const hasAIAnalysis = commits.some(c => c.aiAnalysis);

      if (hasAIAnalysis) {
        return this._createEnhancedTaskPrompt(commits);
      } else {
        return this._createBasicTaskPrompt(commits);
      }
    }

    _createEnhancedTaskPrompt(commits) {
      const commitsWithAI = commits.filter(c => c.aiAnalysis);
      const commitsWithoutAI = commits.filter(c => !c.aiAnalysis);
      
      const totalRepositories = new Set(commits.map(c => c.repository)).size;
      
      const aiAnalysisSection = commitsWithAI.length > 0 ? `
AI-ANALYZED COMMITS (${commitsWithAI.length} commits):
${commitsWithAI.map(c => `
- Repository: ${c.repository}
- Original Message: "${c.message}"
- AI Analysis: ${c.aiAnalysis.commitAnalysis}
- AI Suggested: "${c.aiAnalysis.suggestedMessage}"
- Description: ${c.aiAnalysis.suggestedDescription}
- Quality/Impact: ${c.aiAnalysis.confidence > 0.7 ? 'High' : c.aiAnalysis.confidence > 0.5 ? 'Medium' : 'Low'}
- Diff Size: ${c.aiAnalysis.diffSize || 'N/A'} chars`).join('\n')}
  `.trim() : '';

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
Based on the AI analysis of yesterday's commits, suggest 3-4 priority tasks for today that would:

1. **Continue Development Momentum**: Build on successful features/fixes from yesterday
2. **Address Technical Debt**: Fix issues, improve code quality, or resolve TODOs mentioned in AI analysis
3. **Optimize & Refactor**: Improve areas where AI identified low confidence or complexity
4. **Cross-Repository Coordination**: Address patterns across multiple repositories if applicable

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

Expected JSON format:
{
  "tasks": [
    {
      "title": "Fix authentication token validation",
      "description": "Address the JWT validation issues identified in yesterday's auth commits with medium confidence",
      "priority": "high",
      "category": "bugfix",
      "estimatedTime": "2-3 hours",
      "basedOn": "AI analysis of auth-related commits showing medium confidence scores",
      "repositories": ["devsum"]
    }
  ]
}

Generate exactly 3-4 tasks that are:
- Specific and actionable
- Based on actual AI analysis patterns from the commits above
- Properly prioritized (high/medium/low)
- Include realistic time estimates
- Reference the specific AI insights that inspired them
- Target the actual repositories mentioned in the commits

RESPOND WITH ONLY THE JSON OBJECT - NO OTHER TEXT.
  `.trim();
}

_createBasicTaskPrompt(commits) {
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