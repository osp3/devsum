import Settings from '../models/Settings.js';

class EnvironmentService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Get environment variable value with DB-first approach and .env fallback
   * @param {string} key - Environment variable key
   * @param {string} defaultValue - Default value if not found
   * @returns {Promise<string|null>} The environment variable value
   */
  async get(key, defaultValue = null) {
    // Check cache first
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.value;
    }

    try {
      // Try to get from database first
      const dbValue = await Settings.getValue(key);
      if (dbValue !== null) {
        this.cache.set(key, { value: dbValue, timestamp: Date.now() });
        return dbValue;
      }

      // Fallback to .env file
      const envValue = process.env[key];
      if (envValue !== undefined) {
        this.cache.set(key, { value: envValue, timestamp: Date.now() });
        return envValue;
      }

      // Return default value
      return defaultValue;
    } catch (error) {
      console.error(`Error getting environment variable ${key}:`, error);
      
      // Fallback to .env on error
      const envValue = process.env[key];
      if (envValue !== undefined) {
        return envValue;
      }
      
      return defaultValue;
    }
  }

  /**
   * Set environment variable value in database
   * @param {string} key - Environment variable key
   * @param {string} value - Environment variable value
   * @returns {Promise<boolean>} Success status
   */
  async set(key, value) {
    try {
      await Settings.setValue(key, value);
      
      // Update cache
      this.cache.set(key, { value, timestamp: Date.now() });
      
      return true;
    } catch (error) {
      console.error(`Error setting environment variable ${key}:`, error);
      return false;
    }
  }

  /**
   * Get all configurable environment variables
   * @returns {Promise<Object>} Object with all configurable env vars
   */
  async getConfigurableSettings() {
    const configurableKeys = [
      'SESSION_SECRET'
    ];

    const result = {};
    
    for (const key of configurableKeys) {
      const value = await this.get(key);
      // For security, mask sensitive values in the response
      if (key.includes('SECRET') || key.includes('KEY')) {
        result[key] = value ? this.maskSensitiveValue(value) : '';
      } else {
        result[key] = value || '';
      }
    }

    return result;
  }

  /**
   * Update multiple environment variables
   * @param {Object} settings - Object with key-value pairs
   * @returns {Promise<Object>} Result object with success status and errors
   */
  async updateSettings(settings) {
    const results = {
      success: [],
      errors: []
    };

    const allowedKeys = [
      'SESSION_SECRET'
    ];

    for (const [key, value] of Object.entries(settings)) {
      if (!allowedKeys.includes(key)) {
        results.errors.push(`Setting '${key}' is not configurable`);
        continue;
      }

      if (value && value.trim()) {
        const success = await this.set(key, value.trim());
        if (success) {
          results.success.push(key);
        } else {
          results.errors.push(`Failed to update '${key}'`);
        }
      } else {
        results.errors.push(`Empty value provided for '${key}'`);
      }
    }

    return results;
  }

  /**
   * Clear cache for a specific key or all keys
   * @param {string} key - Optional key to clear, clears all if not provided
   */
  clearCache(key = null) {
    if (key) {
      this.cache.delete(key);
    } else {
      this.cache.clear();
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

  /**
   * Get environment variable synchronously (for compatibility)
   * This method should only be used for non-sensitive variables
   * @param {string} key - Environment variable key
   * @param {string} defaultValue - Default value if not found
   * @returns {string|null} The environment variable value
   */
  getSync(key, defaultValue = null) {
    return process.env[key] || defaultValue;
  }
}

// Create a singleton instance
const environmentService = new EnvironmentService();

export default environmentService; 