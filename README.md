# DevSum - AI-Powered Development Analytics

DevSum is an intelligent development dashboard that uses AI to analyze your GitHub repositories, providing insights into code quality, development patterns, and productivity trends.

## ✨ Features

- **AI-Powered Analysis**: Automatic commit categorization and quality assessment using OpenAI
- **Repository Analytics**: Deep-dive analysis of commits, code quality, and development trends  
- **Daily Summaries**: AI-generated overviews of yesterday's development activities
- **Task Suggestions**: Smart recommendations for tomorrow's priorities based on recent patterns
- **GitHub Integration**: Secure OAuth authentication with access to public and private repositories

## 🏗️ Tech Stack

**Frontend**: React 19 + Vite + TailwindCSS + React Router  
**Backend**: Node.js + Express + MongoDB + Passport.js  
**AI**: OpenAI GPT-4 for analysis and insights  
**Authentication**: GitHub OAuth 2.0  

## 📱 Application Usage & Pages

### **Authentication Flow**

1. Visit the application at `http://localhost:5173`
2. Click "Login with GitHub" to authenticate via OAuth
3. Grant repository access permissions
4. Automatically redirected to the main dashboard

### **Main Application Pages**

#### **🏠 Dashboard** (`/dashboard`)

The main hub of your development analytics:

- **Today's Metrics**: Repository statistics and activity overview
- **Yesterday's Summary**: AI-generated analysis of your previous day's commits
- **Today's Priorities**: Smart AI recommendations for upcoming tasks

#### **📚 Repositories** (`/repositories`)

Browse and manage your GitHub repositories:

- Grid view of all accessible repositories (public and private)
- Repository status indicators and recent activity
- Quick navigation to detailed analytics
- Repository selection for focused analysis

#### **📊 Repository Analytics** (`/repository`)

Deep-dive analysis of a specific repository:

- **Commit History**: Chronological view with AI categorization
- **Code Quality Analysis**: Real-time quality assessment with progress tracking
- **Quality Trends**: Historical code quality metrics over time
- **Refresh Controls**: Manual refresh with progress indicators
- **Individual Commit Access**: Navigate to detailed commit analysis

#### **🔍 Commit Analysis** (`/commit-analysis`)

Detailed AI-powered analysis of specific commits:

- **Commit Details**: SHA, message, author, and timestamp
- **Code Quality Assessment**: Line-by-line analysis and suggestions
- **AI Categorization**: Automatic commit type classification (feat, fix, refactor, etc.)
- **Impact Analysis**: Understanding of changes and their implications
- **Improvement Recommendations**: AI-generated best practices and suggestions

#### **⚙️ Settings** (`/settings`)

Configure your DevSum experience:

- **OpenAI API Key**: Enter and manage your OpenAI API key
- **Model Selection**: Choose your preferred AI model (GPT-4, GPT-3.5-turbo, etc.)

**How to Configure Settings:**

1. Navigate to Settings from the user header menu
2. **OpenAI API Key**:
   - Enter your OpenAI API key in the designated field
   - Test the key to ensure it's working properly
3. **Choose Model**:
   - Select your preferred AI model from the dropdown
   - Available options include GPT-4, GPT-3.5-turbo, and other OpenAI models

### **Navigation Features**

- **User Header**: Always visible with user profile and navigation controls
- **Protected Routes**: All pages require GitHub authentication
- **State Persistence**: Selected repository and preferences maintained across pages
- **Responsive Design**: Optimized for desktop and mobile viewing

### **Key User Workflows**

**Daily Analysis Workflow:**

1. Start at Dashboard → View yesterday's summary and today's priorities
2. Navigate to Repositories → Select a repo for detailed analysis  
3. Use Repository Analytics → Review quality trends and recent commits
4. Drill into Commit Analysis → Get AI insights on specific changes

**Quality Improvement Workflow:**

1. Repository Analytics → Run quality analysis with progress tracking
2. Review quality metrics and trends over time
3. Commit Analysis → Examine individual commits flagged for improvement
4. Apply AI recommendations to enhance code quality

**Task Planning Workflow:**

1. Dashboard → Review AI-generated priority suggestions
2. Repositories → Identify repos needing attention
3. Repository Analytics → Understand current state and technical debt
4. Use insights to plan development tasks and priorities

## 🚀 Quick Setup

### Prerequisites

- Node.js >= 18.0.0
- MongoDB (local or Atlas)
- GitHub OAuth App
- OpenAI API key

