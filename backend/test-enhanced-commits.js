#!/usr/bin/env node

/**
 * Test Enhanced Commit Analysis
 * Tests the new AI-powered commit analysis functionality
 */

import dotenv from 'dotenv';
import AIService from './services/ai.js';
import { formatCommitObject } from './utils/CommitFormatter.js';
import { SummaryGenerator } from './services/SummaryGenerator.js';

// Load environment variables
dotenv.config();

// Mock commit data
const mockCommits = [
  {
    sha: 'abc123def456',
    message: 'Add user authentication system',
    author: { name: 'John Developer', date: '2024-01-15T10:30:00Z' },
    date: '2024-01-15T10:30:00Z'
  },
  {
    sha: 'def456ghi789',
    message: 'Fix memory leak in data processing',
    author: { name: 'Jane Developer', date: '2024-01-15T11:45:00Z' },
    date: '2024-01-15T11:45:00Z'
  },
  {
    sha: 'ghi789jkl012',
    message: 'Update README documentation',
    author: { name: 'Bob Developer', date: '2024-01-15T14:20:00Z' },
    date: '2024-01-15T14:20:00Z'
  }
];

// Mock repository
const mockRepo = {
  id: 12345,
  name: 'test-repo',
  fullName: 'user/test-repo'
};

// Mock diff data
const mockDiffs = {
  'abc123def456': `
+++ b/auth/middleware.js
@@ -0,0 +1,15 @@
+const jwt = require('jsonwebtoken');
+
+function validateToken(req, res, next) {
+  const token = req.headers.authorization?.split(' ')[1];
+  
+  if (!token) {
+    return res.status(401).json({ error: 'No token provided' });
+  }
+
+  try {
+    const decoded = jwt.verify(token, process.env.JWT_SECRET);
+    req.user = decoded;
+    next();
+  } catch (error) {
+    res.status(401).json({ error: 'Invalid token' });
+  }
+}
+
+module.exports = { validateToken };
  `,
  'def456ghi789': `
+++ b/processors/dataProcessor.js
@@ -45,8 +45,12 @@
   }
 
   processLargeDataset(data) {
-    const results = [];
-    data.forEach(item => {
-      results.push(this.processItem(item));
-    });
+    // Fix: Use streaming processing to avoid memory issues
+    return new Promise((resolve, reject) => {
+      const results = [];
+      const stream = data.createReadStream();
+      
+      stream.on('data', item => {
+        results.push(this.processItem(item));
+      });
+      
+      stream.on('end', () => resolve(results));
+      stream.on('error', reject);
+    });
   }
  `,
  'ghi789jkl012': `
+++ b/README.md
@@ -1,5 +1,25 @@
 # Test Repository
 
-Basic repository for testing
+A comprehensive testing repository for development workflows.
+
+## Features
+
+- User authentication system
+- Data processing pipeline
+- Automated testing suite
+
+## Installation
+
+\`\`\`bash
+npm install
+\`\`\`
+
+## Usage
+
+\`\`\`bash
+npm start
+\`\`\`
+
+## Contributing
+
+Please read CONTRIBUTING.md for details on our code of conduct.
  `
};

async function testEnhancedCommitAnalysis() {
  console.log('🧪 Testing Enhanced Commit Analysis\n');
  
  try {
    const enhancedCommits = [];
    
    // Test AI analysis for each commit
    for (const commit of mockCommits) {
      console.log(`\n📝 Testing commit: ${commit.sha.substring(0, 7)} - "${commit.message}"`);
      
      const diff = mockDiffs[commit.sha] || '';
      
      // Test AI analysis
      const aiAnalysis = await AIService.analyzeCommitDiff(commit, diff);
      console.log(`✅ AI Analysis Result:`, {
        suggestedMessage: aiAnalysis.suggestedMessage,
        confidence: aiAnalysis.confidence,
        diffSize: aiAnalysis.diffSize
      });
      
      // Test enhanced formatting
      const formattedCommit = formatCommitObject(commit, mockRepo, aiAnalysis);
      enhancedCommits.push(formattedCommit);
      
      console.log(`📋 Enhanced Commit Object:`, {
        original: formattedCommit.formatted,
        aiSuggestion: formattedCommit.aiAnalysis?.suggestedMessage,
        hasAI: !!formattedCommit.aiAnalysis
      });
    }
    
    console.log('\n📊 Testing Enhanced Summary Generation');
    
    // Test enhanced summary generation
    const summary = SummaryGenerator.generateFormattedSummary(enhancedCommits, 1);
    console.log('\n✅ Enhanced Summary:');
    console.log(summary);
    
    // Test structured commits
    const structuredCommits = SummaryGenerator.structureFormattedCommits(enhancedCommits);
    console.log('\n📈 Structured Commits:');
    console.log(`Total: ${structuredCommits.total}`);
    console.log(`Repositories: ${Object.keys(structuredCommits.byRepository).length}`);
    console.log(`Commits with AI: ${structuredCommits.allCommits.filter(c => c.aiAnalysis).length}`);
    
    console.log('\n🎉 All tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
  }
}

// Run the test
testEnhancedCommitAnalysis(); 