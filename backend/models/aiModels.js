import mongoose from 'mongoose';

/**
 * AI Service Models
 * Mongoose schemas for AI analysis caching and data storage
 */

// Commit Analysis Schema
const commitAnalysisSchema = new mongoose.Schema({
  commitHash: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  message: {
    type: String,
    required: true
  },
  category: {
    type: String,
    required: true,
    enum: ['feature', 'bugfix', 'refactor', 'docs', 'other']
  },
  confidence: {
    type: Number,
    required: true,
    min: 0,
    max: 1
  },
  reason: {
    type: String,
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  analyzedAt: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true
});

// Daily Summary Schema
const dailySummarySchema = new mongoose.Schema({
  date: {
    type: String,
    required: true,
    index: true
  },
  repositoryId: {
    type: String,
    required: true,
    index: true
  },
  summary: {
    type: String,
    required: true
  },
  commitCount: {
    type: Number,
    required: true
  },
  categories: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  }
}, {
  timestamps: true
});

// Task Suggestion Schema
const taskSuggestionSchema = new mongoose.Schema({
  repositoryId: {
    type: String,
    required: true,
    index: true
  },
  workSignature: {
    type: String,
    required: true,
    index: true
  },
  tasks: [{
    title: String,
    description: String,
    priority: {
      type: String,
      enum: ['high', 'medium', 'low']
    },
    category: {
      type: String,
      enum: ['feature', 'bugfix', 'refactor', 'docs', 'testing']
    },
    estimatedTime: String
  }],
  baseCommits: [String]
}, {
  timestamps: true
});

// Compound indexes for optimal queries
dailySummarySchema.index({ date: 1, repositoryId: 1 }, { unique: true });
taskSuggestionSchema.index({ repositoryId: 1, workSignature: 1, createdAt: 1 });

// Export models
export const CommitAnalysis = mongoose.model('CommitAnalysis', commitAnalysisSchema);
export const DailySummary = mongoose.model('DailySummary', dailySummarySchema);
export const TaskSuggestion = mongoose.model('TaskSuggestion', taskSuggestionSchema); 