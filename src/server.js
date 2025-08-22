const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const path = require('path');
const dotenv = require('dotenv');
const { Server } = require("socket.io");
const {createServer} = require("http");


// Load configuration
const { config, validateConfig } = require('./config/app');
const { testConnection } = require('./config/database');


// Load environment-specific configuration
const env = process.env.NODE_ENV || 'development';
const envFile = path.join(__dirname, '../.env.' + env);
dotenv.config({ path: envFile });

// Validate configuration
validateConfig();

const app = express();

const server = require('http').createServer(app);
const io = new Server(server, {
  cors: {
    origin: config.corsOrigin,
    credentials: true
  }
});

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: config.corsOrigin,
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimitWindowMs,
  max: config.rateLimitMaxRequests,
  message: {
    error: 'Too many requests from this IP, please try again later.'
  }
});
app.use(limiter);

// Compression middleware
app.use(compression());

// Logging middleware
if (config.nodeEnv === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

io.on('connection', (socket) => {
  console.log(`�� User connected: ${socket.id}`);

  // Handle user authentication
  socket.on('authenticate', (data) => {
    try {
      // Verify JWT token
      const decoded = jwt.verify(data.token, config.jwtSecret);
      socket.userId = decoded.userId;
      socket.userEmail = decoded.email;
      
      // Join user-specific room
      socket.join(`user_${decoded.userId}`);
      
      console.log(`✅ User authenticated: ${decoded.email}`);
      socket.emit('authenticated', { success: true });
      
    } catch (error) {
      console.log(`❌ Authentication failed: ${error.message}`);
      socket.emit('authentication_error', { message: 'Invalid token' });
    }
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log(`�� User disconnected: ${socket.id}`);
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv,
    uptime: process.uptime()
  });
});

// API routes
app.use(config.apiPrefix, require('./routes'));

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Global error handler:', err);
  
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  
  // Format error response
  const errorResponse = {
    error: {
      message: message,
      statusCode: statusCode
    }
  };

  // Add stack trace in development
  if (config.nodeEnv === 'development' && err.stack) {
    errorResponse.error.stack = err.stack;
  }

  // Add validation errors if present
  if (err.errors) {
    errorResponse.error.details = err.errors;
  }

  res.status(statusCode).json(errorResponse);
});

// Start server
const startServer = async () => {
  try {
    // Test database connection
    const dbConnected = await testConnection();
    if (!dbConnected) {
      console.error('Failed to connect to database. Exiting...');
      process.exit(1);
    }

    server.listen(config.port, () => {
      console.log(`🚀 Server running in ${config.nodeEnv} mode on port ${config.port}`);
      console.log(`�� Health check: http://localhost:${config.port}/health`);
      console.log(`�� API Base URL: http://localhost:${config.port}${config.apiPrefix}`);
      console.log(`🔌 Socket.io server: Active`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received. Shutting down gracefully...');
  process.exit(0);
});

// Start the server
startServer(); 

module.exports = { app, server, io };