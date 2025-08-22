const {io} = require("../server");

class SocketService {
  // Send notification to specific user
  static sendNotification(userId, notification) {
    io.to(`notifications_${userId}`).emit('new_notification', notification);
  }

  // Send upload progress to user
  static sendUploadProgress(userId, progressData) {
    io.to(`user_${userId}`).emit('upload_progress_update', progressData);
  }

  // Broadcast to all connected users
  static broadcastToAll(event, data) {
    io.emit(event, data);
  }

  // Send to specific room
  static sendToRoom(room, event, data) {
    io.to(room).emit(event, data);
  }
}

module.exports = { SocketService };