import express from 'express';
import { createHash, timingSafeEqual } from 'crypto';
import { runMorningBriefs } from '../services/tasks/MorningBriefJob.js';

const router = express.Router();

const digest = (value) => createHash('sha256').update(value).digest();

// Constant-time comparison so response timing can't reveal the secret
const requireCronSecret = (req, res, next) => {
  const secret = process.env.CRON_SECRET;
  if (!secret) return res.status(503).json({ success: false, error: 'CRON_SECRET not configured' });

  const provided = (req.get('authorization') || '').replace(/^Bearer /, '');
  if (!timingSafeEqual(digest(provided), digest(secret))) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }
  next();
};

let running = null;

// Responds immediately; the job keeps running so slow users don't hit the caller's timeout
router.post('/morning-briefs', requireCronSecret, (req, res) => {
  if (running) return res.status(202).json({ success: true, status: 'already_running' });

  running = runMorningBriefs()
    .catch(error => console.error('❌ Morning brief job failed:', error.message))
    .finally(() => { running = null; });

  res.status(202).json({ success: true, status: 'started' });
});

export default router;
