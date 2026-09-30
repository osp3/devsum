import mongoose from 'mongoose';
import { DEFAULT_OPENAI_MODEL } from '../config/openaiModels.js';
import { decryptSecret, encryptSecret, isEncrypted } from '../utils/crypto.js';

/**
 * User Schema - Stores essential GitHub user data
 * Follows KISS principle with minimal required fields
 */
const userSchema = new mongoose.Schema({
  // GitHub OAuth data
  githubId: {
    type: String,
    required: true,
    unique: true
  },
  username: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: false, // GitHub email might be private
    trim: true,
    lowercase: true
  },
  avatarUrl: {
    type: String,
    required: false
  },
  // GitHub access token for API calls
  accessToken: {
    type: String,
    required: true,
    select: false, // Don't include in queries by default for security
    set: encryptSecret,
    get: decryptSecret
  },
  // User's personal OpenAI API key for AI features
  openaiApiKey: {
    type: String,
    required: false,
    select: false, // Don't include in queries by default for security
    set: encryptSecret,
    get: decryptSecret
  },
  // User's preferred OpenAI model
  openaiModel: {
    type: String,
    required: false,
    default: DEFAULT_OPENAI_MODEL
  },
  // IANA time zone and last dashboard visit, used to pre-generate the morning brief
  timeZone: {
    type: String,
    required: false
  },
  lastActiveAt: {
    type: Date,
    required: false
  },
  // User's GitHub repositories (we'll cache this)
  repositories: [{
    id: Number,
    name: String,
    fullName: String,
    private: Boolean,
    defaultBranch: String,
    updatedAt: Date
  }]
}, {
  timestamps: true, // Adds createdAt and updatedAt
  versionKey: false // Remove __v field
});

// Index for faster queries (githubId already has unique index)
userSchema.index({ username: 1 });
userSchema.index({ lastActiveAt: 1 });

// Instance method to get user's repositories
userSchema.methods.getRepositories = function() {
  return this.repositories;
};

// Static method to find by GitHub ID
userSchema.statics.findByGithubId = function(githubId) {
  return this.findOne({ githubId });
};

// Encrypt secrets stored before encryption at rest was added
userSchema.statics.encryptLegacySecrets = async function() {
  const legacy = { $exists: true, $not: /^enc:v1:/ };
  const users = await this.find({ $or: [{ accessToken: legacy }, { openaiApiKey: legacy }] })
    .select('+accessToken +openaiApiKey');

  for (const user of users) {
    for (const field of ['accessToken', 'openaiApiKey']) {
      const raw = user.get(field, null, { getters: false });
      if (raw && !isEncrypted(raw)) user.set(field, raw);
    }
    await user.save();
  }
  return users.length;
};

export default mongoose.model('User', userSchema); 