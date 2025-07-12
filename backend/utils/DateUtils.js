/**
 * Date utility functions for time range calculations
 * Follows DRY principle by centralizing date logic
 */

/**
 * Get yesterday's date range (start and end of day)
 * @returns {Object} { start: Date, end: Date }
 */
export function getYesterdayRange() {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  
  const start = new Date(yesterday);
  start.setUTCHours(0, 0, 0, 0);
  
  const end = new Date(yesterday);
  end.setUTCHours(23, 59, 59, 999);
  
  return { start, end };
}

/**
 * Format date for API display (YYYY-MM-DD)
 * @param {Date} date 
 * @returns {string}
 */
export function formatDateForAPI(date) {
  return date.toISOString().split('T')[0];
} 