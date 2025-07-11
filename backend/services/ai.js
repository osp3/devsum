import OpenAI from 'openai';
import dotenv from 'dotenv';
import connectDB from '../config/database.js';
import GitHubService from './github.js';
import PromptBuilder from './PromptBuilder.js';
import CacheManager from './CacheManager.js';
import QualityAnalyzer from './QualityAnalyzer.js';
import { formatDailyCommits, generateCommitListSummary } from '../utils/commitFormatter.js';
import { CommitAnalysis, DailySummary, TaskSuggestion, QualityAnalysis } from '../models/aiModels.js';

dotenv.config();

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

class AIService {
  constructor() {
    this.initialized = false;
    this.promptBuilder = new PromptBuilder();
    this.cacheManager = new CacheManager();
    this.qualityAnalyzer = new QualityAnalyzer(openai, this._callOpenAI.bind(this));
  }

  async init() {
    if (!this.initialized) {
      await connectDB();
      this.initialized = true;
      console.log('AI Service initialized with Mongoose models');
    }
  }

  // Categorize commits with MongoDB caching
  // 1. Check if commits already analyzed 2. Only send new commits to OpenAI
  // 3. Store results in MongoDB 4. Return combined results
  async categorizeCommits(commits) {
    await this.init(); // Ensure DB connection
    console.log(`Analyzing ${commits.length} commits...`);

    try {
      // Check which commits have already been analyzed
      const commitHashes = commits.map(c => c.sha);
      const existingAnalysis = await CommitAnalysis.find({ 
        commitHash: { $in: commitHashes } 
      }).lean();

      // Create map of existing results
      const analyzed = new Map();
      existingAnalysis.forEach(result => {
        analyzed.set(result.commitHash, result);
      });

      // Find commits that need analysis
      const unanalyzedCommits = commits.filter(commit => !analyzed.has(commit.sha));
      console.log(`Found ${existingAnalysis.length} cached, analyzing ${unanalyzedCommits.length} new commits`);

      // Analyze new commits with AI
      let newAnalysis = [];
      if (unanalyzedCommits.length > 0) {
        newAnalysis = await this._analyzeWithOpenAI(unanalyzedCommits);
        
        // Store new analysis in MongoDB
        await this.cacheManager.storeAnalysis(newAnalysis);
      }

      // Combine cached + new results
      const allResults = commits.map(commit => {
        const cached = analyzed.get(commit.sha);
        if (cached) {
          return {
            ...commit,
            category: cached.category,
            confidence: cached.confidence,
            aiReason: cached.reason,
            analyzedAt: cached.analyzedAt
          };
        }
        const fresh = newAnalysis.find(a => a.sha === commit.sha);
        return fresh || { ...commit, category: 'other', confidence: 0.5 };
      });

      console.log(`Analysis complete: ${allResults.length} commits categorized`);
      return allResults;
    } catch (error) {
      console.error('AI analysis failed:', error.message);
      return this._fallbackCategorization(commits);
    }
  }
  // Generate daily user summary across all repositories with MongoDB caching by date
  async generateDailyUserSummary(userId, accessToken, date = new Date()) {
    await this.init(); // Ensure DB connection
    const dateStr = date.toISOString().split('T')[0]; // yyyy-mm-dd

    try {
      // Check for cached summary for this user and day
      const existing = await DailySummary.findOne({
        date: dateStr,
        userId: userId
      }).lean();

      if (existing && existing.summary) {
        console.log(`Using cached user summary for ${dateStr}`);
        
        // Since we updated the schema, cached results won't have formatted commits
        // We need to regenerate them from the stored repositories data
        let formattedCommits = null;
        
        if (existing.repositories && existing.repositories.length > 0) {
          console.log('Regenerating formatted commits from cached data...');
          
          // We need to fetch fresh commits to generate formatted data
          // since cached data doesn't contain full commit details
          try {
            const githubService = new GitHubService(accessToken);
            const { commits } = await githubService.getAllUserCommitsForDate(date, {
              maxRepos: 50,
              maxCommitsPerRepo: 10
            });
            
            if (commits.length > 0) {
              formattedCommits = formatDailyCommits(commits);
              console.log(`Regenerated ${formattedCommits.total} formatted commits`);
            }
          } catch (error) {
            console.error('Failed to regenerate formatted commits:', error.message);
            formattedCommits = { total: 0, byRepository: {}, allCommits: [] };
          }
        }
        
        return {
          summary: existing.summary,
          commitCount: existing.commitCount,
          repositoryCount: existing.repositoryCount,
          repositories: existing.repositories,
          formattedCommits: formattedCommits || { total: 0, byRepository: {}, allCommits: [] }
        };
      }

      // Fetch commits from all user repositories for this date
      console.log(`Generating cross-repository summary for user ${userId} on ${dateStr}...`);
      const githubService = new GitHubService(accessToken);
      const { commits, repositories, stats } = await githubService.getAllUserCommitsForDate(date, {
        maxRepos: 50,
        maxCommitsPerRepo: 10
      });

      if (commits.length === 0) {
        const fallbackSummary = `No commits found across your repositories for ${dateStr}. Take a well-deserved break! 🎉`;
        
        // Still cache the empty result to avoid repeated API calls
        await DailySummary.create({
          date: dateStr,
          userId: userId,
          summary: fallbackSummary,
          commitCount: 0,
          repositoryCount: 0,
          repositories: [],
          categories: {}
        });

        return {
          summary: fallbackSummary,
          commitCount: 0,
          repositoryCount: 0,
          repositories: [],
          formattedCommits: []
        };
      }

      // Format commits in conventional commit format instead of AI generation
      console.log(`Formatting ${commits.length} commits in conventional format...`);
      console.log('Sample commit structure:', JSON.stringify(commits[0], null, 2));
      
      let formattedCommitData;
      try {
        formattedCommitData = formatDailyCommits(commits);
        console.log('Formatted commit data:', formattedCommitData ? 'Success' : 'Failed - returned null');
      } catch (error) {
        console.error('Error formatting commits:', error.message);
        formattedCommitData = { total: 0, byRepository: {}, allCommits: [] };
      }
      
      const summary = generateCommitListSummary(commits, repositories);

      // Group commits by category for analysis (keep for compatibility)
      const categories = this._groupByCategory(commits);

      // Store in MongoDB
      const savedSummary = await DailySummary.create({
        date: dateStr,
        userId: userId,
        summary: summary,
        commitCount: commits.length,
        repositoryCount: repositories.length,
        repositories: repositories,
        categories: categories
      });

      console.log(`Daily commit list generated: ${commits.length} commits from ${repositories.length} repositories`);
      
      return {
        summary: summary,
        commitCount: commits.length,
        repositoryCount: repositories.length,
        repositories: repositories,
        formattedCommits: formattedCommitData
      };

    } catch (error) {
      console.error('User summary generation failed:', error.message);
      return this._fallbackUserSummary(userId, date);
    }
  }

