import EnvironmentService from '../services/EnvironmentService.js';
import { AppError } from '../utils/errors.js';

class SettingsController {
  /**
   * Get all configurable settings
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  async getSettings(req, res, next) {
    try {
      const settings = await EnvironmentService.getConfigurableSettings();
      
      res.json({
        success: true,
        data: settings
      });
    } catch (error) {
      console.error('Error getting settings:', error);
      next(new AppError('Failed to retrieve settings', 500));
    }
  }

  /**
   * Update settings
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  async updateSettings(req, res, next) {
    try {
      const { settings } = req.body;

      // Validate request body
      if (!settings || typeof settings !== 'object') {
        return next(new AppError('Invalid settings data provided', 400));
      }

      // Validate individual settings
      const allowedKeys = ['GITHUB_CLIENT_ID', 'GITHUB_CLIENT_SECRET', 'OPENAI_API_KEY'];
      const validSettings = {};
      
      for (const [key, value] of Object.entries(settings)) {
        if (!allowedKeys.includes(key)) {
          return next(new AppError(`Setting '${key}' is not configurable`, 400));
        }
        
        if (typeof value !== 'string') {
          return next(new AppError(`Setting '${key}' must be a string`, 400));
        }
        
        validSettings[key] = value;
      }

      // Update settings
      const result = await EnvironmentService.updateSettings(validSettings);

      // Check if any updates were successful
      if (result.success.length === 0 && result.errors.length > 0) {
        return next(new AppError('Failed to update any settings: ' + result.errors.join(', '), 400));
      }

      // Clear cache for updated settings
      result.success.forEach(key => {
        EnvironmentService.clearCache(key);
      });

      // Reinitialize services that depend on updated settings
      if (result.success.includes('OPENAI_API_KEY')) {
        try {
          // Dynamically import AIService to avoid circular dependency
          const { default: aiService } = await import('../services/ai.js');
          await aiService.reinitializeOpenAI();
        } catch (error) {
          console.error('Failed to reinitialize OpenAI service:', error);
        }
      }

      res.json({
        success: true,
        data: {
          updated: result.success,
          errors: result.errors
        },
        message: `Successfully updated ${result.success.length} setting(s)`
      });
      
    } catch (error) {
      console.error('Error updating settings:', error);
      next(new AppError('Failed to update settings', 500));
    }
  }

  /**
   * Test a specific setting (like API key validation)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  async testSetting(req, res, next) {
    try {
      const { key, value } = req.body;

      if (!key || !value) {
        return next(new AppError('Key and value are required', 400));
      }

      let testResult = { valid: false, message: 'Test not implemented for this setting' };

      // Test specific settings
      switch (key) {
        case 'OPENAI_API_KEY':
          testResult = await this.testOpenAIKey(value);
          break;
        case 'GITHUB_CLIENT_ID':
        case 'GITHUB_CLIENT_SECRET':
          testResult = await this.testGitHubCredentials(key, value);
          break;
        default:
          testResult = { valid: true, message: 'Setting format appears valid' };
      }

      res.json({
        success: true,
        data: testResult
      });

    } catch (error) {
      console.error('Error testing setting:', error);
      next(new AppError('Failed to test setting', 500));
    }
  }

  /**
   * Test OpenAI API key
   * @param {string} apiKey - OpenAI API key
   * @returns {Promise<Object>} Test result
   */
  async testOpenAIKey(apiKey) {
    try {
      const { default: OpenAI } = await import('openai');
      const openai = new OpenAI({ apiKey });
      
      // Test with a simple completion
      await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'Hello' }],
        max_tokens: 5
      });

      return { valid: true, message: 'OpenAI API key is valid' };
    } catch (error) {
      return { 
        valid: false, 
        message: error.message || 'OpenAI API key is invalid' 
      };
    }
  }

  /**
   * Test GitHub credentials
   * @param {string} key - Setting key
   * @param {string} value - Setting value
   * @returns {Promise<Object>} Test result
   */
  async testGitHubCredentials(key, value) {
    // Basic format validation
    if (key === 'GITHUB_CLIENT_ID') {
      if (!/^[A-Za-z0-9]+$/.test(value)) {
        return { valid: false, message: 'Invalid GitHub Client ID format' };
      }
      return { valid: true, message: 'GitHub Client ID format is valid' };
    }
    
    if (key === 'GITHUB_CLIENT_SECRET') {
      if (!/^[A-Za-z0-9]+$/.test(value)) {
        return { valid: false, message: 'Invalid GitHub Client Secret format' };
      }
      return { valid: true, message: 'GitHub Client Secret format is valid' };
    }

    return { valid: true, message: 'Setting format appears valid' };
  }

  /**
   * Clear settings cache
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  async clearCache(req, res, next) {
    try {
      const { key } = req.body;
      
      EnvironmentService.clearCache(key);
      
      res.json({
        success: true,
        message: key ? `Cache cleared for ${key}` : 'All settings cache cleared'
      });
    } catch (error) {
      console.error('Error clearing cache:', error);
      next(new AppError('Failed to clear cache', 500));
    }
  }
}

export default new SettingsController(); 