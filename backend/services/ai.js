import OpenAI from 'openai';
import dotenv from 'dotenv';
import connectDB from '../config/database.js';
import PromptBuilder from './PromptBuilder.js';
import CacheManager from './CacheManager.js';
import QualityAnalyzer from './QualityAnalyzer.js';
import { CommitAnalysis, DailySummary, TaskSuggestion, QualityAnalysis } from '../models/aiModels.js';

dotenv.config();

// Initialize OpenAI client
// const openai = new OpenAI({
//   apiKey: process.env.OPENAI_API_KEY
// });
//! trying new initialize for open AI, only if AI key provided(error handling)
let openai = null;
if (process.env.OPENAI._API_KEY) {
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });
} else {
  console.warn('OPENAI_API_KEY not found; using fallback AI responses.')
}

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
  // Generate daily summary with MongoDB caching by date
  async generateDailySummary(commits, repositoryId, date = new Date()) {
    await this.init(); // Ensure DB connection
    const dateStr = date.toISOString().split('T')[0]; // yyyy-mm-dd

    try {
      // Check for cached summary for this day
      const existing = await DailySummary.findOne({
        date: dateStr,
        repositoryId: repositoryId
      }).lean();

      if (existing) {
        console.log(`Using cached summary for ${dateStr}`);
        return existing.summary;
      }

      // Generate new summary
      console.log(`Generating summary for ${dateStr}...`);
      const prompt = this.promptBuilder.createSummaryPrompt(commits);
      const summary = await this._callOpenAI(prompt);

      // Store in MongoDB
      await DailySummary.create({
        date: dateStr,
        repositoryId: repositoryId,
        summary: summary,
        commitCount: commits.length,
        categories: this._groupByCategory(commits)
      });

      console.log('Daily summary generated and cached');
      return summary;
    } catch (error) {
      console.error('Summary generation failed:', error.message);
      return this._fallbackSummary(commits);
    }
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
    if (!openai) {
      throw new Error('OpenAI client not confugured');
    }
    try {
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
    } catch (error) {
      console.error('OpenAI API call failed:', error.message);
      throw error;
    }
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
      return {
        ...commit,
        category,
        confidence: 0.6,
        aiReason: 'Keyword-based fallback'
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