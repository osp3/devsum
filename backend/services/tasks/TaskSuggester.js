import connectDB from '../../config/database.js';
import PromptBuilder from '../prompts/PromptBuilder.js';
import { TaskSuggestion } from '../../models/aiModels.js';
import { callOpenAI, defaultOptions } from '../ai/OpenAIClientManager.js';
import { parseTaskResponse, createWorkSignature } from '../ai/AIResponseParser.js';
import { generateTasks as fallbackTasks } from '../ai/AIFallbackStrategies.js';

/**
 * Task Suggester - Functional Pattern
 * Handles AI-powered task suggestion generation with caching
 */

let initialized = false;
let promptBuilder = null;

/**
 * Initialize the suggester (lazy initialization)
 */
const init = async () => {
  if (!initialized) {
    await connectDB();
    promptBuilder = new PromptBuilder();
    initialized = true;
    console.log('Task Suggester initialized');
  }
};

/**
 * Generate task suggestions based on recent commits
 * @param {Array} recentCommits - Array of recent commit objects
 * @param {string} repositoryId - Repository identifier
 * @param {string} userApiKey - User's OpenAI API key
 * @param {string} userModel - User's preferred model
 * @param {boolean} forceRefresh - Force regeneration
 * @returns {Promise<Array>} Array of task suggestions
 */