  // Fallback summary for when generation fails
  _fallbackUserSummary(userId, date) {
    const dateStr = date.toISOString().split('T')[0];
    return {
      summary: `Unable to generate commit list for ${dateStr}. Please try again later.`,
      commitCount: 0,
      repositoryCount: 0,
      repositories: [],
      formattedCommits: []
    };
  }
  // Generate task suggestions with caching
  async generateTaskSuggestions(recentCommits, repositoryId) {
    await this.init(); // Ensure DB connection

    try {
      // Create signature of recent work
      const workSignature = this.promptBuilder.createWorkSignature(recentCommits);

      // Check for recent similar analysis
      const recentSuggestion = await TaskSuggestion.findOne({
        repositoryId: repositoryId,
        workSignature: workSignature,
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
      }).lean();

      if (recentSuggestion) {
        console.log('Using recent task suggestions');
        return recentSuggestion.tasks;
      }

      // Generate new suggestions
      console.log('Generating new task suggestions...');
      const prompt = this.promptBuilder.createTaskPrompt(recentCommits);
      const aiResponse = await this._callOpenAI(prompt);
      const tasks = this.promptBuilder.parseTaskResponse(aiResponse);

      // Store suggestions
      await TaskSuggestion.create({
        repositoryId: repositoryId,
        workSignature: workSignature,
        tasks: tasks,
        baseCommits: recentCommits.map(c => c.sha)
      });

      console.log(`Generated ${tasks.length} new task suggestions`);
      return tasks;
    } catch (error) {
      console.error('Task generation failed:', error.message);
      return this._fallbackTasks(recentCommits);
    }
  }
  async suggestCommitMessage(diffContent, currentMessage = '', repositoryId = null) {
    await this.init();
    console.log(`Generating commit message suggestion...`);

    try {
      const prompt = this.promptBuilder.createCommitMessagePrompt(diffContent, currentMessage);
      const suggestion = await this._callOpenAI(prompt);
      const cleanSuggestion = this.promptBuilder.cleanCommitSuggestion(suggestion);
      const isImproved = this._isMessageImproved(currentMessage, cleanSuggestion);

      console.log(`Suggestion generated: "${cleanSuggestion}"`);

      return {
        original: currentMessage,
        suggested: cleanSuggestion,
        improved: isImproved,
        analysis: {
          diffSize: diffContent.length,
          hasOriginal: !!currentMessage,
          generatedAt: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error('Commit message suggestion failed:', error.message);
      return this._fallbackCommitSuggestion(currentMessage, diffContent);
    }
  }

  // Get analysis history
  async getAnalysisHistory(repositoryId, days = 30) {
  await this.init(); // Ensure DB connection
  return await this.cacheManager.getAnalysisHistory(repositoryId, days);
  }

  /**
   * Format commits with AI-powered conventional commit format and concise summaries
   * Analyzes commit diffs to generate accurate conventional commit format
   */
  async formatCommitsWithAI(commits, repositoryFullName, accessToken) {
    await this.init();
    console.log(`🤖 AI formatting ${commits.length} commits for ${repositoryFullName}...`);

    try {
      const formattedCommits = [];
      const githubService = new (await import('./github.js')).default(accessToken);

      // Limit to prevent excessive API calls and AI costs
      const commitsToAnalyze = commits.slice(0, 20);

      for (const commit of commitsToAnalyze) {
        try {
          console.log(`📝 Processing commit ${commit.sha?.substring(0, 7)}...`);
          
          // Get commit diff
          const [owner, repo] = repositoryFullName.split('/');
          const commitDiff = await githubService.getCommitDiff(owner, repo, commit.sha);
          
          // Generate AI-powered conventional commit format
          const aiFormatting = await this._generateConventionalCommit(commit, commitDiff);
          
          formattedCommits.push({
            ...commit,
            aiGenerated: {
              type: aiFormatting.type,
              scope: aiFormatting.scope,
              description: aiFormatting.description,
              formatted: aiFormatting.formatted,
              summary: aiFormatting.summary,
              confidence: aiFormatting.confidence
            },
            original: {
              message: commit.message,
              sha: commit.sha,
              author: commit.author,
              date: commit.date || commit.author?.date
            }
          });

          // Small delay to respect rate limits
          await new Promise(resolve => setTimeout(resolve, 200));

        } catch (error) {
          console.error(`❌ Failed to format commit ${commit.sha?.substring(0, 7)}:`, error.message);
          
          // Fallback formatting
          const fallbackFormatting = this._fallbackConventionalCommit(commit);
          formattedCommits.push({
            ...commit,
            aiGenerated: fallbackFormatting,
            original: {
              message: commit.message,
              sha: commit.sha,
              author: commit.author,
              date: commit.date || commit.author?.date
            }
          });
        }
      }

      console.log(`✅ AI formatting complete: ${formattedCommits.length} commits processed`);
      return formattedCommits;

    } catch (error) {
      console.error('AI commit formatting failed:', error.message);
      
      // Return commits with fallback formatting
      return commits.map(commit => ({
        ...commit,
        aiGenerated: this._fallbackConventionalCommit(commit),
        original: {
          message: commit.message,
          sha: commit.sha,
          author: commit.author,
          date: commit.date || commit.author?.date
        }
      }));
    }
  }

  /**
   * Generate AI-powered conventional commit format from commit and diff
   */
  async _generateConventionalCommit(commit, commitDiff) {
    try {
      const prompt = this.promptBuilder.createConventionalCommitPrompt(commit, commitDiff);
      
      const response = await this._callOpenAI(prompt, {
        temperature: 0.3, // More consistent output
        max_tokens: 200   // Concise responses
      });

      return this._parseConventionalCommitResponse(response, commit);

    } catch (error) {
      console.error('AI conventional commit generation failed:', error.message);
      return this._fallbackConventionalCommit(commit);
    }
  }

  /**
   * Parse AI response for conventional commit format
   */
  _parseConventionalCommitResponse(response, commit) {
    try {
      const cleaned = this.promptBuilder._cleanJsonResponse(response);
      const parsed = JSON.parse(cleaned);

      return {
        type: parsed.type || 'chore',
        scope: parsed.scope || null,
        description: parsed.description || commit.message?.split('\n')[0]?.substring(0, 80) || 'Code changes',
        formatted: parsed.formatted || `${parsed.type || 'chore'}${parsed.scope ? `(${parsed.scope})` : ''}: ${parsed.description || 'Code changes'}`,
        summary: parsed.summary || 'Code changes without detailed analysis',
        confidence: Math.min(Math.max(parsed.confidence || 0.7, 0), 1) // Clamp between 0-1
      };
    } catch (error) {
      console.error('Failed to parse conventional commit response:', error.message);
      return this._fallbackConventionalCommit(commit);
    }
  }

  /**
   * Fallback conventional commit formatting when AI fails
   */
  _fallbackConventionalCommit(commit) {
    const message = commit.message || 'Code changes';
    const firstLine = message.split('\n')[0];
    
    // Simple heuristic-based type detection
    let type = 'chore';
    let scope = null;
    let description = firstLine;

    // Check for existing conventional format
    const conventionalMatch = firstLine.match(/^(\w+)(\(.+\))?\s*:\s*(.+)/);
    if (conventionalMatch) {
      type = conventionalMatch[1];
      scope = conventionalMatch[2] ? conventionalMatch[2].slice(1, -1) : null;
      description = conventionalMatch[3];
    } else {
      // Heuristic type detection
      const lowerMessage = firstLine.toLowerCase();
      if (lowerMessage.includes('fix') || lowerMessage.includes('bug') || lowerMessage.includes('error')) {
        type = 'fix';
      } else if (lowerMessage.includes('add') || lowerMessage.includes('new') || lowerMessage.includes('implement')) {
        type = 'feat';
      } else if (lowerMessage.includes('update') || lowerMessage.includes('change') || lowerMessage.includes('modify')) {
        type = 'refactor';
      } else if (lowerMessage.includes('doc') || lowerMessage.includes('readme')) {
        type = 'docs';
      } else if (lowerMessage.includes('test')) {
        type = 'test';
      } else if (lowerMessage.includes('style') || lowerMessage.includes('format')) {
        type = 'style';
      }
      
      description = firstLine.substring(0, 80);
    }

    const formatted = scope ? `${type}(${scope}): ${description}` : `${type}: ${description}`;

    return {
      type,
      scope,
      description,
      formatted,
      summary: `Fallback formatting applied to: ${firstLine.substring(0, 100)}`,
      confidence: 0.3
    };
  }

  async analyzeCodeQuality(commits, repositoryId, timeframe = 'weekly', repositoryFullName = null) {
  await this.init(); // Ensure DB connection
  return await this.qualityAnalyzer.analyzeCodeQuality(commits, repositoryId, timeframe, repositoryFullName);
  }

  async getQualityTrends(repositoryId, days = 30) {
  await this.init(); // Ensure DB connection
  return await this.qualityAnalyzer.getQualityTrends(repositoryId, days);
  }

  //? Could help with extra features we may want to add
/**
 * ENHANCED CODE QUALITY ANALYSIS
 * 
 * Now combines commit message patterns + actual code analysis
 * 
 * FLOW:
 * 1. Analyze all commit messages for patterns (fast, cheap)
 * 2. Select most important commits for code analysis
 * 3. Get git diffs for selected commits
 * 4. Send diffs to AI for deep code quality analysis
 * 5. Combine message and code insights
 * 6. Generate comprehensive quality score and recommendations
 * 
 * @param {Array} commits - Recent commits (last 7-30 days)
 * @param {String} repositoryId - Repository identifier for caching
 * @param {String} timeframe - 'daily' or 'weekly' analysis
 * @param {String} repositoryFullName - GitHub repo name (owner/repo-name) for diff analysis
 */

//? More potential features


  
  //methods
  async _analyzeWithOpenAI(commits) {
    const prompt = this.promptBuilder.createCategorizationPrompt(commits);
    const aiResponse = await this._callOpenAI(prompt);

    try {
      return this.promptBuilder.parseResponse(commits, aiResponse);
    } catch (error) {
      console.error('Failed to parse AI response:', error.message);
      return this._fallbackCategorization(commits);
    }
  }


  _groupByCategory(commits) {
    return commits.reduce((groups, commit) => {
      const category = commit.category || 'other';
      if (!groups[category]) groups[category] = [];
      groups[category].push(commit);
      return groups;
    }, {});
  }

  async _callOpenAI(prompt) {
    const response = await openai.chat.completions.create({
      model: process.env.AI_MODEL || 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful developer assistant that analyzes code commits.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.1,
      max_tokens: 1500
    });
    return response.choices[0].message.content.trim();
  }

  _isMessageImproved(original, suggested) {
    if (!original || original.trim().length === 0) {
      return true;
    }

    const hasConventionalFormat = /^(feat|fix|docs|style|refactor|test|chore)(\(.+\))?:/.test(suggested);
    const isMoreDescriptive = suggested.length > original.length + 10;
    const originalIsBasic = /^(fix|update|change|wip)$/i.test(original.trim());

    return hasConventionalFormat || isMoreDescriptive || originalIsBasic;
  }

  _fallbackCommitSuggestion(currentMessage, diffContent) {
    console.log('Using fallback commit message suggestion');

    let suggestedType = 'chore';
    let description = 'update code';

    if (diffContent.includes('test') || diffContent.includes('spec')) {
      suggestedType = 'test';
      description = 'add or update tests';
    } else if (diffContent.includes('README') || diffContent.includes('docs/')) {
      suggestedType = 'docs';
      description = 'update documentation';
    } else if (diffContent.includes('fix') || diffContent.includes('bug')) {
      suggestedType = 'fix';
      description = 'resolve issue';
    } else if (diffContent.includes('function') || diffContent.includes('class')) {
      suggestedType = 'feat';
      description = 'add new functionality';
    }

    const fallbackSuggestion = currentMessage.trim()
      ? `${suggestedType}: ${currentMessage}`
      : `${suggestedType}: ${description}`;

    return {
      original: currentMessage,
      suggested: fallbackSuggestion,
      improved: true,
      analysis: {
        method: 'fallback',
        diffSize: diffContent.length,
        generatedAt: new Date().toISOString()
      }
    };
  }

  _fallbackCategorization(commits) {
    console.log('Using fallback keyword categorization');

    return commits.map(commit => {
      const msg = commit.message.toLowerCase();
      let category = 'other';

      if (msg.includes('fix') || msg.includes('bug') || msg.includes('error')) {
        category = 'bugfix';
      } else if (msg.includes('feat') || msg.includes('add') || msg.includes('new')) {
        category = 'feature';
      } else if (msg.includes('refactor') || msg.includes('clean') || msg.includes('improve')) {
        category = 'refactor';
      } else if (msg.includes('doc') || msg.includes('readme')) {
        category = 'docs';
      }
      
      // Ensure date field is present for CommitAnalysis model
      const commitDate = commit.author?.date || commit.date || new Date().toISOString();
      
      return {
        ...commit,
        category,
        confidence: 0.6,
        aiReason: 'Keyword-based fallback',
        date: new Date(commitDate) // Ensure date is a Date object
      };
    });
  }

  _fallbackSummary(commits) {
    const categories = this._groupByCategory(commits);
    const total = commits.length;

    return `Today you made ${total} commits across different areas ${Object.keys(categories).join(', ')}. Keep up the great work!`;
  }

  _fallbackTasks(commits) {
    return [
      {
        title: 'Review recent changes',
        description: "Look over today's commits and plan next steps",
        priority: "medium",
        estimatedTime: "30 minutes"
      }
    ];
  }
}

export default new AIService();