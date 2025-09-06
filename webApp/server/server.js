import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

// Import database connection
import connectDB from './config/database.js';

// Import route handlers
import sessionRoutes from './routes/sessions.js';
import labelRoutes from './routes/labels.js';
import profileRoutes from './routes/profiles.js';
import settingRoutes from './routes/settings.js';
import syncRoutes from './routes/sync.js';
import exportRoutes from './routes/export.js';

// Import models for initialization
import Session from './models/Session.js';
import Label from './models/Label.js';
import TimerProfile from './models/TimerProfile.js';
import AppSetting from './models/AppSetting.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3002;

// Security middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.'
  }
});

app.use('/api/', limiter);

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3001',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Middleware
app.use(compression());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Goodtime API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// API Routes
app.use('/api/sessions', sessionRoutes);
app.use('/api/labels', labelRoutes);
app.use('/api/timer-profiles', profileRoutes);
app.use('/api/settings', settingRoutes);
app.use('/api/sync', syncRoutes);
app.use('/api/export', exportRoutes);

// Initialize default data
async function initializeDefaultData() {
  try {
    console.log('🔧 Initializing default data...');

    // Create default label if it doesn't exist
    const defaultLabel = await Label.findOne({ id: 'default' });
    if (!defaultLabel) {
      await Label.create({
        id: 'default',
        title: 'Default',
        color: 0,
        archived: false,
        orderIndex: 0
      });
      console.log('✅ Default label created');
    }

    // Create default timer profile if it doesn't exist
    const defaultProfile = await TimerProfile.findOne({ name: '72/5' });
    if (!defaultProfile) {
      await TimerProfile.create({
        name: '72/5',
        isCountdown: true,
        workDuration: 72,
        isBreakEnabled: true,
        breakDuration: 5,
        isLongBreakEnabled: false,
        longBreakDuration: 15,
        sessionsBeforeLongBreak: 4,
        workBreakRatio: 3
      });
      console.log('✅ Default timer profile created');
    }

    // Create 25/5 profile if it doesn't exist
    const pomodoroProfile = await TimerProfile.findOne({ name: '25/5' });
    if (!pomodoroProfile) {
      await TimerProfile.create({
        name: '25/5',
        isCountdown: true,
        workDuration: 25,
        isBreakEnabled: true,
        breakDuration: 5,
        isLongBreakEnabled: true,
        longBreakDuration: 15,
        sessionsBeforeLongBreak: 4,
        workBreakRatio: 3
      });
      console.log('✅ Pomodoro timer profile created');
    }

    console.log('✅ Default data initialization completed');

  } catch (error) {
    console.error('❌ Error initializing default data:', error);
  }
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Server Error:', err);
  
  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({
      error: 'Validation failed',
      details: errors
    });
  }

  // MongoDB duplicate key error
  if (err.code === 11000) {
    return res.status(409).json({
      error: 'Resource already exists',
      details: 'A record with this identifier already exists'
    });
  }

  // Default error
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// Handle 404
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.originalUrl}`
  });
});

// Start server
async function startServer() {
  try {
    // Connect to MongoDB
    await connectDB();
    
    // Initialize default data
    await initializeDefaultData();
    
    // Start the server
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📍 Health check: http://localhost:${PORT}/api/health`);
      console.log(`🌐 API Base URL: http://localhost:${PORT}/api`);
      console.log(`🔄 CORS enabled for: ${process.env.FRONTEND_URL || 'http://localhost:3001'}`);
      
      if (process.env.NODE_ENV === 'development') {
        console.log('\n📚 Available API endpoints:');
        console.log('  GET    /api/health');
        console.log('  GET    /api/sessions');
        console.log('  POST   /api/sessions');
        console.log('  GET    /api/labels');
        console.log('  POST   /api/labels');
        console.log('  GET    /api/timer-profiles');
        console.log('  POST   /api/timer-profiles');
        console.log('  GET    /api/settings/:key');
        console.log('  PUT    /api/settings/:key');
        console.log('  POST   /api/sync');
        console.log('  GET    /api/export');
        console.log();
      }
    });
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('🔄 SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🔄 SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Start the server
startServer();