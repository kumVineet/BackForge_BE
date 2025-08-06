const path = require('path');
const dotenv = require('dotenv');

// Load environment-specific configuration
const env = process.env.NODE_ENV || 'development';
const envFile = path.join(__dirname, '../../.env.' + env);
dotenv.config({ path: envFile });

const config = {
  // Server Configuration
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // API Configuration
  apiPrefix: process.env.API_PREFIX || '/api/v1',
  corsOrigin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : ['http://localhost:3000'],
  
  // JWT Configuration
  jwtSecret: process.env.JWT_SECRET || 'fallback-secret-key',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '15m',
  refreshTokenExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '30d',
  
  // Logging
  logLevel: process.env.LOG_LEVEL || 'info',
  
  // Security
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000, // 15 minutes
  rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  
  // Worker Threads Configuration
  maxWorkers: parseInt(process.env.MAX_WORKERS) || 4,
  workerTimeout: parseInt(process.env.WORKER_TIMEOUT) || 30000, // 30 seconds
  

  
  // File Storage Configuration
  uploadDir: process.env.UPLOAD_DIR || 'uploads',
  storageType: process.env.STORAGE_TYPE || 'local', // 'local', 's3', 'cloudinary'
  
  // AWS S3 Configuration
  aws: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION || 'us-east-1',
    bucketName: process.env.AWS_S3_BUCKET
  },
  
  // Cloudinary Configuration
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET
  },
  
  // Database (for reference)
  database: {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    name: process.env.DB_NAME,
    user: process.env.DB_USER,
    ssl: process.env.DB_SSL === 'true'
  }
};

// Validate required configuration
const validateConfig = () => {
  const required = ['jwtSecret', 'database.host', 'database.name', 'database.user'];
  const missing = [];
  
  required.forEach(key => {
    const value = key.split('.').reduce((obj, k) => obj && obj[k], config);
    if (!value) {
      missing.push(key);
    }
  });
  
  if (missing.length > 0) {
    throw new Error(`Missing required configuration: ${missing.join(', ')}`);
  }
};

module.exports = {
  config,
  validateConfig
}; 