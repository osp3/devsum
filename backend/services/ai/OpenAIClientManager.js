import OpenAI from 'openai';
import { DEFAULT_OPENAI_MODEL, getModelConfig, resolveModel } from '../../config/openaiModels.js';

// Reasoning tokens count toward max_completion_tokens, so reserve room for the visible answer
const REASONING_TOKEN_HEADROOM = 4000;

/**
 * OpenAI Client Manager - Functional Pattern
 * Handles OpenAI client creation and API communication
 */

/**
 * Create OpenAI client with user-specific API key
 * @param {string} userApiKey - User's OpenAI API key
 * @param {string} userModel - User's preferred OpenAI model
 * @returns {OpenAI} OpenAI client instance
 */
export const createOpenAIClient = (userApiKey, userModel = DEFAULT_OPENAI_MODEL) => {
  if (!userApiKey) {
    throw new Error('User OpenAI API key is required');
  }
  return new OpenAI({ apiKey: userApiKey });
};

/**
 * Validate OpenAI API key format
 * @param {string} apiKey - API key to validate
 * @returns {boolean} True if valid format
 */
export const validateApiKey = (apiKey) => {
  return typeof apiKey === 'string' && 
         apiKey.length > 20 && 
         apiKey.startsWith('sk-');
};

/**
 * Call OpenAI API with user-specific settings
 * @param {string} prompt - The prompt to send
 * @param {string} userApiKey - User's OpenAI API key
 * @param {string} userModel - User's preferred model
 * @param {Object} options - Additional options (temperature, max_tokens, etc.)
 * @returns {Promise<string>} AI response text
 */
export const callOpenAI = async (prompt, userApiKey, userModel = DEFAULT_OPENAI_MODEL, options = {}) => {
  if (!userApiKey) {
    throw new Error('User OpenAI API key is required');
  }

  const model = resolveModel(userModel);

  try {
    const openai = createOpenAIClient(userApiKey, model);
    const { reasoningEffort } = getModelConfig(model);
    const maxTokens = options.maxTokens || 1500;
    const isReasoning = reasoningEffort !== 'none';
    
    console.log(`🤖 OpenAI Request: Sending ${prompt.length}-char prompt to model "${model}" with user's API key`);
    
    const response = await openai.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content: options.systemPrompt || 'You are a helpful developer assistant that analyzes code commits.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      reasoning_effort: reasoningEffort,
      max_completion_tokens: isReasoning ? maxTokens + REASONING_TOKEN_HEADROOM : maxTokens,
      ...(!isReasoning && { temperature: options.temperature ?? 0.1 }),
      ...options.additionalParams
    });
    
    const { message, finish_reason } = response.choices[0];
    const responseText = (message.content || '').trim();
    if (!responseText) {
      throw new Error(`Empty response from "${model}" (finish_reason: ${finish_reason})`);
    }
    console.log(`✅ OpenAI Response: Received ${responseText.length} characters from "${model}"`);
    return responseText;
  } catch (error) {
    console.error(`❌ OpenAI API call failed with model "${model}":`, error.message);
    throw error;
  }
};

/**
 * Create system prompts for different AI tasks
 */
export const systemPrompts = {
  COMMIT_ANALYSIS: 'You are a helpful developer assistant that analyzes code commits and suggests improvements.',
  SUMMARY_GENERATION: 'You are a helpful assistant that creates concise development summaries.',
  TASK_SUGGESTION: 'You are a helpful assistant that suggests development tasks based on recent work.',
  QUALITY_ANALYSIS: 'You are a helpful assistant that analyzes code quality and provides recommendations.'
};

/**
 * Default options for different AI operations
 */
export const defaultOptions = {
  commitAnalysis: {
    temperature: 0.1,
    maxTokens: 800,
    systemPrompt: systemPrompts.COMMIT_ANALYSIS
  },
  summaryGeneration: {
    temperature: 0.2,
    maxTokens: 1200,
    systemPrompt: systemPrompts.SUMMARY_GENERATION
  },
  taskSuggestion: {
    temperature: 0.3,
    maxTokens: 1000,
    systemPrompt: systemPrompts.TASK_SUGGESTION
  },
  qualityAnalysis: {
    temperature: 0.1,
    maxTokens: 1500,
    systemPrompt: systemPrompts.QUALITY_ANALYSIS
  }
}; 