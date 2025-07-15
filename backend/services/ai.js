import OpenAI from 'openai';
import dotenv from 'dotenv';
import connectDB from '../config/database.js';
import PromptBuilder from './PromptBuilder.js';
import CacheManager from './CacheManager.js';
import QualityAnalyzer from './QualityAnalyzer.js';
import EnvironmentService from './EnvironmentService.js';
import { CommitAnalysis, DailySummary, TaskSuggestion, QualityAnalysis } from '../models/aiModels.js';

dotenv.config();

// Initialize OpenAI client with environment service
let openai = null;
const initializeOpenAI = async () => {
  try {
    const apiKey = await EnvironmentService.get('OPENAI_API_KEY');
    if (apiKey) {
      openai = new OpenAI({ apiKey });
      console.log('OpenAI client initialized with API key from database/env');
    } else {
      console.warn('OPENAI_API_KEY not found in database or env; using fallback AI responses.');
    }
  } catch (error) {
    console.error('Failed to initialize OpenAI client:', error);
    console.warn('Using fallback AI responses.');
  }
};

// OpenAI will be initialized in the init() method to ensure proper async handling

class AIService {
  constructor() {
    this.initialized = false;
    this.promptBuilder = new PromptBuilder();
    this.cacheManager = new CacheManager();
    this.qualityAnalyzer = new QualityAnalyzer(openai, this._callOpenAI.bind(this), this.promptBuilder);
  }
//**'lazy initialization' - avoids connecting to database until actually needed.
// faster startup, better resource management
// flow: check if already initialized (prevent duplicate connections)
// connect to mongodb through connectdb utility
// set initialized flag to true
// log success message */
  async init() {
    if (!this.initialized) {
      await connectDB();
      // Ensure OpenAI client is initialized
      await initializeOpenAI();
      this.initialized = true;
      console.log('AI Service initialized with Mongoose models');
    }
  }

  // Reinitialize OpenAI client when settings are updated
  async reinitializeOpenAI() {
    await initializeOpenAI();
    // Update the quality analyzer with new openai client
    this.qualityAnalyzer = new QualityAnalyzer(openai, this._callOpenAI.bind(this), this.promptBuilder);
    console.log('OpenAI client reinitialized');
  }

