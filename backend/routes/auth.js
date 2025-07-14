import express from 'express';
import passport, { isOAuthReady } from '../config/passport.js';
import AuthController from '../controllers/AuthController.js';

// Destructure methods for cleaner route definitions
const { handleOAuthCallback, logout, getCurrentUser, getAuthStatus } = AuthController;

console.log('Auth routes module loading...');

const router = express.Router();

/**
 * Authentication Routes
 * Handles GitHub OAuth flow
 */

// Middleware to check if OAuth is configured
const requireOAuth = (req, res, next) => {
  if (!isOAuthReady()) {
    return res.status(503).json({
      error: 'OAuth not configured',
      message: 'GitHub OAuth credentials are not configured. Please configure them in the Settings page.'
    });
  }
  next();
};

// Initiate GitHub OAuth login
router.get('/github', 
  requireOAuth,
  passport.authenticate('github', { 
    scope: ['user:email', 'repo'] 
  })
);

// GitHub OAuth callback
router.get('/github/callback',
  requireOAuth,
  passport.authenticate('github', { 
    failureRedirect: `${process.env.FRONTEND_URL}/login?error=auth_failed` 
  }),
  handleOAuthCallback
);

// Logout
router.post('/logout', logout);

// Get current user info
router.get('/me', getCurrentUser);

// Check authentication status
router.get('/status', getAuthStatus);

console.log('✅ Auth routes module loaded successfully');

export default router; 