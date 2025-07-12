import passport from 'passport';
import { Strategy as GitHubStrategy } from 'passport-github2';
import User from '../models/User.js';
import EnvironmentService from '../services/EnvironmentService.js';

/**
 * Passport configuration for GitHub OAuth
 * Implements secure authentication flow with user persistence
 */

let isOAuthConfigured = false;

// Serialize user for session storage
passport.serializeUser((user, done) => {
  done(null, user._id);
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id).select('+accessToken'); // Include accessToken
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

/**
 * Initialize GitHub OAuth strategy with credentials from database/env
 * This is called after database connection is established
 */
async function initializeOAuth() {
  try {
    const clientID = await EnvironmentService.get('GITHUB_CLIENT_ID');
    const clientSecret = await EnvironmentService.get('GITHUB_CLIENT_SECRET');
    const callbackURL = await EnvironmentService.get('GITHUB_CALLBACK_URL', process.env.GITHUB_CALLBACK_URL);

    if (!clientID || !clientSecret) {
      console.warn('⚠️  GitHub OAuth credentials not found in database or .env - OAuth will be disabled');
      console.warn('   Configure credentials in Settings page to enable GitHub authentication');
      return false;
    }

    // GitHub OAuth Strategy
    passport.use(new GitHubStrategy({
      clientID,
      clientSecret,
      callbackURL,
      scope: ['user:email', 'repo'] // Minimal required scopes
    }, async (accessToken, refreshToken, profile, done) => {
      try {
        // Check if user already exists
        let user = await User.findByGithubId(profile.id);
        
        if (user) {
          // Update existing user's access token and profile data
          user.accessToken = accessToken;
          user.username = profile.username;
          user.email = profile.emails?.[0]?.value || null;
          user.avatarUrl = profile.photos?.[0]?.value || null;
          await user.save();
          
          console.log(`🔄 Updated existing user: ${user.username}`);
        } else {
          // Create new user
          user = new User({
            githubId: profile.id,
            username: profile.username,
            email: profile.emails?.[0]?.value || null,
            avatarUrl: profile.photos?.[0]?.value || null,
            accessToken: accessToken,
            repositories: [] // Will be populated when user accesses repos
          });
          await user.save();
          
          console.log(`✅ Created new user: ${user.username}`);
        }
        
        return done(null, user);
      } catch (error) {
        console.error('❌ GitHub OAuth error:', error);
        return done(error, null);
      }
    }));

    isOAuthConfigured = true;
    console.log('✅ GitHub OAuth strategy configured successfully');
    return true;
  } catch (error) {
    console.error('❌ Failed to initialize GitHub OAuth:', error);
    return false;
  }
}

/**
 * Reinitialize OAuth when settings are updated
 */
async function reinitializeOAuth() {
  if (isOAuthConfigured) {
    // Remove existing strategy
    passport.unuse('github');
    isOAuthConfigured = false;
  }
  
  return await initializeOAuth();
}

/**
 * Check if OAuth is configured and available
 */
function isOAuthReady() {
  return isOAuthConfigured;
}

// Export passport instance and initialization functions
export default passport;
export { initializeOAuth, reinitializeOAuth, isOAuthReady }; 