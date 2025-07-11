import { formatCommit, formatDailyCommits } from './utils/commitFormatter.js';

// Test with sample commit data that matches GitHub API structure
const sampleCommits = [
  {
    sha: 'abc123def456',
    message: 'Add user authentication feature',
    author: {
      name: 'John Doe',
      email: 'john@example.com',
      date: '2024-01-15T10:30:00Z'
    },
    url: 'https://github.com/user/repo/commit/abc123',
    repository: {
      id: '123',
      name: 'frontend-app',
      fullName: 'user/frontend-app'
    }
  },
  {
    sha: 'def456ghi789',
    message: 'fix: resolve login bug',
    author: {
      name: 'Jane Smith',
      email: 'jane@example.com',
      date: '2024-01-15T11:15:00Z'
    },
    url: 'https://github.com/user/repo/commit/def456',
    repository: {
      id: '456',
      name: 'backend-api',
      fullName: 'user/backend-api'
    }
  },
  {
    sha: 'ghi789jkl012',
    message: 'Update README documentation',
    author: {
      name: 'Bob Wilson',
      email: 'bob@example.com',
      date: '2024-01-15T14:45:00Z'
    },
    url: 'https://github.com/user/repo/commit/ghi789',
    repository: {
      id: '789',
      name: 'docs',
      fullName: 'user/docs'
    }
  }
];

console.log('🧪 Testing Commit Formatter');
console.log('='.repeat(50));

console.log('\n1️⃣ Testing individual commit formatting:');
sampleCommits.forEach((commit, index) => {
  console.log(`\nCommit ${index + 1}:`);
  console.log(`  Original: ${commit.message}`);
  
  try {
    const formatted = formatCommit(commit);
    console.log(`  Formatted: ${formatted.formatted}`);
    console.log(`  Type: ${formatted.type}, Scope: ${formatted.scope}`);
    console.log(`  Repository: ${formatted.repository}`);
    console.log(`  SHA: ${formatted.sha}`);
  } catch (error) {
    console.error(`  Error: ${error.message}`);
  }
});

console.log('\n2️⃣ Testing daily commits formatting:');
try {
  const result = formatDailyCommits(sampleCommits);
  console.log(`Total commits: ${result.total}`);
  console.log(`Repositories: ${Object.keys(result.byRepository).join(', ')}`);
  
  Object.entries(result.byRepository).forEach(([repo, commits]) => {
    console.log(`\n📁 ${repo} (${commits.length} commits):`);
    commits.forEach(commit => {
      console.log(`  • ${commit.formatted} [${commit.sha}]`);
    });
  });
} catch (error) {
  console.error(`Error in daily formatting: ${error.message}`);
}

console.log('\n3️⃣ Testing edge cases:');

// Test with malformed commit
const malformedCommit = {
  message: 'Some commit without proper structure'
  // Missing other fields
};

try {
  const formatted = formatCommit(malformedCommit);
  console.log(`Malformed commit handled: ${formatted.formatted}`);
} catch (error) {
  console.error(`Error with malformed commit: ${error.message}`);
}

// Test with empty array
try {
  const emptyResult = formatDailyCommits([]);
  console.log(`Empty array handled: ${JSON.stringify(emptyResult)}`);
} catch (error) {
  console.error(`Error with empty array: ${error.message}`);
}

console.log('\n✅ Commit formatter tests completed!'); 