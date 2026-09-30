/**
 * Date utility functions for time range calculations
 * Follows DRY principle by centralizing date logic
 */

export function isValidTimeZone(timeZone) {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone });
    return typeof timeZone === 'string';
  } catch {
    return false;
  }
}

function getZonedParts(date, timeZone) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone, hourCycle: 'h23',
    year: 'numeric', month: 'numeric', day: 'numeric',
    hour: 'numeric', minute: 'numeric', second: 'numeric'
  }).formatToParts(date);
  return Object.fromEntries(parts.filter(p => p.type !== 'literal').map(p => [p.type, Number(p.value)]));
}

function getOffsetMs(date, timeZone) {
  const p = getZonedParts(date, timeZone);
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - Math.floor(date.getTime() / 1000) * 1000;
}

// Second pass corrects for a DST change between the guess and the actual midnight
function zonedMidnight(year, monthIndex, day, timeZone) {
  const guess = Date.UTC(year, monthIndex, day);
  const first = guess - getOffsetMs(new Date(guess), timeZone);
  return new Date(guess - getOffsetMs(new Date(first), timeZone));
}

/**
 * Get yesterday's date range (start and end of day) in the given IANA time zone
 * @param {string} timeZone - IANA time zone, falls back to UTC when invalid
 * @param {Date} now
 * @returns {Object} { start: Date, end: Date, date: 'YYYY-MM-DD' }
 */
export function getYesterdayRange(timeZone = 'UTC', now = new Date()) {
  const tz = isValidTimeZone(timeZone) ? timeZone : 'UTC';
  const { year, month, day } = getZonedParts(now, tz);

  const start = zonedMidnight(year, month - 1, day - 1, tz);
  const end = new Date(zonedMidnight(year, month - 1, day, tz).getTime() - 1);
  const date = new Date(Date.UTC(year, month - 1, day - 1)).toISOString().split('T')[0];

  return { start, end, date };
}

/**
 * Format date for API display (YYYY-MM-DD)
 * @param {Date} date 
 * @returns {string}
 */
export function formatDateForAPI(date) {
  return date.toISOString().split('T')[0];
} 