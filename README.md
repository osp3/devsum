# DevSum - AI-Powered Git Analytics Platform

DevSum is a sophisticated development analytics platform that leverages AI to provide intelligent insights into your coding activities. Track your progress, analyze code quality, and get AI-generated recommendations for improved productivity.

## 🚀 Features

### 📊 **Intelligent Dashboard**

- **Yesterday's Development Summary**: AI-generated overview of your coding activities
- **Repository Metrics**: Real-time statistics across all your GitHub repositories  
- **Tomorrow's Priorities**: AI-suggested tasks based on recent development patterns
- **Quality Analytics**: Code quality trends and improvement recommendations

### 🤖 **AI-Powered Analysis**

- **Commit Categorization**: Automatic categorization (feature, bugfix, refactor, docs)
- **Code Quality Assessment**: Line-by-line analysis with improvement suggestions
- **Pattern Recognition**: Identifies development trends and productivity patterns
- **Smart Caching**: MongoDB-based caching system to optimize AI API costs

### 🔐 **GitHub Integration**

- **OAuth Authentication**: Secure GitHub login with proper scope management
- **Repository Access**: Automatic discovery and analysis of public/private repos
- **Commit Analysis**: Deep-dive into individual commits with diff analysis
- **Rate Limit Handling**: Intelligent GitHub API usage with pagination support

### ⚡ **Performance Optimized**

- **Intelligent Caching**: 4-hour cache windows for AI analysis results
- **Browser Refresh Detection**: Smart cache bypassing for fresh data when needed
- **Graceful Error Handling**: Comprehensive error recovery and user feedback
- **Session Management**: Secure user sessions with configurable timeouts

## 🏗️ Architecture

```bash
devsum/
├── frontend/                 # React + Vite + TailwindCSS
│   ├── src/
│   │   ├── components/      # React components
│   │   │   ├── Dashboard.jsx          # Main dashboard
│   │   │   ├── RepoAnalytics.jsx      # Repository deep-dive
│   │   │   ├── CommitAnalysis.jsx     # Commit-level insights
│   │   │   ├── Settings.jsx           # User configuration
│   │   │   └── ...
│   │   └── styles/          # TailwindCSS configuration
├── backend/                  # Express + Node.js API
│   ├── controllers/         # Request handlers
│   ├── services/           # Business logic
│   │   ├── AICoordinator.js          # AI services coordinator (functional)
│   │   ├── GitHubAPIClient.js        # GitHub API client (functional)
│   │   ├── QualityAnalyzer.js        # Code quality analysis
│   │   ├── YesterdaySummaryService.js # Daily summaries
│   │   └── CacheManager.js           # MongoDB caching
│   ├── models/             # MongoDB schemas
│   ├── routes/             # API routes
│   ├── config/             # Database & OAuth setup
│   └── middleware/         # Authentication & security
└── README.md               # This file
```

## 🚀 Quick Start

### Prerequisites

- **Node.js** >= 18.0.0
- **MongoDB** (local or Atlas)
- **GitHub OAuth App** (for authentication)
- **OpenAI API Key** (for AI features)

### 1. Clone and Install

```bash
git clone <repository-url>
cd devsum
npm run install:all
```

### 2. Configure Environment

Create `backend/.env` from the example:

```bash
cp backend/env.example backend/.env
```

Edit `backend/.env` with your credentials:

```bash
# Database
MONGODB_URI=mongodb://localhost:27017/devsum

# GitHub OAuth (create at https://github.com/settings/applications/new)
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
GITHUB_CALLBACK_URL=http://localhost:3000/auth/github/callback

# OpenAI API
OPENAI_API_KEY=your-openai-api-key

# Security
SESSION_SECRET=your-random-session-secret
```

### 3. Start Development

```bash
npm run dev
```

This launches:

- **Frontend**: http://localhost:5173
- **Backend**: http://localhost:3000

## 📋 Available Scripts

### Root Level

- `npm run dev` - Start both frontend and backend
- `npm run dev:frontend` - Frontend only
- `npm run dev:backend` - Backend only  
- `npm run build` - Build frontend for production
- `npm run install:all` - Install all dependencies

### Backend Specific

```bash
cd backend
npm run dev          # Development with auto-restart
npm run start        # Production server
npm run test-caching # Test caching functionality
```

### Frontend Specific  

```bash
cd frontend
npm run dev          # Development server
npm run build        # Production build
npm run preview      # Preview production build
```

## 🔧 Configuration

### GitHub OAuth Setup

