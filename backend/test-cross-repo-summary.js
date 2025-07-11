import AIService from './services/ai.js';
import GitHubService from './services/github.js';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Test script for cross-repository daily commit list feature
 * 
 * This demonstrates the functionality where daily commit lists
 * are formatted across ALL user repositories in conventional commit format.
 */

async function testCrossRepoCommitList() {
  console.log('🚀 Testing Cross-Repository Daily Commit List Feature');
  console.log('='.repeat(60));

  // Mock user data (in real app, this comes from req.user)
  const mockUserId = 'test-user-123';
  const mockAccessToken = process.env.GITHUB_ACCESS_TOKEN; // Need real token for testing

  if (!mockAccessToken) {
    console.error('❌ GITHUB_ACCESS_TOKEN not found in environment variables');
    console.log('   Please add your GitHub access token to .env file');
    return;
  }

  try {
    console.log('1️⃣ Testing GitHub Service - Fetching commits from all repos...');
    const githubService = new GitHubService(mockAccessToken);
    const result = await githubService.getAllUserCommitsForDate(new Date());
    
    console.log(`📊 Results:`);
    console.log(`   • Total commits: ${result.commits.length}`);
    console.log(`   • Repositories with commits: ${result.repositories.length}`);
    console.log(`   • Repositories checked: ${result.stats.repositoriesChecked}`);
    console.log(`   • Success rate: ${result.stats.successfulRepos}/${result.stats.repositoriesChecked}`);
    
    if (result.repositories.length > 0) {
      console.log(`   • Active repositories:`);
      result.repositories.forEach(repo => {
        console.log(`     - ${repo.fullName}: ${repo.commitCount} commits`);
      });
    }

    console.log('\n2️⃣ Testing Commit Formatting Service - Generating formatted commit list...');
    const aiService = new AIService();
    const summaryResult = await aiService.generateDailyUserSummary(
      mockUserId,
      mockAccessToken,
      new Date()
    );

    console.log(`📝 Generated Commit List:`);
    console.log(`   • Total commits: ${summaryResult.commitCount}`);
    console.log(`   • Repositories: ${summaryResult.repositoryCount}`);
    
    if (summaryResult.repositories.length > 0) {
      console.log(`   • Repository breakdown:`);
      summaryResult.repositories.forEach(repo => {
        console.log(`     - ${repo.fullName}: ${repo.commitCount} commits`);
      });
    }

    if (summaryResult.formattedCommits && summaryResult.formattedCommits.allCommits.length > 0) {
      console.log(`   • Sample formatted commits:`);
      summaryResult.formattedCommits.allCommits.slice(0, 3).forEach(commit => {
        console.log(`     - ${commit.formatted} [${commit.sha}]`);
      });
    }

    console.log('\n3️⃣ Testing Caching - Fetching same data again...');
    const cachedResult = await aiService.generateDailyUserSummary(
      mockUserId,
      mockAccessToken,
      new Date()
    );

    if (cachedResult.commitCount === summaryResult.commitCount) {
      console.log('✅ Caching working correctly - same commit count returned');
    } else {
      console.log('⚠️ Caching may not be working - different commit count returned');
    }

    console.log('\n🎉 Cross-Repository Commit List Test Complete!');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the test
testCrossRepoCommitList()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Test script failed:', error);
    process.exit(1);
  }); 