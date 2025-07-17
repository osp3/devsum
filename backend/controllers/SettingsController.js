import EnvironmentService from '../services/EnvironmentService.js';
import User from '../models/User.js';
import { AppError } from '../utils/errors.js';

class SettingsController {
  constructor() {
    // Bind all methods to ensure proper 'this' context
    this.getSettings = this.getSettings.bind(this);
    this.updateSettings = this.updateSettings.bind(this);
    this.testSetting = this.testSetting.bind(this);
    this.clearCache = this.clearCache.bind(this);
    this.testOpenAIKey = this.testOpenAIKey.bind(this);

  }

  /**
   * Get user-specific settings
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  async getSettings(req, res, next) {
    try {
      // Get shared environment settings
      const sharedSettings = await EnvironmentService.getConfigurableSettings();
      
      // Get user-specific settings (OpenAI API key and model)
      const user = await User.findById(req.user._id).select('+openaiApiKey');
      if (!user) {
        return next(new AppError('User not found', 404));
      }

      // Combine shared and user-specific settings
      const settings = {
        ...sharedSettings,
        OPENAI_API_KEY: user.openaiApiKey ? this.maskSensitiveValue(user.openaiApiKey) : '',
        OPENAI_MODEL: user.openaiModel || 'gpt-4o-mini'
      };
      
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
   * Update user-specific settings
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

      // Separate user-specific settings from shared settings
      const userSettings = {};
      const sharedSettings = {};
      const allowedSharedKeys = ['SESSION_SECRET'];
      const allowedUserKeys = ['OPENAI_API_KEY', 'OPENAI_MODEL'];
      
      for (const [key, value] of Object.entries(settings)) {
        if (allowedUserKeys.includes(key)) {
          userSettings[key] = value;
        } else if (allowedSharedKeys.includes(key)) {
          sharedSettings[key] = value;
        } else {
          return next(new AppError(`Setting '${key}' is not configurable`, 400));
        }
        
        if (typeof value !== 'string') {
          return next(new AppError(`Setting '${key}' must be a string`, 400));
        }
      }

      const result = { success: [], errors: [] };

      // Update user-specific settings
      if (Object.keys(userSettings).length > 0) {
        try {
          const user = await User.findById(req.user._id);
          if (!user) {
            return next(new AppError('User not found', 404));
          }

          // Update user fields
          if (userSettings.OPENAI_API_KEY && userSettings.OPENAI_API_KEY.trim()) {
            user.openaiApiKey = userSettings.OPENAI_API_KEY.trim();
            result.success.push('OPENAI_API_KEY');
          }
          if (userSettings.OPENAI_MODEL && userSettings.OPENAI_MODEL.trim()) {
            user.openaiModel = userSettings.OPENAI_MODEL.trim();
            result.success.push('OPENAI_MODEL');
          }

          await user.save();
        } catch (error) {
          console.error('Error updating user settings:', error);
          result.errors.push('Failed to update user settings');
        }
      }

      // Update shared environment settings
      if (Object.keys(sharedSettings).length > 0) {
        const sharedResult = await EnvironmentService.updateSettings(sharedSettings);
        result.success.push(...sharedResult.success);
        result.errors.push(...sharedResult.errors);

        // Clear cache for updated shared settings
        sharedResult.success.forEach(key => {
          EnvironmentService.clearCache(key);
        });
      }

      // Check if any updates were successful
      if (result.success.length === 0 && result.errors.length > 0) {
        return next(new AppError('Failed to update any settings: ' + result.errors.join(', '), 400));
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
      const { key } = req.body;

      if (!key) {
        return next(new AppError('Key is required', 400));
      }

      let testResult = { valid: false, message: 'Test not implemented for this setting' };

      // Test specific settings using stored values for security
      switch (key) {
        case 'OPENAI_API_KEY':
          // Get the user's stored API key
          const user = await User.findById(req.user._id).select('+openaiApiKey');
          if (!user || !user.openaiApiKey) {
            testResult = { valid: false, message: 'No OpenAI API key is configured for your account' };
          } else {
            testResult = await this.testOpenAIKey(user.openaiApiKey);
          }
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

  /**
   * Mask sensitive values for display
   * @param {string} value - The value to mask
   * @returns {string} Masked value
   */
  maskSensitiveValue(value) {
    if (!value || value.length <= 8) {
      return '••••••••';
    }
    return value.substring(0, 4) + '••••••••' + value.substring(value.length - 4);
  }
}

export default new SettingsController(); 