1. Go to [GitHub Developer Settings](https://github.com/settings/applications/new)
2. Create new OAuth App:
   - **Application name**: DevSum
   - **Homepage URL**: http://localhost:5173
   - **Authorization callback URL**: http://localhost:3000/auth/github/callback
3. Copy Client ID and Secret to your `.env` file
4. Ensure your GitHub token has `repo` scope for private repository access

### MongoDB Setup

**Option 1: Local MongoDB**

```bash
# Install MongoDB locally
brew install mongodb/brew/mongodb-community
brew services start mongodb-community

# Use default connection
MONGODB_URI=mongodb://localhost:27017/devsum
```

**Option 2: MongoDB Atlas**

```bash
# Create free cluster at https://cloud.mongodb.com
# Get connection string and update .env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/devsum
```

### OpenAI Configuration

1. Get API key from [OpenAI Platform](https://platform.openai.com/api-keys)
2. Add to `.env` file:

   ```bash
   OPENAI_API_KEY=sk-your-api-key
   AI_MODEL=gpt-3.5-turbo  # or gpt-4 for better analysis
   ```

## 📱 Application Pages

### **Dashboard** (`/dashboard`)

- Yesterday's AI-generated development summary
- Repository metrics and statistics
- Tomorrow's priority recommendations
- Quick navigation to detailed views

### **Repositories** (`/repositories`)

- Grid view of all accessible GitHub repositories
- Repository status and recent activity
- Quick access to detailed analytics

### **Repository Analytics** (`/repository`)

- Deep-dive analysis of specific repository
- Commit history with AI categorization
- Code quality trends over time
- Individual commit analysis access

### **Commit Analysis** (`/commit-analysis`)

- Detailed AI analysis of specific commits
- Code quality assessment with line-by-line feedback
- Improvement suggestions and best practices
- Impact analysis and recommendations

### **Settings** (`/settings`)

- Environment variable management
- GitHub OAuth configuration
- AI model preferences
- Cache management controls

## 🛠️ Development Workflow

### Making Changes

1. **Frontend Changes**: Hot reload enabled, changes reflect immediately
2. **Backend Changes**: Nodemon auto-restarts server on file changes
3. **Database Changes**: Update models in `backend/models/`
4. **API Changes**: Add routes in `backend/routes/`, implement in `backend/controllers/`

### Adding New Features

**Frontend Component:**

```bash
# Create new component
touch frontend/src/components/NewFeature.jsx

# Add to index.js exports
echo "export { default as NewFeature } from './NewFeature.jsx';" >> frontend/src/components/index.js
```

**Backend Service:**

```bash
# Create new service
touch backend/services/NewService.js

# Add route in backend/routes/
# Add controller in backend/controllers/
```

## 🔍 API Endpoints

### Authentication

- `GET /auth/github` - GitHub OAuth login
- `GET /auth/github/callback` - OAuth callback
- `GET /auth/me` - Get current user
- `POST /auth/logout` - Logout

### Data APIs

- `GET /api/repos` - Get user repositories
- `POST /api/ai/yesterday-summary` - Generate daily summary
- `POST /api/ai/task-suggestions` - Get AI task recommendations
- `POST /api/ai/analyze-quality` - Analyze code quality

### Utility

- `GET /health` - System health check
- `GET /api/test` - API connectivity test

## 🧪 Testing

### Backend Testing

```bash
cd backend
npm run test-caching     # Test caching functionality
npm run test-refresh     # Test refresh mechanisms
```

### Manual Testing

```bash
# Test API endpoints
curl http://localhost:3000/health
curl http://localhost:3000/api/test

# Test frontend
open http://localhost:5173
```

## 📦 Production Deployment

### Frontend Deployment

```bash
npm run build
# Deploy frontend/dist/ to static hosting (Vercel, Netlify, etc.)
```

### Backend Deployment

```bash
cd backend
npm run start
# Deploy to Node.js hosting (Railway, Render, AWS, etc.)

# Environment variables needed in production:
# - MONGODB_URI (MongoDB Atlas recommended)
# - GITHUB_CLIENT_ID & GITHUB_CLIENT_SECRET
# - OPENAI_API_KEY
# - SESSION_SECRET (use strong random string)
# - FRONTEND_URL (your frontend domain)
```

## 🚨 Troubleshooting

### Common Issues

**"Cannot connect to MongoDB"**

- Ensure MongoDB is running locally OR Atlas connection string is correct
- Check firewall settings for MongoDB port (27017)

**"GitHub OAuth not working"**

- Verify OAuth app callback URL matches your backend URL
- Ensure `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` are correct
- Check that OAuth app is not suspended

**"OpenAI API errors"**

- Verify API key is valid and has credits
- Check if you've exceeded rate limits
- Ensure `OPENAI_API_KEY` environment variable is set

**"Cache not working"**

- Check MongoDB connection for cache storage
- Verify sufficient disk space for MongoDB
- Check browser console for cache-related errors

### Debug Mode

```bash
# Enable debug logging
NODE_ENV=development npm run dev:backend

# Check MongoDB collections
mongosh devsum --eval "db.dailysummaries.find().limit(5)"
```

## 🤝 Contributing

For detailed contributing guidelines, see [GITHUB_WORKFLOW.md](GITHUB_WORKFLOW.md).

### Quick Contribution Steps

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'feat: add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`  
5. Open Pull Request

## 📄 License

This project is licensed under the ISC License.

## 🛡️ Security

- All API endpoints require authentication
- GitHub OAuth tokens are securely stored
- MongoDB connections use SSL in production
- Session secrets should be rotated regularly
- OpenAI API keys should be restricted by usage limits

---

**Built with ❤️ using React, Express, MongoDB, and OpenAI**
