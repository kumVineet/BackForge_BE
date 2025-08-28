const express = require('express');
const router = express.Router();

// Import route modules
const authRoutes = require('./auth');
const userRoutes = require('./users');
const profileRoutes = require('./profiles');
const uploadRoutes = require('./uploads');
const workerRoutes = require('./workers');
const conversationRoutes = require('./conversations');
const messageRoutes = require('./messages');

// Mount routes
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/profiles', profileRoutes);
router.use('/uploads', uploadRoutes);
router.use('/workers', workerRoutes);
router.use('/conversations', conversationRoutes);
router.use('/messages', messageRoutes);

// API info endpoint
router.get('/', (req, res) => {
  res.json({
    message: 'BackForge API',
    version: '1.0.0',
    endpoints: {
      auth: '/auth',
      users: '/users',
      profiles: '/profiles',
      uploads: '/uploads',
      workers: '/workers',
      conversations: '/conversations',
      messages: '/messages'
    }
  });
});

module.exports = router; 