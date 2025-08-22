/**
 * Socket Service
 * Handles all Socket.io operations and connection tracking
 */
const jwt = require('jsonwebtoken');
const { config } = require('../config/app');

class SocketService {
  constructor(io) {
    this.io = io;
    this.connectedUsers = new Map(); // socketId -> userInfo
    this.userSockets = new Map(); // userId -> socketId
    this.setupSocketHandlers();
  }

  /**
   * Setup socket event handlers
   */
  setupSocketHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`🔌 New socket connection: ${socket.id}`);
      
      // Store socket info
      this.connectedUsers.set(socket.id, {
        id: socket.id,
        userId: null,
        userEmail: null,
        connectedAt: new Date(),
        isAuthenticated: false
      });

      // Handle user authentication
      socket.on('authenticate', (data) => this.handleAuthentication(socket, data));

      // Handle disconnect
      socket.on('disconnect', () => this.handleDisconnect(socket));

      // Handle custom events
      socket.on('ping', () => this.handlePing(socket));
      
      // Handle file upload progress
      socket.on('upload_progress', (data) => this.handleUploadProgress(socket, data));
    });
  }

  /**
   * Handle socket authentication
   * @param {Object} socket - Socket instance
   * @param {Object} data - Authentication data
   * @param {string} data.token - JWT access token
   */
  handleAuthentication(socket, data) {
    try {
      
      // Check if token is provided
      if (!data.token) {
        throw new Error('Access token is required');
      }

      // Verify JWT token
      const decoded = jwt.verify(data.token, config.jwtSecret);
      
      // Extract user information from token
      const userId = decoded.userId;
      const userEmail = decoded.email;
      
      if (!userId || !userEmail) {
        throw new Error('Invalid token payload: missing userId or email');
      }

      // Update socket info
      const userInfo = {
        id: socket.id,
        userId: userId,
        userEmail: userEmail,
        connectedAt: new Date(),
        isAuthenticated: true
      };
      
      // Store in tracking maps
      this.connectedUsers.set(socket.id, userInfo);
      this.userSockets.set(userId, socket.id);
      
      // Join user-specific room
      socket.join(`user_${userId}`);
      
      // Send success response to client
      socket.emit('authenticated', { 
        success: true, 
        userId: userId,
        userEmail: userEmail,
        message: 'Socket authentication successful'
      });
      
      // Broadcast user connected event to other clients
      socket.broadcast.emit('user_connected', {
        userId: userId,
        userEmail: userEmail,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.log(`❌ Socket authentication failed: ${error.message}`);
      socket.emit('authentication_error', { 
        message: 'Authentication failed',
        error: error.message
      });
    }
  }

  /**
   * Handle socket disconnect
   */
  handleDisconnect(socket) {
    const userInfo = this.connectedUsers.get(socket.id);
    
    if (userInfo && userInfo.isAuthenticated) {
      console.log(`🔌 User disconnected: ${userInfo.userEmail} (Socket: ${socket.id})`);
      
      // Remove from tracking maps
      if (userInfo.userId) {
        this.userSockets.delete(userInfo.userId);
      }
      
      // Emit user disconnected event
      socket.broadcast.emit('user_disconnected', {
        userId: userInfo.userId,
        userEmail: userInfo.userEmail,
        timestamp: new Date().toISOString()
      });
    } else {
      console.log(`🔌 Anonymous socket disconnected: ${socket.id}`);
    }
    
    // Clean up
    this.connectedUsers.delete(socket.id);
  }

  /**
   * Handle ping event
   */
  handlePing(socket) {
    socket.emit('pong', { timestamp: new Date().toISOString() });
  }

  /**
   * Handle upload progress
   */
  handleUploadProgress(socket, data) {
    const userInfo = this.connectedUsers.get(socket.id);
    if (userInfo && userInfo.isAuthenticated) {
      socket.to(`user_${userInfo.userId}`).emit('upload_progress_update', data);
    }
  }

  /**
   * Get connection statistics
   */
  getConnectionStats() {
    return {
      totalConnections: this.connectedUsers.size,
      authenticatedUsers: Array.from(this.connectedUsers.values()).filter(user => user.isAuthenticated).length,
      anonymousConnections: Array.from(this.connectedUsers.values()).filter(user => !user.isAuthenticated).length,
      connectedUsers: Array.from(this.connectedUsers.values()).map(user => ({
        socketId: user.id,
        userId: user.userId,
        userEmail: user.userEmail,
        isAuthenticated: user.isAuthenticated,
        connectedAt: user.connectedAt
      }))
    };
  }

  /**
   * Send notification to specific user
   */
  sendNotification(userId, notification) {
    const socketId = this.userSockets.get(userId);
    if (socketId) {
      this.io.to(socketId).emit('new_notification', notification);
      return true;
    }
    return false;
  }

  /**
   * Send upload progress to user
   */
  sendUploadProgress(userId, progressData) {
    const socketId = this.userSockets.get(userId);
    if (socketId) {
      this.io.to(socketId).emit('upload_progress_update', progressData);
      return true;
    }
    return false;
  }

  /**
   * Broadcast to all connected users
   */
  broadcastToAll(event, data) {
    this.io.emit(event, data);
  }

  /**
   * Send to specific room
   */
  sendToRoom(room, event, data) {
    this.io.to(room).emit(event, data);
  }

  /**
   * Check if user is connected
   */
  isUserConnected(userId) {
    return this.userSockets.has(userId);
  }

  /**
   * Get user's socket ID
   */
  getUserSocketId(userId) {
    return this.userSockets.get(userId);
  }

  /**
   * Force disconnect user
   */
  disconnectUser(userId) {
    const socketId = this.userSockets.get(userId);
    if (socketId) {
      const socket = this.io.sockets.sockets.get(socketId);
      if (socket) {
        socket.disconnect(true);
        return true;
      }
    }
    return false;
  }
}

module.exports = SocketService;
