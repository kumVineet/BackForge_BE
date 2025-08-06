const express = require('express');
const router = express.Router();

// Import route modules
const authRoutes = require('./auth');
const userRoutes = require('./users');
const uploadRoutes = require('./uploads');
const workerRoutes = require('./workers');

// Mount routes
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/uploads', uploadRoutes);
router.use('/workers', workerRoutes);

// API info endpoint
router.get('/', (req, res) => {
  res.json({
    message: 'BackForge API',
    version: '1.0.0',
    endpoints: {
      auth: '/auth',
      users: '/users',
      uploads: '/uploads',
      workers: '/workers',
    }
  });
});

module.exports = router; 