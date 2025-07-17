import { createAuthError, createServerError } from '../utils/errors.js';

/**
 * Authentication Controller
 * Handles authentication business logic for shared GitHub OAuth app
 * Each user has their own access token from authorizing the shared app
 */
class AuthController {
  /**
   * Handle GitHub OAuth callback success
   */
  static async handleOAuthCallback(req, res, next) {
    try {
      // Check if user is authenticated
      if (!req.user) {
        console.error('❌ OAuth callback called but no user found in session');
        return res.redirect(`${process.env.FRONTEND_URL}/login?error=auth_failed`);
      }

      console.log(`✅ User authenticated: ${req.user.username}`);
      console.log(`🔑 Access token stored for GitHub API access`);
      
      res.redirect(`${process.env.FRONTEND_URL}/dashboard`);
    } catch (error) {
      console.error('OAuth callback error:', error);
      const err = createServerError(
        'OAuth callback failed',
        `user: ${req.user?.username || 'unknown'}`
      );
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
        message: 'Logged out successfully',
      });
    } catch (error) {
      const err = createServerError(
        'Logout failed',
        `user: ${req.user?.username || 'unknown'}`
      );
      return next(err);
    }
  }

  /**
   * Get current authenticated user information
   * Uses the user's personal GitHub access token to fetch detailed profile data
   */
  static async getCurrentUser(req, res, next) {
    try {
      console.log('/auth/me route hit');
      console.log('User authenticated:', !!req.user);
      console.log('Session ID:', req.sessionID);

      if (!req.user) {
        const err = createAuthError('Not authenticated', 'accessing /auth/me');
        return next(err);
      }

      // Create userInfo object (exclude sensitive access token from response)
      const { accessToken, ...userInfo } = req.user.toObject();

      // Fetch additional GitHub profile data using user's personal access token
      if (req.user.accessToken) {
        try {
          console.log(`🔍 Fetching GitHub profile data for: ${req.user.username}`);
          
          const githubResponse = await fetch('https://api.github.com/user', {
            headers: { 
              Authorization: `token ${req.user.accessToken}`,
              'User-Agent': 'DevSum-App',
              'Accept': 'application/vnd.github.v3+json'
            },
          });
          
          if (githubResponse.ok) {
            const githubData = await githubResponse.json();
            
            // Enhance user info with fresh GitHub data
            userInfo.fullName = githubData.name || githubData.login;
            userInfo.bio = githubData.bio;
            userInfo.company = githubData.company;
            userInfo.location = githubData.location;
            userInfo.publicRepos = githubData.public_repos;
            userInfo.followers = githubData.followers;
            userInfo.following = githubData.following;
            userInfo.githubUrl = githubData.html_url;
            userInfo.createdAt = githubData.created_at;
            
            console.log(`✅ GitHub profile data fetched for: ${githubData.login}`);
            console.log(`   Full name: ${githubData.name || 'Not set'}`);
            console.log(`   Public repos: ${githubData.public_repos}`);
          } else {
            console.warn(`⚠️ GitHub API error: ${githubResponse.status} ${githubResponse.statusText}`);
            console.warn('   Using cached user data from database');
          }
        } catch (error) {
          console.warn('Could not fetch additional GitHub data:', error.message);
          console.warn('Using cached user data from database');
        }
      } else {
        console.warn('⚠️ No access token found for user - cannot fetch GitHub data');
      }

      res.json({
        success: true,
        user: userInfo,
      });
    } catch (error) {
      const err = createServerError(
        'Failed to get user information',
        `session: ${req.sessionID}`
      );
      return next(err);
    }
  }

  /**
   * Check authentication status and GitHub token validity
   */
  static getAuthStatus(req, res, next) {
    try {
      const hasGitHubToken = !!(req.user && req.user.accessToken);
      
      res.json({
        success: true,
        authenticated: !!req.user,
        user: req.user ? req.user.username : null,
        hasGitHubToken: hasGitHubToken,
        githubScopes: hasGitHubToken ? ['user:email', 'repo'] : null,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      const err = createServerError(
        'Failed to check authentication status',
        'auth status check'
      );
      return next(err);
    }
  }
}

export default AuthController;
