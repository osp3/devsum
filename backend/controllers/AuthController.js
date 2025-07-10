import { createAuthError, createServerError } from '../utils/errors.js';

/**
 * Authentication Controller
 * Handles authentication business logic following SOLID principles
 */
class AuthController {
  /**
   * Handle GitHub OAuth callback success
   */
  static handleOAuthCallback(req, res, next) {
    try {
      console.log(`✅ User authenticated: ${req.user.username}`);
      res.redirect(`${process.env.FRONTEND_URL}/dashboard`);
    } catch (error) {
      const err = createServerError('OAuth callback failed', `user: ${req.user?.username || 'unknown'}`);
      return next(err);
    }
  }

  /**
   * Handle user logout with session cleanup
   */
  static async logout(req, res, next) {
    try {
      const username = req.user?.username;
      
      if (username) {
        console.log(`User logged out: ${username}`);
      }
      
      await new Promise((resolve, reject) => {
        req.logout((err) => {
          if (err) return reject(err);
          resolve();
        });
      });
      
      await new Promise((resolve, reject) => {
        req.session.destroy((err) => {
          if (err) return reject(err);
          resolve();
        });
      });
      
      res.clearCookie('connect.sid');
      res.json({ 
        success: true,
        message: 'Logged out successfully' 
      });
    } catch (error) {
      const err = createServerError('Logout failed', `user: ${req.user?.username || 'unknown'}`);
      return next(err);
    }
  }

  /**
   * Get current authenticated user information
   */
  static getCurrentUser(req, res, next) {
    try {
      console.log('/auth/me route hit');
      console.log('User authenticated:', !!req.user);
      console.log('Session ID:', req.sessionID);
      
      if (!req.user) {
        const err = createAuthError('Not authenticated', 'accessing /auth/me');
        return next(err);
      }
      
      // Return user info without sensitive data
      const { accessToken, ...userInfo } = req.user.toObject();
      
      res.json({
        success: true,
        user: userInfo
      });
    } catch (error) {
      const err = createServerError('Failed to get user information', `session: ${req.sessionID}`);
      return next(err);
    }
  }

  /**
   * Check authentication status
   */
  static getAuthStatus(req, res, next) {
    try {
      res.json({
        success: true,
        authenticated: !!req.user,
        user: req.user ? req.user.username : null,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      const err = createServerError('Failed to check authentication status', 'auth status check');
      return next(err);
    }
  }
}

export default AuthController; 