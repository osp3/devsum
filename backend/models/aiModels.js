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
  },
  // Additional fields for yesterday summary caching
  repositoryCount: {
    type: Number,
    required: false // Optional for backward compatibility
  },
  repositories: [{
    id: String,
    name: String,
    fullName: String,
    commitCount: Number,
    _id: String
  }],
  formattedCommits: {
    type: mongoose.Schema.Types.Mixed,
    required: false // Optional for backward compatibility
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
      enum: ['feature', 'bugfix', 'refactor', 'docs', 'testing', 'optimization']
    },
    estimatedTime: String,
    basedOn: {
      type: String,
      required: true
    },
    repositories: [String]
  }],
  baseCommits: [String]
}, {
  timestamps: true
});

// !newschema quality analysis for ai
const qualityAnalysisSchema = new mongoose.Schema({
  repositoryId: {
    type: String,
    required: true,
    index: true
  },
  analysisDate: {
    type: String, // YYYY-MM-DD format for easy querying
    required: true,
    index: true
  },
  cacheKey: {
    type: String,
    required: true,
    index: true
  },
  qualityScore: {
    type: Number,
    required: true,
    min: 0,
    max: 1 // 0.0 = terrible code quality, 1.0 = excellent
  },
  issues: [{
    type: { 
      type: String, 
      enum: ['technical_debt', 'security', 'performance', 'maintainability', 'testing', 'code_quality']
    },
    severity: { 
      type: String, 
      enum: ['low', 'medium', 'high', 'critical'] 
    },
    description: String,
    suggestion: String,
    commitCount: Number,
    location: String // Optional location field for code issues
  }],
  insights: [String], // AI-generated observations
  recommendations: [String], // AI-generated actionable advice
  commitAnalyzed: Number, // How many commits were analyzed
  trends: {
    improvingAreas: [String], // Areas getting better
    concerningAreas: [String] // Areas getting worse
  },
  codeAnalysis: {
    commitsAnalyzed: Number,
    totalLinesAnalyzed: Number,
    insights: [{
      commitSha: String,
      commitMessage: String,
      linesChanged: Number,
      analysis: {
        severity: String,
        issues: [{
          type: { type: String },
          severity: { type: String },
          line: { type: String },
          description: { type: String },
          suggestion: { type: String },
          example: { type: String }
        }],
        positives: [String],
        overallAssessment: String,
        recommendedActions: [String]
      }
    }],
    summary: {
      totalCommitsAnalyzed: Number,
      totalIssuesFound: Number,
      criticalIssuesFound: Number,
      overallCodeHealth: String
    }
  },
  analysisMethod: String // 'enhanced' or 'basic'
}, {
  timestamps: true
});

// Compound indexes for optimal queries
dailySummarySchema.index({ date: 1, repositoryId: 1 }, { unique: true });
taskSuggestionSchema.index({ repositoryId: 1, workSignature: 1, createdAt: 1 });
// !quality analysis compound index
qualityAnalysisSchema.index({ repositoryId: 1, analysisDate: 1, cacheKey: 1 }, { unique: true });

// Enhanced Commits Cache Schema
const enhancedCommitsCacheSchema = new mongoose.Schema({
  repositoryId: {
    type: String,
    required: true,
    index: true
  },
  owner: {
    type: String,
    required: true
  },
  repo: {
    type: String,
    required: true
  },
  commits: [{
    sha: String,
    message: String,
    author: {
      name: String,
      email: String,
      date: Date
    },
    url: String,
    parents: [{ sha: String }],
    suggestedMessage: String,
    stats: {
      additions: Number,
      deletions: Number,
      total: Number
    }
  }],
  cacheKey: {
    type: String,
    required: true,
    unique: true
  },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 30 * 60 * 1000), // 30 minutes TTL
    index: { expireAfterSeconds: 0 }
  }
}, {
  timestamps: true
});

// Export models
export const CommitAnalysis = mongoose.model('CommitAnalysis', commitAnalysisSchema);
export const DailySummary = mongoose.model('DailySummary', dailySummarySchema);
export const TaskSuggestion = mongoose.model('TaskSuggestion', taskSuggestionSchema); 
// !quality analysis export
export const QualityAnalysis = mongoose.model('QualityAnalysis', qualityAnalysisSchema);
export const EnhancedCommitsCache = mongoose.model('EnhancedCommitsCache', enhancedCommitsCacheSchema);