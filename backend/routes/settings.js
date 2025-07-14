import express from 'express';
import settingsController from '../controllers/SettingsController.js';
import { ensureAuthenticated } from '../middleware/auth.js';

const router = express.Router();

// Apply authentication middleware to all settings routes
router.use(ensureAuthenticated);

/**
 * @route   GET /api/settings
 * @desc    Get all configurable settings
 * @access  Private
 */
router.get('/', settingsController.getSettings);

/**
 * @route   PUT /api/settings
 * @desc    Update settings
 * @access  Private
 */
router.put('/', settingsController.updateSettings);

/**
 * @route   POST /api/settings/test
 * @desc    Test a specific setting (like API key validation)
 * @access  Private
 */
router.post('/test', settingsController.testSetting);

/**
 * @route   POST /api/settings/clear-cache
 * @desc    Clear settings cache
 * @access  Private
 */
router.post('/clear-cache', settingsController.clearCache);

export default router; 