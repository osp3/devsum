import mongoose from 'mongoose';

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
    select: false // Don't include in queries by default for security
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

// Instance method to get user's repositories
userSchema.methods.getRepositories = function() {
  return this.repositories;
};

// Static method to find by GitHub ID
userSchema.statics.findByGithubId = function(githubId) {
  return this.findOne({ githubId });
};

export default mongoose.model('User', userSchema); 