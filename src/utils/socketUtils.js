/**
 * Socket Utilities
 * Provides static methods for socket operations
 * Note: This is a utility wrapper around the main SocketService
 */

let socketServiceInstance = null;

// Initialize socket service reference
const initializeSocketService = (service) => {
  socketServiceInstance = service;
};

// Send notification to specific user
const sendNotification = (userId, notification) => {
  if (socketServiceInstance) {
    return socketServiceInstance.sendNotification(userId, notification);
  }
  console.warn('SocketService not initialized');
  return false;
};

// Send upload progress to user
const sendUploadProgress = (userId, progressData) => {
  if (socketServiceInstance) {
    return socketServiceInstance.sendUploadProgress(userId, progressData);
  }
  console.warn('SocketService not initialized');
  return false;
};

// Broadcast to all connected users
const broadcastToAll = (event, data) => {
  if (socketServiceInstance) {
    socketServiceInstance.broadcastToAll(event, data);
    return true;
  }
  console.warn('SocketService not initialized');
  return false;
};

// Send to specific room
const sendToRoom = (room, event, data) => {
  if (socketServiceInstance) {
    socketServiceInstance.sendToRoom(room, event, data);
    return true;
  }
  console.warn('SocketService not initialized');
  return false;
};

// Check if user is connected
const isUserConnected = (userId) => {
  if (socketServiceInstance) {
    return socketServiceInstance.isUserConnected(userId);
  }
  return false;
};

// Get connection statistics
const getConnectionStats = () => {
  if (socketServiceInstance) {
    return socketServiceInstance.getConnectionStats();
  }
  return null;
};

module.exports = {
  initializeSocketService,
  sendNotification,
  sendUploadProgress,
  broadcastToAll,
  sendToRoom,
  isUserConnected,
  getConnectionStats
};