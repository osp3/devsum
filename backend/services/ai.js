import OpenAI from 'openai';
import dotenv from 'dotenv';
import connectDB from '../config/database.js';
import PromptBuilder from './PromptBuilder.js';
import CacheManager from './CacheManager.js';
import QualityAnalyzer from './QualityAnalyzer.js';
import EnvironmentService from './EnvironmentService.js';
import { CommitAnalysis, DailySummary, TaskSuggestion, QualityAnalysis } from '../models/aiModels.js';

dotenv.config();

class AIService {
  constructor() {
    this.initialized = false;
    this.promptBuilder = new PromptBuilder();
    this.cacheManager = new CacheManager();
    this.githubService = null; // Will be set when needed
  }

  // Set GitHubService instance for authenticated API calls
  setGitHubService(githubService) {
    this.githubService = githubService;
  }

  /**
   * Create OpenAI client with user-specific API key
   * @param {string} userApiKey - User's OpenAI API key
   * @param {string} userModel - User's preferred OpenAI model
   * @returns {OpenAI} OpenAI client instance
   */
  _createOpenAIClient(userApiKey, userModel = 'gpt-4o-mini') {
    if (!userApiKey) {
      throw new Error('User OpenAI API key is required');
    }
    return new OpenAI({ apiKey: userApiKey });
  }

  /**
   * Lazy initialization - avoids connecting to database until actually needed.
   * Faster startup, better resource management
   */
  async init() {
    if (!this.initialized) {
      await connectDB();
      this.initialized = true;
      console.log('AI Service initialized with Mongoose models');
    }
  }

