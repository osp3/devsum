// Load environment variables FIRST, before any other imports
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Get the directory of this file
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from backend directory
dotenv.config({ path: join(__dirname, '.env') });

// import other modules that depend on environment variables
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import session from 'express-session';
import connectDB from './config/database.js';
import passport from './config/passport.js';
console.log('Importing auth routes...');
import authRoutes from './routes/auth.js';
console.log('Importing API routes...');
import apiRoutes from './routes/api.js';
console.log('Importing AI routes...');
import aiRoutes from './routes/ai.js';
console.log('✅ All route imports completed');

// Connect to MongoDB
await connectDB();

// Create Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware (helmet)
app.use(helmet({
  // Allow GitHub OAuth redirects
  contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false,
  // Enable HSTS only in production
  hsts: process.env.NODE_ENV === 'production'
}));

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session configuration for Passport
if (!process.env.SESSION_SECRET) {
  console.error('❌ FATAL: SESSION_SECRET environment variable is required');
  process.exit(1);
}

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    authenticated: !!req.user
  });
});

// Routes
console.log('🔗 Mounting auth routes on /auth');
app.use('/auth', authRoutes);
console.log('🔗 Mounting API routes on /api');
app.use('/api', apiRoutes);
console.log('🔗 Mounting AI routes on /api/ai');
app.use('/api/ai', aiRoutes);
console.log('✅ All routes mounted successfully');

// API test endpoint
app.get('/api/test', (req, res) => {
  res.json({
    message: 'DevSum Backend API is working!',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    authenticated: !!req.user,
    user: req.user ? req.user.username : null
  });
});

// Global error handling middleware
app.use((err, req, res, next) => {
  const defaultErr = {
    log: 'Express error handler caught unknown middleware error',
    status: 500,
    message: { err: 'An error occurred' },
  };
  const errorObj = Object.assign({}, defaultErr, err);
  console.log(errorObj.log);
  return res.status(errorObj.status).json(errorObj.message);
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔐 GitHub OAuth: http://localhost:${PORT}/auth/github`);
  console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received. Shutting down gracefully...');
  process.exit(0);
}); 