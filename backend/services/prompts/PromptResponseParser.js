/**
 * Prompt Response Parser - Functional Pattern
 * Functions for parsing AI responses from various prompt types
 * Pure functions for reliable response parsing
 */

/**
 * Parse AI response for commit categorization
 * @param {Array} commits - Original commits array
 * @param {string} aiResponse - AI response JSON string
 * @returns {Array} Commits with AI analysis added
 */
export const parseCategorizationResponse = (commits, aiResponse) => {
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
    console.error('Failed to parse AI categorization response:', error.message);
    throw new Error('Failed to parse AI categorization response');
  }
};

/**
 * Parse AI response for task suggestions
 * @param {string} aiResponse - AI response JSON string
 * @returns {Array} Array of validated tasks
 */
export const parseTaskResponse = (aiResponse) => {
  try {
    const parsed = JSON.parse(aiResponse);
    const tasks = parsed.tasks || [];
    
    // Validate and ensure each task has required fields
    return tasks.map((task, index) => {
      // Ensure all required fields are present
      const validatedTask = {
        title: task.title || `Task ${index + 1}`,
        description: task.description || 'No description provided',
        priority: task.priority || 'medium',
        category: task.category || 'feature',
        estimatedTime: task.estimatedTime || '1-2 hours',
        basedOn: task.basedOn || 'AI analysis of yesterday\'s commits and development patterns',
        repositories: task.repositories || ['devsum']
      };
      
      // Log if fields were missing for debugging
      if (!task.basedOn) {
        console.warn(`Task "${task.title}" missing basedOn field - added default`);
      }
      if (!task.repositories) {
        console.warn(`Task "${task.title}" missing repositories field - added default`);
      }
      
      return validatedTask;
    });
  } catch (error) {
    console.error('Failed to parse task response:', error.message);
    return [];
  }
};

/**
 * Clean and format commit message suggestions
 * @param {string} suggestion - Raw AI suggestion
 * @returns {string} Cleaned commit message suggestion
 */
