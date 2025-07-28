import Settings from '../../models/Settings.js';

/**
 * Environment Service - Functional Pattern
 * Manages environment variables with DB-first approach and .env fallback
 * Includes caching for performance optimization
 */

// Module-level cache and configuration
const cache = new Map();
const cacheTimeout = 5 * 60 * 1000; // 5 minutes

/**
 * Get environment variable value with DB-first approach and .env fallback
 * @param {string} key - Environment variable key
 * @param {string} defaultValue - Default value if not found
 * @returns {Promise<string|null>} The environment variable value
 */
export const get = async (key, defaultValue = null) => {
  // Check cache first
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < cacheTimeout) {
    return cached.value;
  }

  try {
    // Try to get from database first
    const dbValue = await Settings.getValue(key);
    if (dbValue !== null) {
      cache.set(key, { value: dbValue, timestamp: Date.now() });
      return dbValue;
    }

    // Fallback to .env file
    const envValue = process.env[key];
    if (envValue !== undefined) {
      cache.set(key, { value: envValue, timestamp: Date.now() });
      return envValue;
    }

    // Return default value
    return defaultValue;
  } catch (error) {
    console.error(`❌ Error getting environment variable ${key}:`, error);
    
    // Fallback to .env on error
    const envValue = process.env[key];
    if (envValue !== undefined) {
      return envValue;
    }
    
    return defaultValue;
  }
};

/**
 * Set environment variable value in database
 * @param {string} key - Environment variable key
 * @param {string} value - Environment variable value
 * @returns {Promise<boolean>} Success status
 */
export const set = async (key, value) => {
  try {
    await Settings.setValue(key, value);
    
    // Update cache
    cache.set(key, { value, timestamp: Date.now() });
    
    console.log(`✅ Environment variable ${key} updated successfully`);
    return true;
  } catch (error) {
    console.error(`❌ Error setting environment variable ${key}:`, error);
    return false;
  }
};

/**
 * Get all configurable environment variables
 * @returns {Promise<Object>} Object with all configurable env vars
 */
export const getConfigurableSettings = async () => {
  const configurableKeys = [
    // Session secret should be set as environment variable only, not configurable through UI
  ];

  const result = {};
  
  for (const key of configurableKeys) {
    const value = await get(key);
    // For security, mask sensitive values in the response
    if (key.includes('SECRET') || key.includes('KEY')) {
      result[key] = value ? maskSensitiveValue(value) : '';
    } else {
      result[key] = value || '';
    }
  }

  return result;
};

/**
 * Update multiple environment variables
 * @param {Object} settings - Object with key-value pairs
 * @returns {Promise<Object>} Result object with success status and errors
 */
export const updateSettings = async (settings) => {
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
      const success = await set(key, value.trim());
      if (success) {
        results.success.push(key);
      } else {
        results.errors.push(`Failed to update '${key}'`);
      }
    } else {
      results.errors.push(`Empty value provided for '${key}'`);
    }
  }

  console.log(`🔧 Settings update completed: ${results.success.length} successful, ${results.errors.length} errors`);
  return results;
};

/**
 * Clear cache for a specific key or all keys
 * @param {string} key - Optional key to clear, clears all if not provided
 */
export const clearCache = (key = null) => {
  if (key) {
    cache.delete(key);
    console.log(`🧹 Cleared cache for key: ${key}`);
  } else {
    cache.clear();
    console.log(`🧹 Cleared all environment variable cache`);
  }
};

/**
 * Mask sensitive values for display
 * @param {string} value - The value to mask
 * @returns {string} Masked value
 */
export const maskSensitiveValue = (value) => {
  if (!value || value.length <= 8) {
    return '••••••••';
  }
  return value.substring(0, 4) + '••••••••' + value.substring(value.length - 4);
};

/**
 * Get environment variable synchronously (for compatibility)
 * This method should only be used for non-sensitive variables
 * @param {string} key - Environment variable key
 * @param {string} defaultValue - Default value if not found
 * @returns {string|null} The environment variable value
 */
export const getSync = (key, defaultValue = null) => {
  return process.env[key] || defaultValue;
};

/**
 * Get cache statistics for monitoring
 * @returns {Object} Cache statistics
 */
export const getCacheStats = () => {
  const now = Date.now();
  const validEntries = Array.from(cache.entries()).filter(
    ([, { timestamp }]) => now - timestamp < cacheTimeout
  );
  
  return {
    totalEntries: cache.size,
    validEntries: validEntries.length,
    expiredEntries: cache.size - validEntries.length,
    cacheTimeout: cacheTimeout,
    generatedAt: new Date().toISOString()
  };
};

/**
 * Cleanup expired cache entries
 * @returns {number} Number of expired entries removed
 */
export const cleanupExpiredCache = () => {
  const now = Date.now();
  let removedCount = 0;
  
  for (const [key, { timestamp }] of cache.entries()) {
    if (now - timestamp >= cacheTimeout) {
      cache.delete(key);
      removedCount++;
    }
  }
  
  if (removedCount > 0) {
    console.log(`🧹 Cleanup: Removed ${removedCount} expired cache entries`);
  }
  
  return removedCount;
};

/**
 * Create environment service instance with all methods (functional composition)
 * @returns {Object} Environment service instance with bound methods
 */
export const createEnvironmentService = () => {
  return {
    get,
    set,
    getConfigurableSettings,
    updateSettings,
    clearCache,
    maskSensitiveValue,
    getSync,
    getCacheStats,
    cleanupExpiredCache
  };
};

/**
 * Default export for backwards compatibility
 * Maintains the same interface as the old class-based approach
 */
class EnvironmentService {
  constructor() {
    // Lightweight initialization - functional methods don't need instance state
  }

  async get(key, defaultValue = null) {
    return await get(key, defaultValue);
  }

  async set(key, value) {
    return await set(key, value);
  }

  async getConfigurableSettings() {
    return await getConfigurableSettings();
  }

  async updateSettings(settings) {
    return await updateSettings(settings);
  }

  clearCache(key = null) {
    return clearCache(key);
  }

  maskSensitiveValue(value) {
    return maskSensitiveValue(value);
  }

  getSync(key, defaultValue = null) {
    return getSync(key, defaultValue);
  }

  getCacheStats() {
    return getCacheStats();
  }

  cleanupExpiredCache() {
    return cleanupExpiredCache();
  }
}

// Create and export singleton instance for backwards compatibility
const environmentService = new EnvironmentService();

export default environmentService; 