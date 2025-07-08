import OpenAI from 'openai';
import dotenv from 'dotenv';
import connectDB from '../config/database.js';
import { CommitAnalysis, DailySummary, TaskSuggestion } from '../models/aiModels.js';

dotenv.config();

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

class AIService {
  constructor() {
    this.initialized = false;
    this.init();
  }

  async init() {
    if (!this.initialized) {
      await connectDB();
      this.initialized = true;
      console.log('✅ AI Service initialized with Mongoose models');
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
        await this._storeAnalysis(newAnalysis);
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
      const prompt = this._createSummaryPrompt(commits);
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
      const workSignature = this._createWorkSignature(recentCommits);

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
      const prompt = this._createTaskPrompt(recentCommits);
      const aiResponse = await this._callOpenAI(prompt);
      const tasks = this._parseTaskResponse(aiResponse);

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

  // Get analysis history
  async getAnalysisHistory(repositoryId, days = 30) {
    await this.init(); // Ensure DB connection
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const history = await DailySummary.find({
      repositoryId: repositoryId,
      createdAt: { $gte: since }
    })
    .sort({ date: -1 })
    .lean();

    return history;
  }
  //methods
  async _analyzeWithOpenAI(commits) {
    const prompt = this._createCategorizationPrompt(commits);
    const aiResponse = await this._callOpenAI(prompt);
    return this._parseResponse(commits, aiResponse);
  }
  async _storeAnalysis(analyzedCommits) {
    const docs = analyzedCommits.map(commit => ({
      commitHash: commit.sha,
      message: commit.message,
      category: commit.category,
      confidence: commit.confidence,
      reason: commit.aiReason,
      date: commit.date
    }));

    if (docs.length > 0) {
      await CommitAnalysis.insertMany(docs);
      console.log(`Stored ${docs.length} analysis results in MongoDB`);
    }
  }

  _createWorkSignature(commits) {
    //signature of recent work patterns for smart caching
    const categories = this._groupByCategory(commits);
    const signature = Object.keys(categories)
      .sort().map(cat => `${cat}:${categories[cat].length}`)
      .join('|');

    return signature;
  }

  _createCategorizationPrompt(commits) {
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

    _createSummaryPrompt(commits) {
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
  
    _createTaskPrompt(commits) {
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
  
    _parseResponse(commits, aiResponse) {
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
        return this._fallbackCategorization(commits);
      }
    }
  
    _parseTaskResponse(aiResponse) {
      try {
        const parsed = JSON.parse(aiResponse);
        return parsed.tasks || [];
      } catch (error) {
        console.error('Failed to parse task response:', error.message);
        return [];
      }
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