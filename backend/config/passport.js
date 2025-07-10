import passport from 'passport';
import { Strategy as GitHubStrategy } from 'passport-github2';
import User from '../models/User.js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Ensure environment variables are loaded
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env') });

/**
 * Passport configuration for GitHub OAuth
 * Implements secure authentication flow with user persistence
 */

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

// GitHub OAuth Strategy
passport.use(new GitHubStrategy({
  clientID: process.env.GITHUB_CLIENT_ID,
  clientSecret: process.env.GITHUB_CLIENT_SECRET,
  callbackURL: process.env.GITHUB_CALLBACK_URL,
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

export default passport; 