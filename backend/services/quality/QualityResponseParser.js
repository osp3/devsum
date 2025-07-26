/**
 * Quality Response Parser - Functional Pattern
 * Handles parsing and validation of AI responses for code quality analysis
 * Pure functions for reliable response processing
 */

/**
 * Parse quality analysis response from AI
 * @param {string} aiResponse - Raw AI response (JSON string)
 * @returns {Object} Parsed and validated quality analysis
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
    console.error('❌ Failed to parse quality response:', error.message);

    // If AI gives invalid JSON, return safe defaults
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
 * Parse code analysis response from AI
 * @param {string} aiResponse - Raw AI response (JSON string)
 * @returns {Object} Parsed and validated code analysis
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
          console.warn('⚠️ Failed to parse nested JSON:', value);
          return value;
        }
      }
      return value;
    };
    
    // Parse issues array (handle both array and JSON string cases)
    let issues = parseIfNeeded(parsed.issues) || [];
    if (!Array.isArray(issues)) {
      console.warn('⚠️ Issues is not an array after parsing:', typeof issues);
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
    console.error('❌ Failed to parse code analysis response:', error.message);
    return createFallbackCodeAnalysis();
  }
};

/**
 * Create fallback code analysis when parsing fails
 * @returns {Object} Safe fallback analysis structure
 */
const createFallbackCodeAnalysis = () => {
  return {
    severity: 'medium',
    issues: [{
      type: 'analysis_error',
      severity: 'low',
      line: 'unknown',
      description: 'Unable to fully analyze code changes',
      suggestion: 'Manual code review recommended',
      example: ''
    }],
    positives: [],
    overallAssessment: 'Code analysis incomplete',
    recommendedActions: ['Manual review recommended']
  };
};

/**
 * Validate and sanitize issue object
 * @param {Object} issue - Raw issue object
 * @returns {Object} Validated issue object
 */
export const validateIssue = (issue) => {
  const validSeverities = ['low', 'medium', 'high', 'critical'];
  const validTypes = ['quality', 'security', 'performance', 'maintainability', 'bug', 'style'];
  
  return {
    type: validTypes.includes(issue.type) ? issue.type : 'quality',
    severity: validSeverities.includes(issue.severity) ? issue.severity : 'medium',
    line: String(issue.line || 'unknown'),
    description: String(issue.description || 'Issue detected'),
    suggestion: String(issue.suggestion || 'Review and improve'),
    example: String(issue.example || '')
  };
};

/**
 * Validate array of strings
 * @param {Array} arr - Array to validate
 * @param {string} fallback - Fallback value for invalid items
 * @returns {Array} Array of valid strings
 */
export const validateStringArray = (arr, fallback = '') => {
  if (!Array.isArray(arr)) return [];
  return arr
    .filter(item => item != null)
    .map(item => String(item))
    .filter(item => item.length > 0 || fallback);
};

/**
 * Parse and validate AI response with comprehensive error handling
 * @param {string} aiResponse - Raw AI response
 * @param {string} analysisType - Type of analysis ('quality' | 'code')
 * @returns {Object} Parsed and validated response
 */
export const parseAIResponse = (aiResponse, analysisType = 'quality') => {
  if (!aiResponse || typeof aiResponse !== 'string') {
    console.error('❌ Invalid AI response format');
    return analysisType === 'quality' 
      ? parseQualityResponse('{}') 
      : parseCodeAnalysisResponse('{}');
  }

  try {
    // Basic JSON validation
    JSON.parse(aiResponse);
    
    // Parse based on analysis type
    return analysisType === 'quality' 
      ? parseQualityResponse(aiResponse)
      : parseCodeAnalysisResponse(aiResponse);
      
  } catch (error) {
    console.error(`❌ Failed to parse ${analysisType} AI response:`, error.message);
    return analysisType === 'quality' 
      ? parseQualityResponse('{}') 
      : parseCodeAnalysisResponse('{}');
  }
}; 