  // Categorize commits with MongoDB caching
  // 1. Check if commits already analyzed 2. Only send new commits to OpenAI
  // 3. Store results in MongoDB 4. Return combined results
  //batch processing reduces api calls, persistent caching eliminated redundant analysis, and fallback ensures system never fails completely
  async categorizeCommits(commits) {
    await this.init(); // Ensure DB connection
    console.log(`Analyzing ${commits.length} commits...`);

    try {
      // step 1 cache lookup - check which commits have already been analyzed
      const commitHashes = commits.map(c => c.sha); //extract unique commit identifiers
      const existingAnalysis = await CommitAnalysis.find({ 
        commitHash: { $in: commitHashes } //mongodb query find docs where commitHash is in array
      }).lean(); //lean() returns plain JS objects (faster, less memory)

      // step 2 create lookup map, conver array to hashmap for 0(1) lookups
      const analyzed = new Map();
      existingAnalysis.forEach(result => {
        analyzed.set(result.commitHash, result); // map commitHash -> analysis  result
      });

      // step 3 identify work needed - filter commits requiring ai analysis
      const unanalyzedCommits = commits.filter(commit => !analyzed.has(commit.sha));
      console.log(`Found ${existingAnalysis.length} cached, analyzing ${unanalyzedCommits.length} new commits`);

      // step 4 AI analysis - only process unanalyzed commits (cost optimization)
      let newAnalysis = [];
      if (unanalyzedCommits.length > 0) {
        newAnalysis = await this._analyzeWithOpenAI(unanalyzedCommits);
        
        // step 5 persistent caching store results for future use
        await this.cacheManager.storeAnalysis(newAnalysis);
      }

      // step 6 merge results - combine cached + fresh analysis
      const allResults = commits.map(commit => {
        const cached = analyzed.get(commit.sha); //try cache first
        if (cached) {
          return { // return cached result wit original commit data
            ...commit,
            category: cached.category,
            confidence: cached.confidence,
            aiReason: cached.reason,
            analyzedAt: cached.analyzedAt
          };
        }
        //return fresh analysis or fallback 
        const fresh = newAnalysis.find(a => a.sha === commit.sha);
        return fresh || { ...commit, category: 'other', confidence: 0.5 };
      });

      console.log(`Analysis complete: ${allResults.length} commits categorized`);
      return allResults;
    } catch (error) { //fallabck if AI fails, use keyword-based categorization 
      console.error('AI analysis failed:', error.message);
      return this._fallbackCategorization(commits);
    }
  }
  // Generate daily summary with MongoDB caching by date
  /**flow:
   * generate cache key from date and repository
   * check mongodb for existing summary
   * if found return cached summary
   * if not found generate with AI
   * store in MongoDb with metadata
   * return generated summary
   */
  async generateDailySummary(commits, repositoryId, date = new Date(), forceRefresh = false) {
    await this.init(); // Ensure DB connection
    const dateStr = date.toISOString().split('T')[0]; // convert to yyyy-mm-dd

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
      const summary = await this._callOpenAI(prompt);
      console.log(`🤖 AIService: Fresh summary generated - Preview: "${summary.substring(0, 100)}..."`);

      // Store in MongoDB (replace existing if force refresh was used)
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
      return this._fallbackSummary(commits); //simple fallback summary
    }
  }
  // Generate task suggestions with caching
  async generateTaskSuggestions(recentCommits, repositoryId, forceRefresh = false) {
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
          // Validate cached tasks have required fields (basedOn and repositories)
          const tasksHaveRequiredFields = recentSuggestion.tasks.every(task => 
            task.basedOn && task.repositories && Array.isArray(task.repositories)
          );
          
          if (tasksHaveRequiredFields) {
            console.log('Using recent task suggestions with all required fields');
            return recentSuggestion.tasks;
          } else {
            console.log('Cached tasks missing required fields (basedOn/repositories) - generating fresh suggestions');
            // Continue to generate new suggestions with proper schema
          }
        }
      } else {
        console.log('Force refresh requested - bypassing cache for task suggestions');
      }

      // Generate new suggestions
      console.log(`📋 AI Tasks: Generating task suggestions based on ${recentCommits.length} recent commits`);
      const prompt = this.promptBuilder.createTaskPrompt(recentCommits);
      const aiResponse = await this._callOpenAI(prompt);
      const tasks = this.promptBuilder.parseTaskResponse(aiResponse);

      // Persistent storage, cache with metadata
      await TaskSuggestion.create({
        repositoryId: repositoryId,
        workSignature: workSignature,
        tasks: tasks,
        baseCommits: recentCommits.map(c => c.sha) //track which commits influenced suggestions
      });

      console.log(`Generated ${tasks.length} new task suggestions`);
      return tasks;
    } catch (error) {
      console.error('Task generation failed:', error.message);
      return this._fallbackTasks(recentCommits); //simple fallback tasks
    }
  }
  /**Commit message improvement
   * process: 
   * take git diff content
   * take current commit message (if any)
   * send both to AI for analysis
   * AI suggests improved message following conventions
   * return comparison with improvement metrics
   * Quality Assessment:
   * conventional format (feat:, fix:, docs:, etc.)
   * descriptiveness (longer, more specific)
   * context awareness (based on actual code changes)
   */
  async suggestCommitMessage(diffContent, currentMessage = '', repositoryId = null) {
    await this.init();
    console.log(`💬 AI Commit: Suggesting commit message (diff: ${diffContent.length} chars, original: "${currentMessage || 'none'}")`);

    try {
      //AI analysis to create improved commit message
      const prompt = this.promptBuilder.createCommitMessagePrompt(diffContent, currentMessage);
      const suggestion = await this._callOpenAI(prompt);
      const cleanSuggestion = this.promptBuilder.cleanCommitSuggestion(suggestion);
      const isImproved = this._isMessageImproved(currentMessage, cleanSuggestion);

      console.log(`Suggestion generated: "${cleanSuggestion}"`);

      //return analysis  include original, suggested, and improvement metrics
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
  //provide historical insights and trend analysis, passes to cacheManager for optimized querying
  async getAnalysisHistory(repositoryId, days = 30) {
  await this.init(); // Ensure DB connection
  return await this.cacheManager.getAnalysisHistory(repositoryId, days);
  }

  //code quality analysis
  //provide deep analysis of code quality trends
  //qualityanalyzer handles complex analysis
  async analyzeCodeQuality(commits, repositoryId, timeframe = 'weekly', repositoryFullName = null) {
  await this.init(); // Ensure DB connection
  return await this.qualityAnalyzer.analyzeCodeQuality(commits, repositoryId, timeframe, repositoryFullName);
  }

  //quality trend analysis
  //track code quality improvements/degradation over time
  //qualityanalyzer provides trend analysis
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


  
  //private methods
  /** build structured prompt for commit categorization
   * send to openai API
   * parse response into structured data
   * handle parsing errors gracefully
   * error handling falls back to keyword based analysis
   */
  async _analyzeWithOpenAI(commits) {
    console.log(`🔍 AI Analysis: Categorizing ${commits.length} commits`);
    const prompt = this.promptBuilder.createCategorizationPrompt(commits);
    const aiResponse = await this._callOpenAI(prompt);

    try {
      return this.promptBuilder.parseResponse(commits, aiResponse);
    } catch (error) {
      console.error('Failed to parse AI response:', error.message);
      return this._fallbackCategorization(commits);
    }
  }


  /**Commit grouping utility
   * reduce pattern for grouping
   * input: array of commits wiht category property
   * output: object with category keys and commit arrays as values
   */
  _groupByCategory(commits) {
    return commits.reduce((groups, commit) => {
      const category = commit.category || 'other';
      if (!groups[category]) groups[category] = [];
      groups[category].push(commit);
      return groups;
    }, {});
  }

  /** OpenAI communication/details
   * model, temp(randomness), max tokens, and system message(ai context ie developer assistant)
   * throws error for upstream handling
   */
  async _callOpenAI(prompt) {
    if (!openai) {
      throw new Error('OpenAI client not confugured');
    }
    try {
      // Read model from database first, fall back to .env, then default
      const model = await EnvironmentService.get('OPENAI_MODEL', 'gpt-4o-mini');
      
      // Debug logging to show which model is being used
      console.log(`🤖 OpenAI Request: Sending prompt to model "${model}"`);
      console.log(`🤖 Prompt preview: "${prompt.substring(0, 150)}..."`);
      
      const response = await openai.chat.completions.create({
        model: model,
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
      console.log(`✅ OpenAI Response: Received ${responseText.length} characters from "${model}"`);
      console.log(`✅ Response preview: "${responseText.substring(0, 100)}..."`);
      return responseText;
    } catch (error) {
      console.error(`❌ OpenAI API call failed with model "${await EnvironmentService.get('OPENAI_MODEL', 'gpt-4o-mini')}":`, error.message);
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

  // Analyze individual commit diff with AI
  /**
   * combine commit metadata (author, timestamp, message) with git diff - both sent to AI for analysis
   * return structured analysis with improvement suggestions
   * Input: commit object + diff string
   * processing: AI ananlysis via specialized prompts
   * output: structured analysis object with multiple insights
   * flow: Input(commit object + gitdiff string) -> Validation(ensure database connection established) ->
   * Logging(log analysis start with commit sha and diff size) -> Prompt(build AI prompt combining commit + diff) ->
   * AI call(send to OpenAI for contextual analysis) -> Parsing(parse AI JSON response into strucutred data) ->
   * Logging(log completion with usggested message preview) -> Output(return comprehensive analysis object) ->
   * Fallback(if any step failsm use heuristic analysis)
   */
  async analyzeCommitDiff(commit, diff) {
    await this.init(); // establish db connection if not already done
    console.log(`🔍 AI Diff Analysis: Analyzing commit ${commit.sha?.substring(0, 7)} (diff: ${diff.length} chars)`);

    try {
      const prompt = this.promptBuilder.createCommitAnalysisPrompt(commit, diff); //Step1 prompt construction
      const analysis = await this._callOpenAI(prompt); //Step 2 AI analysis request
      const parsedAnalysis = this._parseCommitAnalysis(analysis); //Step 3 response parsing

      console.log(`Analysis complete for ${commit.sha?.substring(0, 7)}: ${parsedAnalysis.suggestedMessage}`);
      
      return { //Step 4 strucuted response construction
        diffSize: diff.length, //raw size of changes
        suggestedMessage: parsedAnalysis.suggestedMessage, //AI improvements - better commit message
        suggestedDescription: parsedAnalysis.description, //detailed change description
        commitAnalysis: parsedAnalysis.analysis, //AI analysis of changes
        confidence: parsedAnalysis.confidence, //AI's confidence level (0-1)
        analysisDate: new Date().toISOString() //timestamp for tracking
      };
    } catch (error) {
      console.error(`Failed to analyze commit ${commit.sha?.substring(0, 7)}:`, error.message);
      return this._fallbackCommitAnalysis(commit, diff);
    }
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