export const cleanCommitSuggestion = (suggestion) => {
  return suggestion
    .trim()
    .replace(/^["']|["']$/g, '') // Remove quotes
    .replace(/\n.*/, '') // Take only first line
    .slice(0, 72); // Git commit message best practice limit
};

/**
 * Parse AI response for commit analysis
 * @param {string} aiResponse - AI response JSON string
 * @returns {Object} Parsed commit analysis
 */
export const parseCommitAnalysisResponse = (aiResponse) => {
  try {
    const parsed = JSON.parse(aiResponse);
    
    return {
      suggestedMessage: parsed.suggestedMessage || 'No suggestion provided',
      description: parsed.description || 'No description provided',
      analysis: parsed.analysis || 'No analysis provided',
      confidence: parsed.confidence || 0.5,
      impact: parsed.impact || 'medium',
      quality: parsed.quality || 'medium'
    };
  } catch (error) {
    console.error('Failed to parse commit analysis response:', error.message);
    
    return {
      suggestedMessage: 'Error parsing response',
      description: 'Unable to analyze commit changes',
      analysis: 'Response parsing failed',
      confidence: 0.3,
      impact: 'low',
      quality: 'unknown'
    };
  }
};

/**
 * Parse AI response for quality analysis
 * @param {string} aiResponse - AI response JSON string
 * @returns {Object} Parsed quality analysis
 */
export const parseQualityResponse = (aiResponse) => {
  try {
    const parsed = JSON.parse(aiResponse);
    
    // Validate and clean: Ensure quality score is between 0-1
    const cleanScore = Math.max(0, Math.min(1, parsed.qualityScore || 0.5));
    
    // Validate and clean: Ensure issues have required fields
    const cleanIssues = (parsed.issues || []).map(issue => ({
      type: issue.type || 'maintainability',
      severity: ['low', 'medium', 'high', 'critical'].includes(issue.severity) 
        ? issue.severity : 'medium',
      description: issue.description || 'Quality issue detected',
      suggestion: issue.suggestion || 'Review and address this issue',
      commitCount: Math.max(0, issue.commitCount || 1)
    }));
    
    return {
      qualityScore: cleanScore,
      issues: cleanIssues,
      insights: Array.isArray(parsed.insights) ? parsed.insights : ['Code quality analysis completed'],
      recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : ['Continue monitoring code quality']
    };
    
  } catch (error) {
    console.error('Failed to parse quality response:', error.message);

    // If AI gives invalid JSON, return default
    return {
      qualityScore: 0.6,
      issues: [{
        type: 'analysis_error',
        severity: 'low',
        description: 'Unable to fully analyze quality patterns',
        suggestion: 'Manual code review recommended',
        commitCount: 0
      }],
      insights: ['Quality analysis completed with limited data'],
      recommendations: ['Ensure commit messages are descriptive']
    };
  }
};

/**
 * Parse AI response for code analysis
 * @param {string} aiResponse - AI response JSON string
 * @returns {Object} Parsed code analysis
 */
export const parseCodeAnalysisResponse = (aiResponse) => {
  try {
    const parsed = JSON.parse(aiResponse);
    
    // Helper function to parse nested JSON strings that AI sometimes returns
    const parseIfNeeded = (value) => {
      if (typeof value === 'string' && (value.startsWith('[') || value.startsWith('{'))) {
        try {
          return JSON.parse(value);
        } catch (e) {
          console.warn('Failed to parse nested JSON:', value);
          return value;
        }
      }
      return value;
    };
    
    // Parse issues array (handle both array and JSON string cases)
    let issues = parseIfNeeded(parsed.issues) || [];
    if (!Array.isArray(issues)) {
      console.warn('Issues is not an array after parsing:', typeof issues);
      issues = [];
    }
    
    // Parse positives and recommendedActions arrays
    let positives = parseIfNeeded(parsed.positives) || [];
    if (!Array.isArray(positives)) positives = [];
    
    let recommendedActions = parseIfNeeded(parsed.recommendedActions) || [];
    if (!Array.isArray(recommendedActions)) recommendedActions = [];
    
    return {
      severity: parsed.severity || 'medium',
      issues: issues.map(issue => ({
        type: String(issue.type || 'quality'),
        severity: String(issue.severity || 'medium'),
        line: String(issue.line || 'unknown'),
        description: String(issue.description || 'Code issue detected'),
        suggestion: String(issue.suggestion || 'Review and improve this code'),
        example: String(issue.example || '') // Always return string, never null
      })),
      positives: positives.filter(item => item != null).map(item => String(item)),
      overallAssessment: String(parsed.overallAssessment || 'Code analysis completed'),
      recommendedActions: recommendedActions.filter(item => item != null).map(item => String(item))
    };
    
  } catch (error) {
    console.error('Failed to parse code analysis response:', error.message);
    return {
      severity: String('medium'),
      issues: [{
        type: String('analysis_error'),
        severity: String('low'),
        line: String('unknown'),
        description: String('Unable to fully analyze code changes'),
        suggestion: String('Manual code review recommended'),
        example: String('')
      }],
      positives: [],
      overallAssessment: String('Code analysis incomplete'),
      recommendedActions: [String('Manual review recommended')]
    };
  }
};

/**
 * Validate task object has all required fields
 * @param {Object} task - Task object to validate
 * @param {number} index - Task index for fallback naming
 * @returns {Object} Validated task object
 */
export const validateTask = (task, index) => {
  return {
    title: task.title || `Task ${index + 1}`,
    description: task.description || 'No description provided',
    priority: ['low', 'medium', 'high'].includes(task.priority) ? task.priority : 'medium',
    category: ['feature', 'bugfix', 'refactor', 'testing', 'docs', 'optimization'].includes(task.category) 
      ? task.category : 'feature',
    estimatedTime: task.estimatedTime || '1-2 hours',
    basedOn: task.basedOn || 'AI analysis of development patterns',
    repositories: Array.isArray(task.repositories) ? task.repositories : ['devsum']
  };
}; 