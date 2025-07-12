/**
 * Test script for Yesterday Summary Caching
 * Tests the new caching functionality to ensure it works correctly
 */

import dotenv from 'dotenv';
import { YesterdaySummaryService } from './services/YesterdaySummaryService.js';
import { DailySummary } from './models/aiModels.js';
import connectDB from './config/database.js';

dotenv.config();

async function testYesterdayCaching() {
  console.log('🧪 Testing Yesterday Summary Caching...\n');
  
  try {
    // Connect to database
    await connectDB();
    
    // Create service instance (you'll need a valid access token)
    const accessToken = process.env.GITHUB_ACCESS_TOKEN || 'test-token';
    const summaryService = new YesterdaySummaryService(accessToken);
    
    // Clear any existing cached data for testing
    const today = new Date();
    today.setDate(today.getDate() - 1);
    const dateStr = today.toISOString().split('T')[0];
    
    console.log(`📅 Testing date: ${dateStr}`);
    
    // Clear cache for clean test
    await DailySummary.deleteMany({ 
      date: dateStr, 
      repositoryId: 'ALL_REPOS' 
    });
    console.log('🗑️  Cleared existing cache for testing\n');
    
    // Test 1: First call should generate and cache
    console.log('⏱️  Test 1: First call (should generate and cache)');
    const start1 = Date.now();
    const result1 = await summaryService.generateSummary();
    const duration1 = Date.now() - start1;
    
    console.log(`✅ First call completed in ${duration1}ms`);
    console.log(`📊 Summary: ${result1.summary.substring(0, 100)}...`);
    console.log(`📈 Commits: ${result1.commitCount}, Repos: ${result1.repositoryCount}\n`);
    
    // Test 2: Second call should use cache
    console.log('⚡ Test 2: Second call (should use cache)');
    const start2 = Date.now();
    const result2 = await summaryService.generateSummary();
    const duration2 = Date.now() - start2;
    
    console.log(`✅ Second call completed in ${duration2}ms`);
    console.log(`📊 Summary: ${result2.summary.substring(0, 100)}...`);
    console.log(`📈 Commits: ${result2.commitCount}, Repos: ${result2.repositoryCount}\n`);
    
    // Verify caching worked
    if (duration2 < duration1 * 0.3) { // Cache should be at least 70% faster
      console.log('🎉 CACHING SUCCESS! Second call was significantly faster');
      console.log(`⚡ Performance improvement: ${Math.round((duration1 - duration2) / duration1 * 100)}%`);
    } else {
      console.log('⚠️  Caching may not be working optimally');
    }
    
    // Verify data consistency
    if (JSON.stringify(result1) === JSON.stringify(result2)) {
      console.log('✅ Data consistency verified - cached data matches original');
    } else {
      console.log('❌ Data inconsistency detected between calls');
    }
    
    // Check database entry
    const cachedEntry = await DailySummary.findOne({ 
      date: dateStr, 
      repositoryId: 'ALL_REPOS' 
    });
    
    if (cachedEntry) {
      console.log('✅ Database entry confirmed');
      console.log(`📝 Cached summary length: ${cachedEntry.summary.length} characters`);
      console.log(`🗄️  Cache created: ${cachedEntry.createdAt}`);
    } else {
      console.log('❌ No database entry found');
    }
    
    console.log('\n🎯 Yesterday Summary Caching Test Complete!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    process.exit(0);
  }
}

// Run the test
testYesterdayCaching().catch(console.error); 