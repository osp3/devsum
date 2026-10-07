/**
 * Morning Brief Job
 * Pre-generates yesterday's summary and task suggestions so the dashboard loads from cache
 */

import User from '../../models/User.js';
import AIService from '../ai/AICoordinator.js';
import { YesterdaySummaryService } from './YesterdaySummaryService.js';
import { getAccess } from '../../config/billing.js';
import { resolveAICredentials, runWithUsage } from '../billing/aiCredentials.js';
import { getLocalHour } from '../../utils/DateUtils.js';
import { mapWithConcurrency } from '../../utils/concurrency.js';

export const BRIEF_READY_HOUR = 5;
const ACTIVE_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const USER_CONCURRENCY = 2;

/**
 * Build briefs for recently active users whose local time is past BRIEF_READY_HOUR.
 * Safe to run repeatedly: summaries and tasks are served from cache once built.
 * @param {Date} now
 * @returns {Promise<Object>} { eligible, built, failed }
 */
export const runMorningBriefs = async (now = new Date()) => {
  const users = await User.find({
    lastActiveAt: { $gte: new Date(now.getTime() - ACTIVE_WINDOW_MS) },
    timeZone: { $exists: true }
  }).select('+accessToken +openaiApiKey');

  const due = users.filter(user =>
    getLocalHour(user.timeZone, now) >= BRIEF_READY_HOUR && getAccess(user, now).allowed);

  const results = await mapWithConcurrency(due, USER_CONCURRENCY, async (user) => {
    try {
      const { apiKey, model, metered } = await resolveAICredentials(user, now);
      await runWithUsage({ userId: user._id, metered }, async () => {
        const summary = await new YesterdaySummaryService(user.accessToken, user._id)
          .generateSummary(false, apiKey, model, user.timeZone);

        const commits = summary.formattedCommits?.allCommits || [];
        if (apiKey && commits.length > 0) {
          await AIService.generateTaskSuggestions(commits, `ALL_REPOS:${user._id}`, apiKey, model, false);
        }
      });
      return true;
    } catch (error) {
      console.error(`❌ Morning brief failed for user ${user._id}:`, error.message);
      return false;
    }
  });

  const built = results.filter(Boolean).length;
  const stats = { eligible: due.length, built, failed: due.length - built };
  console.log(`🌅 Morning briefs: ${JSON.stringify(stats)}`);
  return stats;
};
