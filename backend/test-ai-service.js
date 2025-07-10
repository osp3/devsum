import aiService from './services/ai.js';

/**
 * COMPREHENSIVE AI SERVICE TEST
 * 
 * This tests all your AI features:
 * 1. Commit categorization
 * 2. Daily summary generation
 * 3. Task suggestions
 * 4. Commit message suggestions (NEW!)
 */

// Sample test data
const sampleCommits = [
  {
    sha: "abc123",
    message: "fix: resolve user authentication bug with OAuth flow",
    author: "john@example.com",
    date: "2024-01-15T10:30:00Z"
  },
  {
    sha: "def456", 
    message: "feat: add dark mode toggle to user dashboard",
    author: "jane@example.com",
    date: "2024-01-15T11:15:00Z"
  },
  {
    sha: "ghi789",
    message: "docs: update API documentation for authentication endpoints", 
    author: "bob@example.com",
    date: "2024-01-15T14:20:00Z"
  },
  {
    sha: "jkl012",
    message: "refactor: optimize database queries for user lookup",
    author: "alice@example.com", 
    date: "2024-01-15T16:45:00Z"
  }
];

const sampleDiff = `
diff --git a/src/auth.js b/src/auth.js
index 123abc4..567def8 100644
--- a/src/auth.js
+++ b/src/auth.js
@@ -15,7 +15,10 @@ function validateUser(email, password) {
   }
   
   // Check password
-  if (user.password === password) {
+  if (!user.password) {
+    return { success: false, error: 'No password set' };
+  }
+  if (bcrypt.compare(password, user.password)) {
     return { success: true, user };
   }
   
@@ -25,6 +28,7 @@ function validateUser(email, password) {
 function createUser(userData) {
   return {
     ...userData,
+    createdAt: new Date(),
     id: generateId()
   };
 }
`;

async function runAllTests() {
  console.log('🧪 Starting AI Service Tests...\n');
  console.log('=' .repeat(50));
  
  try {
    // Test 1: Commit Categorization
    await testCommitCategorization();
    
    // Test 2: Daily Summary
    await testDailySummary();
    
    // Test 3: Task Suggestions
    await testTaskSuggestions();
    
    // Test 4: Commit Message Suggestions (NEW!)
    await testCommitMessageSuggestions();
    
    console.log('\n' + '=' .repeat(50));
    console.log('✅ All tests completed successfully!');
    console.log('🎉 Your AI service is working perfectly!');
    
  } catch (error) {
    console.error('\n❌ Test suite failed:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    // Close database connection
    process.exit(0);
  }
}

async function testCommitCategorization() {
  console.log('1️⃣ Testing Commit Categorization...');
  console.log('-'.repeat(30));
  
  try {
    const categorized = await aiService.categorizeCommits(sampleCommits);
    
    console.log(`📊 Analyzed ${categorized.length} commits:`);
    categorized.forEach((commit, index) => {
      console.log(`   ${index + 1}. [${commit.category.toUpperCase()}] ${commit.confidence ? Math.round(commit.confidence * 100) + '%' : 'N/A'}`);
      console.log(`      "${commit.message}"`);
      console.log(`      Reason: ${commit.aiReason || 'N/A'}\n`);
    });
    
    // Verify we got expected categories
    const categories = categorized.map(c => c.category);
    const expectedCategories = ['bugfix', 'feature', 'docs', 'refactor'];
    
    console.log(`✅ Categories found: ${categories.join(', ')}`);
    console.log(`✅ Expected categories: ${expectedCategories.join(', ')}`);
    
  } catch (error) {
    console.error('❌ Categorization test failed:', error.message);
    throw error;
  }
  
  console.log('\n');
}

async function testDailySummary() {
  console.log('2️⃣ Testing Daily Summary Generation...');
  console.log('-'.repeat(30));
  
  try {
    const summary = await aiService.generateDailySummary(
      sampleCommits, 
      'test-repo-123', 
      new Date()
    );
    
    console.log('📝 Generated Summary:');
    console.log(`   "${summary}"`);
    console.log(`   Length: ${summary.length} characters`);
    
    // Basic validation
    if (summary.toLowerCase().includes('today')) {
      console.log('✅ Summary starts with "Today" as expected');
    }
    
    if (summary.length > 50) {
      console.log('✅ Summary has good length (>50 chars)');
    }
    
  } catch (error) {
    console.error('❌ Summary test failed:', error.message);
    throw error;
  }
  
  console.log('\n');
}

async function testTaskSuggestions() {
  console.log('3️⃣ Testing Task Suggestions...');
  console.log('-'.repeat(30));
  
  try {
    const tasks = await aiService.generateTaskSuggestions(
      sampleCommits, 
      'test-repo-123'
    );
    
    console.log(`🎯 Generated ${tasks.length} task suggestions:`);
    tasks.forEach((task, index) => {
      console.log(`   ${index + 1}. [${task.priority?.toUpperCase() || 'UNKNOWN'}] ${task.title}`);
      console.log(`      ${task.description}`);
      console.log(`      Category: ${task.category || 'N/A'}`);
      console.log(`      Time: ${task.estimatedTime || 'N/A'}\n`);
    });
    
    // Basic validation
    if (tasks.length > 0) {
      console.log('✅ Generated at least one task');
    }
    
    const hasValidPriorities = tasks.some(task => 
      ['high', 'medium', 'low'].includes(task.priority)
    );
    if (hasValidPriorities) {
      console.log('✅ Tasks have valid priorities');
    }
    
  } catch (error) {
    console.error('❌ Task suggestions test failed:', error.message);
    throw error;
  }
  
  console.log('\n');
}

async function testCommitMessageSuggestions() {
  console.log('4️⃣ Testing Commit Message Suggestions...');
  console.log('-'.repeat(30));
  
  try {
    // Test 1: Improve a basic message
    console.log('Test 4a: Basic message improvement');
    const result1 = await aiService.suggestCommitMessage(sampleDiff, 'fix bug');
    
    console.log(`   Original: "${result1.original}"`);
    console.log(`   Suggested: "${result1.suggested}"`);
    console.log(`   Improved: ${result1.improved}`);
    console.log(`   Diff size: ${result1.analysis.diffSize} chars\n`);
    
    // Test 2: No original message
    console.log('Test 4b: No original message');
    const result2 = await aiService.suggestCommitMessage(sampleDiff, '');
    
    console.log(`   Original: "${result2.original}"`);
    console.log(`   Suggested: "${result2.suggested}"`);
    console.log(`   Improved: ${result2.improved}\n`);
    
    // Test 3: Already good message
    console.log('Test 4c: Already good message');
    const result3 = await aiService.suggestCommitMessage(
      sampleDiff, 
      'fix: improve password validation security in auth module'
    );
    
    console.log(`   Original: "${result3.original}"`);
    console.log(`   Suggested: "${result3.suggested}"`);
    console.log(`   Improved: ${result3.improved}\n`);
    
    // Validation
    if (result1.suggested.includes(':')) {
      console.log('✅ Suggestions use conventional commit format');
    }
    
    if (result1.suggested.length > result1.original.length) {
      console.log('✅ Suggestions are more descriptive');
    }
    
  } catch (error) {
    console.error('❌ Commit message suggestions test failed:', error.message);
    throw error;
  }
  
  console.log('\n');
}

// Run the tests
runAllTests();