### 1. Install Dependencies

```bash
git clone <repository-url>
cd devsum
npm run install-all
```

### 2. Configure Environment

```bash
cp backend/env.example backend/.env
```

Edit `backend/.env` with your credentials:

```bash
# Database
MONGODB_URI=mongodb://localhost:27017/devsum

# GitHub OAuth (create at https://github.com/settings/applications/new)
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret  
GITHUB_CALLBACK_URL=http://localhost:3000/auth/github/callback

# OpenAI
OPENAI_API_KEY=your_openai_api_key

# Session
SESSION_SECRET=your_random_session_secret
```

### 3. Start Development

```bash
npm run dev
```

Access the application:

- **Frontend**: http://localhost:5173
- **Backend**: http://localhost:3000

### 4. Configure via Settings UI (Alternative)

Instead of manually editing `.env`, you can configure credentials through the web interface:

1. Start the application with minimal `.env` (just MongoDB and session secret)
2. Login with GitHub OAuth
3. Navigate to **Settings** page to add your OpenAI API key
4. Test and validate all configurations through the UI

## 📋 Available Scripts

```bash
npm run dev           # Start both frontend and backend
npm run build         # Build frontend for production  
npm run start         # Start production server
npm run install-all   # Install all dependencies
npm run cleanup-ports # Kill processes on ports 3000 and 5173
```

## 🔧 GitHub OAuth Setup

1. Go to [GitHub Developer Settings](https://github.com/settings/applications/new)
2. Create new OAuth App:
   - **Application name**: DevSum
   - **Homepage URL**: http://localhost:5173
   - **Authorization callback URL**: http://localhost:3000/auth/github/callback
3. Copy Client ID and Secret to your `.env` file

## 📱 Application Flow

1. **Login** - Authenticate with GitHub OAuth
2. **Dashboard** - View yesterday's summary and today's metrics
3. **Repository Analysis** - Deep-dive into specific repositories
4. **Commit Analysis** - AI-powered code quality assessment
5. **Settings** - Configure AI preferences and environment

## 🛠️ Development

### Project Structure

```bash
devsum/
├── frontend/          # React application
│   ├── src/
│   │   ├── components/   # React components
│   │   └── hooks/        # Custom React hooks (useProgressTracking)
├── backend/           # Express API server
│   ├── controllers/      # Request handlers
│   ├── services/         # Business logic (functional pattern)
│   │   ├── ai/          # AI coordination and analysis
│   │   ├── tasks/       # Summary generation and progress tracking
│   │   ├── quality/     # Code quality analysis
│   │   └── external/    # GitHub API and caching
│   ├── routes/          # API endpoints
│   ├── models/          # MongoDB schemas
│   └── config/          # Database and authentication
```

### Key Architecture Decisions

- **Functional Services**: Modern functional programming pattern instead of classes
- **Progress Tracking**: Real-time progress updates for AI operations with polling
- **Intelligent Caching**: MongoDB-based caching to optimize AI API costs
- **Component-Based UI**: Reusable React components with TailwindCSS

## 🧪 Testing

```bash
cd backend
npm run test-caching     # Test MongoDB caching functionality
npm run test-refresh     # Test cache refresh mechanisms
```

## 📦 Production Deployment

### Frontend

```bash
npm run build
# Deploy frontend/dist/ to Vercel, Netlify, etc.
```

### Backend

```bash
cd backend
npm start
# Deploy to Railway, Render, AWS, etc.
```

### Environment Variables (Production)

- `MONGODB_URI` - MongoDB Atlas connection string
- `GITHUB_CLIENT_ID` & `GITHUB_CLIENT_SECRET` - GitHub OAuth credentials
- `OPENAI_API_KEY` - OpenAI API key
- `SESSION_SECRET` - Strong random string for session security
- `FRONTEND_URL` - Your frontend domain

## 👥 Contributors

- **Aasim Syed** - <aasim.ss@gmail.com> | [GitHub](https://github.com/aasimsyed)
- **Erik Kleiman** - <hekleiman@gmail.com> | [GitHub](https://github.com/Hekleiman)
- **Mari Anuashvili** - <m.anuashvili@gmail.com> | [GitHub](https://github.com/mariiamii)
- **Yuri Sabogal** - <yurisabogal@icloud.com> | [GitHub](https://github.com/ysabogal88)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'feat: add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is licensed under the ISC License.

---

**Built with ❤️ by the DevSum team**
