# DevSum Monorepo

A modern monorepo setup with Vite/React frontend and Express/Node.js backend using ES6 modules.

## 🏗️ Project Structure

```bash
devsum/
├── frontend/          # Vite + React application
├── backend/           # Express + Node.js API server
├── shared/            # Shared utilities and types
├── package.json       # Root workspace configuration
└── README.md          # This file
```

## 🚀 Quick Start

### Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0

### Installation

1. **Clone and install all dependencies:**

   ```bash
   npm run install:all
   ```

2. **Start both frontend and backend in development mode:**

   ```bash
   npm run dev
   ```

This will start:

- Frontend on `http://localhost:5173`
- Backend on `http://localhost:3000`

## 📋 Available Scripts

### Root Level Scripts

- `npm run dev` - Start both frontend and backend concurrently
- `npm run dev:frontend` - Start only the frontend
- `npm run dev:backend` - Start only the backend
- `npm run build` - Build the frontend for production
- `npm run install:all` - Install dependencies for all workspaces

### Frontend Scripts

```bash
cd frontend
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
```

### Backend Scripts

```bash
cd backend
npm run dev          # Start with nodemon (auto-restart)
npm run start        # Start production server
```

## 🔧 Configuration

### Frontend Configuration

- **Port:** 5173 (configured in `vite.config.js`)
- **Proxy:** API calls to `/api/*` are proxied to the backend
- **Build Output:** `frontend/dist/`

### Backend Configuration

- **Port:** 3000 (configurable via environment)
- **Environment:** Copy `backend/env.example` to `backend/.env` for custom config
- **API Endpoints:**
  - `GET /health` - Health check
  - `GET /api/test` - Test endpoint

## 🛠️ Development Workflow

1. **Make changes** to either frontend or backend
2. **Hot reload** is enabled for both applications
3. **API calls** from frontend automatically proxy to backend
4. **CORS** is configured for cross-origin requests

## 📁 Adding New Features

### Frontend

- Components: `frontend/src/components/`
- Pages: `frontend/src/pages/`
- Hooks: `frontend/src/hooks/`
- Utils: `frontend/src/utils/`

### Backend

- Routes: `backend/routes/`
- Controllers: `backend/controllers/`
- Middleware: `backend/middleware/`
- Utils: `backend/utils/`

### Shared

- Types: `shared/types/`
- Constants: `shared/constants/`
- Utils: `shared/utils/`

## 🏛️ Architecture & Best Practices

### Frontend (React + Vite)

- **KISS**: Simple component structure
- **DRY**: Reusable hooks and components
- **Performance**: Lazy loading and code splitting
- **Type Safety**: Consider adding TypeScript

### Backend (Express + ES6)

- **SOLID**: Single responsibility principle
- **Middleware**: Modular request processing
- **Error Handling**: Centralized error management
- **Security**: CORS and input validation
- **Logging**: Request/response logging

### Development

- **Hot Reload**: Instant feedback during development
- **Proxy Setup**: Seamless frontend-backend communication
- **Environment Management**: Separate dev/prod configs
- **Monorepo Benefits**: Shared dependencies and scripts

## 🚦 API Testing

Test the backend API:

```bash
# Health check
curl http://localhost:3000/health

# Test endpoint
curl http://localhost:3000/api/test
```

## 🔍 Troubleshooting

### Port Conflicts

- Frontend: Change port in `frontend/vite.config.js`
- Backend: Set `PORT=3001` in `backend/.env`

### CORS Issues

- Update `FRONTEND_URL` in backend environment config
- Check CORS middleware in `backend/server.js`

### Module Resolution

- Ensure `"type": "module"` is set in backend `package.json`
- Use ES6 import/export syntax consistently

## 📦 Production Deployment

### Frontend

```bash
npm run build:frontend
# Deploy frontend/dist/ to your static hosting
```

### Backend

```bash
cd backend
npm run start
# Deploy to your Node.js hosting platform
```
