/**
 * AI Response Parser - Functional Pattern
 * Parse and validate AI responses with fallback handling
 * Pure functions for reliable response processing
 */

/**
 * Parse commit analysis response from AI
 * @param {string} response - AI response text
 * @returns {Object} Parsed commit analysis
 */
export const parseCommitAnalysis = (response) => {
  try {
    const parsed = JSON.parse(response);
    return {
      suggestedMessage: parsed.suggestedMessage || 'chore: update code',
      description: parsed.description || 'Code changes made',
      analysis: parsed.analysis || 'Commit analyzed',
      confidence: Math.min(Math.max(parsed.confidence || 0.5, 0), 1), // Clamp between 0-1
      impact: parsed.impact || 'low',
      quality: parsed.quality || 'medium'
    };
  } catch (error) {
    console.error('Failed to parse commit analysis:', error.message);
    // Return valid structure with conservative values
    return {
      suggestedMessage: 'chore: update code',
      description: 'Code changes made',
      analysis: 'Unable to analyze commit',
      confidence: 0.3,
      impact: 'low',
      quality: 'unknown'
    };
  }
};

/**
 * Parse task response from AI
 * @param {string} response - AI response text
 * @returns {Array} Array of parsed tasks
 */
export const parseTaskResponse = (response) => {
  try {
    const parsed = JSON.parse(response);
    
    // Handle both array and object responses
    const tasks = Array.isArray(parsed) ? parsed : (parsed.tasks || []);
    
    return tasks.map(task => ({
      title: task.title || 'Task',
      description: task.description || 'Task description',
      priority: validatePriority(task.priority),
      estimatedTime: task.estimatedTime || '30 minutes',
      basedOn: task.basedOn || 'recent_activity',
      repositories: Array.isArray(task.repositories) ? task.repositories : ['current'],
      category: task.category || 'general',
      tags: Array.isArray(task.tags) ? task.tags : []
    }));
  } catch (error) {
    console.error('Failed to parse task response:', error.message);
    // Return default task structure
    return [{
      title: 'Review recent changes',
      description: 'Parse error occurred - fallback task created',
      priority: 'medium',
      estimatedTime: '30 minutes',
      basedOn: 'parse_error',
      repositories: ['current']
    }];
  }
};

/**
 * Parse commit categorization response from AI
 * @param {Array} commits - Original commits array
 * @param {string} aiResponse - AI response text
 * @returns {Array} Commits with AI analysis
 */
export const parseCategorizationResponse = (commits, aiResponse) => {
  try {
    const parsed = JSON.parse(aiResponse);
    
    // Handle different response formats
    const analyses = Array.isArray(parsed) ? parsed : (parsed.analyses || parsed.commits || []);
    
    return commits.map((commit, index) => {
      const analysis = analyses[index] || {};
      
      return {
        ...commit,
        category: validateCategory(analysis.category),
        confidence: Math.min(Math.max(analysis.confidence || 0.5, 0), 1),
        aiReason: analysis.reason || analysis.explanation || 'AI analysis',
        analyzedAt: new Date().toISOString()
      };
    });
  } catch (error) {
    console.error('Failed to parse categorization response:', error.message);
    // Return commits with default categorization
    return commits.map(commit => ({
      ...commit,
      category: 'other',
      confidence: 0.3,
      aiReason: 'Parse error - using fallback categorization',
      analyzedAt: new Date().toISOString()
    }));
  }
};

/**
 * Clean and validate commit message suggestion
 * @param {string} suggestion - Raw commit message suggestion
 * @returns {string} Cleaned commit message
 */