  // Categorize commits with MongoDB caching
  async categorizeCommits(commits, userApiKey, userModel = 'gpt-4o-mini') {
    await this.init(); // Ensure DB connection
    console.log(`Analyzing ${commits.length} commits with user's API key...`);

    try {
      // Step 1: Cache lookup - check which commits have already been analyzed
      const commitHashes = commits.map(c => c.sha);
      const existingAnalysis = await CommitAnalysis.find({ 
        commitHash: { $in: commitHashes }
      }).lean();

      // Step 2: Create lookup map
      const analyzed = new Map();
      existingAnalysis.forEach(result => {
        analyzed.set(result.commitHash, result);
      });

      // Step 3: Identify work needed
      const unanalyzedCommits = commits.filter(commit => !analyzed.has(commit.sha));
      console.log(`Found ${existingAnalysis.length} cached, analyzing ${unanalyzedCommits.length} new commits`);

      // Step 4: AI analysis - only process unanalyzed commits
      let newAnalysis = [];
      if (unanalyzedCommits.length > 0) {
        newAnalysis = await this._analyzeWithOpenAI(unanalyzedCommits, userApiKey, userModel);
        
        // Step 5: Persistent caching
        await this.cacheManager.storeAnalysis(newAnalysis);
      }

      // Step 6: Merge results
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
  async generateDailySummary(commits, repositoryId, userApiKey, userModel = 'gpt-4o-mini', date = new Date(), forceRefresh = false) {
    await this.init(); // Ensure DB connection
    const dateStr = date.toISOString().split('T')[0];

    try {
      // Check for cached summary for this day (unless force refresh requested)
      if (!forceRefresh) {
        const existing = await DailySummary.findOne({
          date: dateStr,
          repositoryId: repositoryId
        }).lean();

        if (existing) {
          console.log(`📦 AIService: Using CACHED summary for ${dateStr} (repositoryId: ${repositoryId})`);
          console.log(`📦 AIService cache hit - Summary preview: "${existing.summary.substring(0, 100)}..."`);
          return existing.summary;
        } else {
          console.log(`📦 AIService: No cached summary found for ${dateStr} - will generate fresh`);
        }
      } else {
        console.log(`🔄 AIService: Force refresh requested - bypassing cache for ${dateStr} (repositoryId: ${repositoryId})`);
      }

      // Generate new summary
      console.log(`🤖 AIService: Generating FRESH daily summary for ${dateStr} with ${commits.length} commits (repositoryId: ${repositoryId})`);
      const prompt = this.promptBuilder.createSummaryPrompt(commits);
      const summary = await this._callOpenAI(prompt, userApiKey, userModel);
      console.log(`🤖 AIService: Fresh summary generated - Preview: "${summary.substring(0, 100)}..."`);

      // Store in MongoDB
      await DailySummary.findOneAndUpdate(
        { date: dateStr, repositoryId: repositoryId },
        {
          date: dateStr,
          repositoryId: repositoryId,
          summary: summary,
          commitCount: commits.length,
          categories: this._groupByCategory(commits)
        },
        { upsert: true, new: true }
      );

      console.log(`💾 AIService: Fresh daily summary stored in cache for ${dateStr}`);
      return summary;
    } catch (error) {
      console.error('Summary generation failed:', error.message);
      return this._fallbackSummary(commits);
    }
  }

  // Generate task suggestions with caching
  async generateTaskSuggestions(recentCommits, repositoryId, userApiKey, userModel = 'gpt-4o-mini', forceRefresh = false) {
    await this.init(); // Ensure DB connection

    try {
      // Create signature of recent work
      const workSignature = this.promptBuilder.createWorkSignature(recentCommits);

      // Check for recent similar analysis (unless force refresh requested)
      if (!forceRefresh) {
        const recentSuggestion = await TaskSuggestion.findOne({
          repositoryId: repositoryId,
          workSignature: workSignature,
          createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
        }).lean();

        if (recentSuggestion) {
          const tasksHaveRequiredFields = recentSuggestion.tasks.every(task => 
            task.basedOn && task.repositories && Array.isArray(task.repositories)
          );
          
          if (tasksHaveRequiredFields) {
            console.log('Using recent task suggestions with all required fields');
            return recentSuggestion.tasks;
          } else {
            console.log('Cached tasks missing required fields (basedOn/repositories) - generating fresh suggestions');
          }
        }
      } else {
        console.log('Force refresh requested - bypassing cache for task suggestions');
      }

      // Generate new suggestions
      console.log(`📋 AI Tasks: Generating task suggestions based on ${recentCommits.length} recent commits`);
      const prompt = this.promptBuilder.createTaskPrompt(recentCommits);
      const aiResponse = await this._callOpenAI(prompt, userApiKey, userModel);
      const tasks = this.promptBuilder.parseTaskResponse(aiResponse);

      // Persistent storage
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

  // Commit message improvement
  async suggestCommitMessage(diffContent, userApiKey, userModel = 'gpt-4o-mini', currentMessage = '', repositoryId = null) {
    await this.init();
    console.log(`💬 AI Commit: Suggesting commit message (diff: ${diffContent.length} chars, original: "${currentMessage || 'none'}")`);

    try {
      const prompt = this.promptBuilder.createCommitMessagePrompt(diffContent, currentMessage);
      const suggestion = await this._callOpenAI(prompt, userApiKey, userModel);
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

  // Code quality analysis
  async analyzeCodeQuality(commits, repositoryId, userApiKey, userModel = 'gpt-4o-mini', timeframe = 'weekly', repositoryFullName = null) {
    await this.init(); // Ensure DB connection
    
    // Create quality analyzer with user-specific API key
    const openai = this._createOpenAIClient(userApiKey, userModel);
    const qualityAnalyzer = new QualityAnalyzer(
      openai, 
      (prompt) => this._callOpenAI(prompt, userApiKey, userModel), 
      this.promptBuilder, 
      this.githubService
    );
    
    return await qualityAnalyzer.analyzeCodeQuality(commits, repositoryId, timeframe, repositoryFullName);
  }

  // Quality trend analysis
  async getQualityTrends(repositoryId, userApiKey, userModel = 'gpt-4o-mini', days = 30) {
    await this.init(); // Ensure DB connection
    
    // Create quality analyzer with user-specific API key
    const openai = this._createOpenAIClient(userApiKey, userModel);
    const qualityAnalyzer = new QualityAnalyzer(
      openai, 
      (prompt) => this._callOpenAI(prompt, userApiKey, userModel), 
      this.promptBuilder, 
      this.githubService
    );
    
    return await qualityAnalyzer.getQualityTrends(repositoryId, days);
  }

  // Analyze individual commit diff with AI
  async analyzeCommitDiff(commit, diff, userApiKey, userModel = 'gpt-4o-mini') {
    await this.init();
    console.log(`🔍 AI Diff Analysis: Analyzing commit ${commit.sha?.substring(0, 7)} (diff: ${diff.length} chars)`);

    try {
      const prompt = this.promptBuilder.createCommitAnalysisPrompt(commit, diff);
      const analysis = await this._callOpenAI(prompt, userApiKey, userModel);
      const parsedAnalysis = this._parseCommitAnalysis(analysis);

      console.log(`Analysis complete for ${commit.sha?.substring(0, 7)}: ${parsedAnalysis.suggestedMessage}`);
      
      return {
        diffSize: diff.length,
        suggestedMessage: parsedAnalysis.suggestedMessage,
        suggestedDescription: parsedAnalysis.description,
        commitAnalysis: parsedAnalysis.analysis,
        confidence: parsedAnalysis.confidence,
        analysisDate: new Date().toISOString()
      };
    } catch (error) {
      console.error(`Failed to analyze commit ${commit.sha?.substring(0, 7)}:`, error.message);
      return this._fallbackCommitAnalysis(commit, diff);
    }
  }

  // Private methods
  async _analyzeWithOpenAI(commits, userApiKey, userModel) {
    console.log(`🔍 AI Analysis: Categorizing ${commits.length} commits`);
    const prompt = this.promptBuilder.createCategorizationPrompt(commits);
    const aiResponse = await this._callOpenAI(prompt, userApiKey, userModel);

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

  /**
   * OpenAI communication with user-specific API key
   */
  async _callOpenAI(prompt, userApiKey, userModel = 'gpt-4o-mini') {
    if (!userApiKey) {
      throw new Error('User OpenAI API key is required');
    }

    try {
      const openai = this._createOpenAIClient(userApiKey, userModel);
      
      console.log(`🤖 OpenAI Request: Sending prompt to model "${userModel}" with user's API key`);
      console.log(`🤖 Prompt preview: "${prompt.substring(0, 150)}..."`);
      
      const response = await openai.chat.completions.create({
        model: userModel,
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
      
      const responseText = response.choices[0].message.content.trim();
      console.log(`✅ OpenAI Response: Received ${responseText.length} characters from "${userModel}"`);
      console.log(`✅ Response preview: "${responseText.substring(0, 100)}..."`);
      return responseText;
    } catch (error) {
      console.error(`❌ OpenAI API call failed with model "${userModel}":`, error.message);
      throw error;
    }
  }

  /**Commit message quality assessment
   * criteria for improvement:
   * conventional format, descriptiveness, original is basic.
   * if no original any suggestion is improvement
   * compare lengths
   * detect basic/lazy messages
   */
  _isMessageImproved(original, suggested) {
    if (!original || original.trim().length === 0) {
      return true;
    }

    const hasConventionalFormat = /^(feat|fix|docs|style|refactor|test|chore)(\(.+\))?:/.test(suggested);
    const isMoreDescriptive = suggested.length > original.length + 10;
    const originalIsBasic = /^(fix|update|change|wip)$/i.test(original.trim());

    return hasConventionalFormat || isMoreDescriptive || originalIsBasic;
  }

  /**fallback commit message suggestion
   * rule based analysis when AI unavailable
   * analyze diff content for keywords, determine commit type, generate conventional format message, use original message if available
   * Detection rules: 'test'/'spec' -> docs: type, 'README'/'docs' -> docs: type, 'fix'/'bug' -> fix: type, 'function'/'class' -> feat: type, Default -> chore: type
   * 
   */
  _fallbackCommitSuggestion(currentMessage, diffContent) {
    console.log('Using fallback commit message suggestion');

    let suggestedType = 'chore';
    let description = 'update code';

    //rule based type detection
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

    //generate conventional format message
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

  /** */
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

  /**fallback daily summary
   * simple template based summary when AI unavailable
   * group commits by category, count total commits, list category names, generate encouraging message
   */
  _fallbackSummary(commits) {
    const categories = this._groupByCategory(commits);
    const total = commits.length;

    return `Yesterday you made ${total} commits across different areas ${Object.keys(categories).join(', ')}. Keep up the great work!`;
  }

  _fallbackTasks(commits) {
    return [
      {
        title: 'Review recent changes',
        description: "Look over yesterday's commits and plan next steps",
        priority: "medium",
        estimatedTime: "30 minutes"
      }
    ];
  }

  // Parse commit analysis response
  _parseCommitAnalysis(response) {
    try {
      const parsed = JSON.parse(response); //parse AI JSON response
      return {
        suggestedMessage: parsed.suggestedMessage || 'chore: update code', //xommir message improvement
        description: parsed.description || 'Code changes made', //detailed descriptions
        analysis: parsed.analysis || 'Commit analyzed', //detailed descriptions
        confidence: parsed.confidence || 0.5, //moderate confidence
        impact: parsed.impact || 'low', //soncervative impact estimate
        quality: parsed.quality || 'medium' //quality assessment
      };
    } catch (error) {
      console.error('Failed to parse commit analysis:', error.message); //Fallback parsing if JSON parse fails
      return { //return valid structure with conservative values
        suggestedMessage: 'chore: update code', //valid conventional format
        description: 'Code changes made', 
        analysis: 'Unable to analyze commit', 
        confidence: 0.3,
        impact: 'low',
        quality: 'unknown' // cannot asses without parsing
      };
    }
  }

  // Fallback commit analysis
  //always availablw, fast execution, consistent results, better than no analysis.
  //not as accurate as AI, no actual code comparison
  _fallbackCommitAnalysis(commit, diff) {
    const diffSize = diff.length;
    const message = commit.message || 'No message';
    
    // Simple heuristics for fallback analysis
    let suggestedType = 'chore';
    let description = 'Code changes made';
    
    if (message.toLowerCase().includes('fix') || message.toLowerCase().includes('bug')) {
      suggestedType = 'fix';
      description = 'Bug fixes and corrections';
    } else if (message.toLowerCase().includes('feat') || message.toLowerCase().includes('add')) {
      suggestedType = 'feat';
      description = 'New feature or functionality added';
    } else if (message.toLowerCase().includes('refactor') || message.toLowerCase().includes('clean')) {
      suggestedType = 'refactor';
      description = 'Code refactoring and improvements';
    } else if (message.toLowerCase().includes('doc')) {
      suggestedType = 'docs';
      description = 'Documentation updates';
    } else if (message.toLowerCase().includes('test')) {
      suggestedType = 'test';
      description = 'Testing updates';
    }

    return {
      diffSize,
      suggestedMessage: `${suggestedType}: ${message.split('\n')[0].slice(0, 50)}`,
      suggestedDescription: description,
      commitAnalysis: `Fallback analysis: ${suggestedType} commit with ${diffSize} characters of changes`,
      confidence: 0.4,
      analysisDate: new Date().toISOString()
    };
  }
}

export default new AIService();