import passport from 'passport';
import { Strategy as GitHubStrategy } from 'passport-github2';
import User from '../models/User.js';

/**
 * Passport configuration for GitHub OAuth
 * Uses a single shared GitHub OAuth app for all users
 * Each user gets their own access token when they authorize the app
 */

let isOAuthConfigured = false;

// Serialize user for session storage
passport.serializeUser((user, done) => {
  done(null, user._id);
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id).select('+accessToken'); // Include accessToken for GitHub API calls
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

/**
 * Initialize GitHub OAuth strategy with shared app credentials
 * Single OAuth app serves all users - each user gets their own access token
 */
async function initializeOAuth() {
  try {
    const clientID = process.env.GITHUB_CLIENT_ID;
    const clientSecret = process.env.GITHUB_CLIENT_SECRET;
    const callbackURL = process.env.GITHUB_CALLBACK_URL || 'http://localhost:3000/auth/github/callback';

    if (!clientID || !clientSecret) {
      console.warn('⚠️  GitHub OAuth credentials not found in .env - OAuth will be disabled');
      console.warn('   Set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET in .env to enable authentication');
      return false;
    }

    // GitHub OAuth Strategy - Single shared app for all users
    passport.use(new GitHubStrategy({
      clientID,
      clientSecret,
      callbackURL,
      scope: ['user:email', 'repo'] // Required scopes for DevSum functionality
    }, async (accessToken, refreshToken, profile, done) => {
      try {
        console.log(`🔐 GitHub OAuth callback for user: ${profile.username}`);
        
        // Check if user already exists by GitHub ID
        let user = await User.findByGithubId(profile.id);
        
        if (user) {
          // Update existing user with fresh access token and profile data
          user.accessToken = accessToken; // User-specific token from OAuth authorization
          user.username = profile.username;
          user.email = profile.emails?.[0]?.value || user.email; // Keep existing email if GitHub email is private
          user.avatarUrl = profile.photos?.[0]?.value || user.avatarUrl;
          await user.save();
          
          console.log(`🔄 Updated existing user: ${user.username} with fresh access token`);
        } else {
          // Create new user account
          user = new User({
            githubId: profile.id,
            username: profile.username,
            email: profile.emails?.[0]?.value || null,
            avatarUrl: profile.photos?.[0]?.value || null,
            accessToken: accessToken, // User-specific token from OAuth authorization
            repositories: [] // Will be populated when user accesses repos
          });
          await user.save();
          
          console.log(`✅ Created new user: ${user.username} with access token`);
        }
        
        return done(null, user);
      } catch (error) {
        console.error('❌ GitHub OAuth error:', error);
        return done(error, null);
      }
    }));

    isOAuthConfigured = true;
    console.log('✅ GitHub OAuth strategy configured with shared app credentials');
    console.log(`   Client ID: ${clientID.substring(0, 8)}...`);
    console.log(`   Callback URL: ${callbackURL}`);
    return true;
  } catch (error) {
    console.error('❌ Failed to initialize GitHub OAuth:', error);
    return false;
  }
}

/**
 * Check if OAuth is configured and available
 */
function isOAuthReady() {
  return isOAuthConfigured;
}

// Export passport instance and initialization function
export default passport;
export { initializeOAuth, isOAuthReady }; 