export const cleanCommitSuggestion = (suggestion) => {
  if (!suggestion || typeof suggestion !== 'string') {
    return 'chore: update code';
  }
  
  // Remove quotes and extra whitespace
  let cleaned = suggestion
    .replace(/^["']|["']$/g, '') // Remove surrounding quotes
    .trim();
  
  // Ensure it doesn't exceed reasonable length
  if (cleaned.length > 100) {
    const colonIndex = cleaned.indexOf(':');
    if (colonIndex > 0 && colonIndex < 20) {
      // Keep the type and truncate description
      const type = cleaned.substring(0, colonIndex + 1);
      const description = cleaned.substring(colonIndex + 1).trim();
      cleaned = type + ' ' + description.substring(0, 100 - type.length - 1);
    } else {
      cleaned = cleaned.substring(0, 100);
    }
  }
  
  // Ensure conventional commit format
  if (!isConventionalCommit(cleaned)) {
    // Try to extract meaningful parts and format conventionally
    const conventionalTypes = ['feat', 'fix', 'docs', 'style', 'refactor', 'test', 'chore'];
    const foundType = conventionalTypes.find(type => 
      cleaned.toLowerCase().includes(type)
    );
    
    if (foundType) {
      const remaining = cleaned.replace(new RegExp(foundType, 'i'), '').replace(/^[:\s]+/, '');
      cleaned = `${foundType}: ${remaining || 'update code'}`;
    } else {
      cleaned = `chore: ${cleaned}`;
    }
  }
  
  return cleaned;
};

/**
 * Parse summary response with validation
 * @param {string} response - AI response text
 * @returns {string} Cleaned summary
 */
export const parseSummaryResponse = (response) => {
  if (!response || typeof response !== 'string') {
    return 'Daily development summary generated.';
  }
  
  // Remove quotes and extra formatting
  let cleaned = response
    .replace(/^["']|["']$/g, '')
    .trim();
  
  // Ensure reasonable length (not too short or too long)
  if (cleaned.length < 20) {
    return 'Daily development summary: ' + cleaned;
  }
  
  if (cleaned.length > 1000) {
    // Truncate at last complete sentence within limit
    const truncated = cleaned.substring(0, 1000);
    const lastPeriod = truncated.lastIndexOf('.');
    cleaned = lastPeriod > 500 ? truncated.substring(0, lastPeriod + 1) : truncated + '...';
  }
  
  return cleaned;
};

/**
 * Validate and normalize priority values
 * @param {string} priority - Priority value to validate
 * @returns {string} Valid priority
 */
export const validatePriority = (priority) => {
  const validPriorities = ['low', 'medium', 'high', 'urgent'];
  const normalized = priority?.toLowerCase();
  return validPriorities.includes(normalized) ? normalized : 'medium';
};

/**
 * Validate and normalize category values
 * @param {string} category - Category value to validate
 * @returns {string} Valid category
 */
export const validateCategory = (category) => {
  const validCategories = ['feature', 'bugfix', 'refactor', 'docs', 'test', 'chore', 'other'];
  const normalized = category?.toLowerCase();
  return validCategories.includes(normalized) ? normalized : 'other';
};

/**
 * Check if a commit message follows conventional commit format
 * @param {string} message - Commit message to check
 * @returns {boolean} True if conventional format
 */
export const isConventionalCommit = (message) => {
  if (!message || typeof message !== 'string') {
    return false;
  }
  
  const conventionalPattern = /^(feat|fix|docs|style|refactor|test|chore|build|ci|perf|revert)(\(.+\))?!?:\s.{1,}/;
  return conventionalPattern.test(message.trim());
};

/**
 * Extract and validate JSON from potentially malformed AI response
 * @param {string} response - AI response that may contain JSON
 * @returns {Object|null} Parsed JSON object or null if invalid
 */
export const extractJSON = (response) => {
  if (!response || typeof response !== 'string') {
    return null;
  }
  
  try {
    // Try direct parsing first
    return JSON.parse(response);
  } catch (error) {
    // Try to extract JSON from markdown code blocks
    const codeBlockMatch = response.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
    if (codeBlockMatch) {
      try {
        return JSON.parse(codeBlockMatch[1]);
      } catch (e) {
        console.warn('Failed to parse JSON from code block');
      }
    }
    
    // Try to find JSON-like structures
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch (e) {
        console.warn('Failed to parse extracted JSON structure');
      }
    }
    
    return null;
  }
};

/**
 * Create work signature for caching task suggestions
 * @param {Array} commits - Array of commits
 * @returns {string} Work signature hash
 */
export const createWorkSignature = (commits) => {
  // Create a simple signature based on commit messages and timestamps
  const signature = commits
    .map(c => `${c.sha?.substring(0, 7) || 'unknown'}-${c.message?.substring(0, 20) || 'no-msg'}`)
    .join('|');
  
  // Simple hash for consistency (not cryptographic)
  let hash = 0;
  for (let i = 0; i < signature.length; i++) {
    const char = signature.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  return Math.abs(hash).toString(16);
}; 