export const generateTaskSuggestions = async (recentCommits, repositoryId, userApiKey, userModel = 'gpt-4o-mini', forceRefresh = false) => {
  await init();

  try {
    // Create work signature for caching
    const workSignature = createWorkSignature(recentCommits);

    // Check for recent similar analysis unless force refresh requested
    if (!forceRefresh) {
      const recentSuggestion = await TaskSuggestion.findOne({
        repositoryId: repositoryId,
        workSignature: workSignature,
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
      }).lean();

      if (recentSuggestion) {
        // Validate that cached tasks have required fields
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

    // Generate new suggestions with AI
    console.log(`📋 TaskSuggester: Generating task suggestions based on ${recentCommits.length} recent commits`);
    const prompt = promptBuilder.createTaskPrompt(recentCommits);
    const aiResponse = await callOpenAI(prompt, userApiKey, userModel, defaultOptions.taskSuggestion);
    const tasks = parseTaskResponse(aiResponse);

    // Add metadata to tasks
    const enhancedTasks = tasks.map(task => ({
      ...task,
      basedOn: task.basedOn || 'recent_commits',
      repositories: task.repositories || [repositoryId],
      generatedAt: new Date().toISOString(),
      workSignature: workSignature
    }));

    // Store in database for future requests
    await storeTaskSuggestions(repositoryId, workSignature, enhancedTasks, recentCommits);

    console.log(`Generated ${enhancedTasks.length} new task suggestions`);
    return enhancedTasks;
  } catch (error) {
    console.error('Task generation failed:', error.message);
    return fallbackTasks(recentCommits);
  }
};

/**
 * Get task suggestion history for a repository
 * @param {string} repositoryId - Repository identifier
 * @param {number} days - Number of days to look back
 * @returns {Promise<Array>} Historical task suggestions
 */
export const getTaskHistory = async (repositoryId, days = 7) => {
  await init();
  
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    const suggestions = await TaskSuggestion.find({
      repositoryId: repositoryId,
      createdAt: { $gte: cutoffDate }
    })
    .sort({ createdAt: -1 })
    .lean();

    return suggestions.map(suggestion => ({
      date: suggestion.createdAt.toISOString().split('T')[0],
      tasks: suggestion.tasks,
      baseCommitCount: suggestion.baseCommits?.length || 0,
      workSignature: suggestion.workSignature
    }));
  } catch (error) {
    console.error('Failed to get task history:', error.message);
    return [];
  }
};

/**
 * Get task suggestions by priority
 * @param {string} repositoryId - Repository identifier
 * @param {string} priority - Priority level (high, medium, low)
 * @param {number} limit - Maximum number of tasks to return
 * @returns {Promise<Array>} Tasks filtered by priority
 */
export const getTasksByPriority = async (repositoryId, priority = 'high', limit = 10) => {
  await init();
  
  try {
    const recentSuggestions = await TaskSuggestion.find({
      repositoryId: repositoryId,
      createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // Last 7 days
    })
    .sort({ createdAt: -1 })
    .limit(5) // Get recent suggestion sets
    .lean();

    // Extract and filter tasks by priority
    const allTasks = [];
    recentSuggestions.forEach(suggestion => {
      const filteredTasks = suggestion.tasks.filter(task => 
        task.priority === priority
      );
      allTasks.push(...filteredTasks);
    });

    // Remove duplicates based on title and return limited results
    const uniqueTasks = allTasks.filter((task, index, self) =>
      index === self.findIndex(t => t.title === task.title)
    );

    return uniqueTasks.slice(0, limit);
  } catch (error) {
    console.error('Failed to get tasks by priority:', error.message);
    return [];
  }
};

/**
 * Get task statistics for a repository
 * @param {string} repositoryId - Repository identifier
 * @param {number} days - Number of days to analyze
 * @returns {Promise<Object>} Task statistics
 */
export const getTaskStats = async (repositoryId, days = 30) => {
  await init();
  
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    const suggestions = await TaskSuggestion.find({
      repositoryId: repositoryId,
      createdAt: { $gte: cutoffDate }
    }).lean();

    const allTasks = suggestions.flatMap(s => s.tasks);
    const totalTasks = allTasks.length;
    
    // Analyze by priority
    const priorityCount = allTasks.reduce((acc, task) => {
      acc[task.priority] = (acc[task.priority] || 0) + 1;
      return acc;
    }, {});
    
    // Analyze by category
    const categoryCount = allTasks.reduce((acc, task) => {
      const category = task.category || 'general';
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {});
    
    // Analyze estimated times
    const estimatedTimes = allTasks
      .map(task => task.estimatedTime)
      .filter(time => time && typeof time === 'string');
    
    return {
      totalSuggestions: suggestions.length,
      totalTasks,
      priorities: priorityCount,
      categories: categoryCount,
      avgTasksPerSuggestion: suggestions.length > 0 ? Math.round(totalTasks / suggestions.length) : 0,
      periodStart: cutoffDate.toISOString().split('T')[0],
      periodEnd: new Date().toISOString().split('T')[0],
      commonEstimatedTimes: getMostCommonEstimatedTimes(estimatedTimes)
    };
  } catch (error) {
    console.error('Failed to get task stats:', error.message);
    return {
      totalSuggestions: 0,
      totalTasks: 0,
      priorities: {},
      categories: {},
      avgTasksPerSuggestion: 0,
      periodStart: null,
      periodEnd: null,
      commonEstimatedTimes: []
    };
  }
};

/**
 * Clean up old task suggestions
 * @param {number} days - Days to keep
 * @returns {Promise<number>} Number of deleted suggestions
 */
export const cleanupOldTaskSuggestions = async (days = 30) => {
  await init();
  
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    const result = await TaskSuggestion.deleteMany({
      createdAt: { $lt: cutoffDate }
    });

    console.log(`🧹 Cleaned up ${result.deletedCount} old task suggestions (older than ${days} days)`);
    return result.deletedCount;
  } catch (error) {
    console.error('Failed to cleanup old task suggestions:', error.message);
    return 0;
  }
};

/**
 * Store task suggestions in database
 * @param {string} repositoryId - Repository identifier
 * @param {string} workSignature - Work signature for caching
 * @param {Array} tasks - Array of task objects
 * @param {Array} recentCommits - Base commits for suggestions
 * @returns {Promise<void>}
 */
const storeTaskSuggestions = async (repositoryId, workSignature, tasks, recentCommits) => {
  try {
    await TaskSuggestion.create({
      repositoryId: repositoryId,
      workSignature: workSignature,
      tasks: tasks,
      baseCommits: recentCommits.map(c => c.sha || c.id)
    });
  } catch (error) {
    console.error('Failed to store task suggestions:', error.message);
    // Don't throw - task generation succeeded, storage failure shouldn't break the flow
  }
};

/**
 * Get most common estimated times from tasks
 * @param {Array} estimatedTimes - Array of estimated time strings
 * @returns {Array} Most common estimated times
 */
const getMostCommonEstimatedTimes = (estimatedTimes) => {
  const timeCount = estimatedTimes.reduce((acc, time) => {
    acc[time] = (acc[time] || 0) + 1;
    return acc;
  }, {});
  
  return Object.entries(timeCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([time, count]) => ({ time, count }));
}; 