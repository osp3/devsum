/**
 * Prompt Builder Coordinator - Backwards Compatibility Wrapper
 * 
 * This class maintains the same interface as the original PromptBuilder
 * while delegating to the new functional modules under the hood.
 * 
 * This ensures zero breaking changes for existing code that uses PromptBuilder.
 * All the heavy lifting is now done by specialized functional modules:
 * - CommitPromptBuilder.js
 * - SummaryPromptBuilder.js
 * - TaskPromptBuilder.js
 * - QualityPromptBuilder.js
 * - PromptResponseParser.js
 * - PromptUtils.js
 */

import { createWorkSignature, groupByCategory } from './PromptUtils.js';
import { 
  createCategorizationPrompt, 
  createCommitAnalysisPrompt, 
  createCommitMessagePrompt 
} from './CommitPromptBuilder.js';
import { 
  createSummaryPrompt, 
  createEnhancedSummaryPrompt, 
  createBasicSummaryPrompt 
} from './SummaryPromptBuilder.js';
import { 
  createTaskPrompt, 
  createEnhancedTaskPrompt, 
  createBasicTaskPrompt 
} from './TaskPromptBuilder.js';
import { 
  createQualityPrompt, 
  createCodeAnalysisPrompt 
} from './QualityPromptBuilder.js';
import { 
  parseCategorizationResponse, 
  parseTaskResponse, 
  cleanCommitSuggestion 
} from './PromptResponseParser.js';

class PromptBuilder {
  constructor() {
    // Lightweight initialization - functional methods don't need instance state
  }

  /**
   * Create signature of recent work patterns for smart caching
   * Delegates to functional utility
   */
  createWorkSignature(commits) {
    return createWorkSignature(commits);
  }

  /**
   * Create prompt for categorizing git commits by type
   * Delegates to CommitPromptBuilder
   */
  createCategorizationPrompt(commits) {
    return createCategorizationPrompt(commits);
  }

  /**
   * Create summary prompt - chooses between enhanced and basic
   * Delegates to SummaryPromptBuilder
   */
  createSummaryPrompt(commits) {
    return createSummaryPrompt(commits);
  }

  /**
   * Create enhanced summary prompt using AI analysis data
   * Delegates to SummaryPromptBuilder (private method made public for flexibility)
   */
  _createEnhancedSummaryPrompt(commits, categories) {
    return createEnhancedSummaryPrompt(commits, categories);
  }

  /**
   * Create basic summary prompt when only commit messages are available
   * Delegates to SummaryPromptBuilder (private method made public for flexibility)
   */
  _createBasicSummaryPrompt(commits, categories) {
    return createBasicSummaryPrompt(commits, categories);
  }

  /**
   * Create task prompt - chooses between enhanced and basic
   * Delegates to TaskPromptBuilder
   */
  createTaskPrompt(commits) {
    return createTaskPrompt(commits);
  }

  /**
   * Create enhanced task prompt using AI analysis data
   * Delegates to TaskPromptBuilder (private method made public for flexibility)
   */
  _createEnhancedTaskPrompt(commits) {
    return createEnhancedTaskPrompt(commits);
  }

  /**
   * Create basic task prompt when only commit messages are available
   * Delegates to TaskPromptBuilder (private method made public for flexibility)
   */
  _createBasicTaskPrompt(commits) {
    return createBasicTaskPrompt(commits);
  }

  /**
   * Create quality analysis prompt for commit patterns
   * Delegates to QualityPromptBuilder
   */
  createQualityPrompt(commits) {
    return createQualityPrompt(commits);
  }

  /**
   * Create comprehensive code review prompt for individual commits
   * Delegates to QualityPromptBuilder
   */
  createCodeAnalysisPrompt(commit, diff) {
    return createCodeAnalysisPrompt(commit, diff);
  }

  /**
   * Create comprehensive commit analysis prompt with git diff
   * Delegates to CommitPromptBuilder
   */
  createCommitAnalysisPrompt(commit, diff) {
    return createCommitAnalysisPrompt(commit, diff);
  }

  /**
   * Create prompt for improving commit messages
   * Delegates to CommitPromptBuilder
   */
  createCommitMessagePrompt(diffContent, currentMessage) {
    return createCommitMessagePrompt(diffContent, currentMessage);
  }

  /**
   * Organize commits by category
   * Delegates to functional utility
   */
  groupByCategory(commits) {
    return groupByCategory(commits);
  }

  /**
   * Parse AI response for commit categorization
   * Delegates to PromptResponseParser
   */
  parseResponse(commits, aiResponse) {
    return parseCategorizationResponse(commits, aiResponse);
  }

  /**
   * Parse AI response for task suggestions
   * Delegates to PromptResponseParser
   */
  parseTaskResponse(aiResponse) {
    return parseTaskResponse(aiResponse);
  }

  /**
   * Clean and format commit message suggestions
   * Delegates to PromptResponseParser
   */
  cleanCommitSuggestion(suggestion) {
    return cleanCommitSuggestion(suggestion);
  }
}

export default PromptBuilder; 