/**
 * Message Repository
 * Handles message-related database operations
 */
const BaseRepository = require('../core/BaseRepository');

class MessageRepository extends BaseRepository {
  constructor() {
    super('messages');
  }

  /**
   * Create a new message
   * @param {Object} messageData - Message data
   * @returns {Promise<Object>} Created message
   */
  async createMessage(messageData) {
    const { conversation_id, sender_id, content, content_type = 'text', attachments = null } = messageData;
    
    const text = `
      INSERT INTO messages (conversation_id, sender_id, content, content_type, attachments)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    
    const result = await this.executeQuery(text, [conversation_id, sender_id, content, content_type, attachments]);
    return result.rows[0];
  }

  /**
   * Get messages for a conversation
   * @param {string} conversationId - Conversation ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Messages
   */
  async getConversationMessages(conversationId, options = {}) {
    const { limit = 50, offset = 0, before = null } = options;
    
    let text = `
      SELECT 
        m.*,
        u.name as sender_name,
        u.email as sender_email,
        ms.delivered_at,
        ms.read_at
      FROM messages m
      LEFT JOIN users u ON m.sender_id = u.id
      LEFT JOIN message_statuses ms ON m.id = ms.message_id
      WHERE m.conversation_id = $1
    `;
    
    const params = [conversationId];
    let paramIndex = 2;
    
    if (before) {
      text += ` AND m.created_at < $${paramIndex}`;
      params.push(before);
      paramIndex++;
    }
    
    text += ` ORDER BY m.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);
    
    const result = await this.executeQuery(text, params);
    return result.rows;
  }

  /**
   * Get message by ID with sender info
   * @param {string} messageId - Message ID
   * @returns {Promise<Object>} Message with sender info
   */
  async getMessageById(messageId) {
    const text = `
      SELECT 
        m.*,
        u.name as sender_name,
        u.email as sender_email
      FROM messages m
      LEFT JOIN users u ON m.sender_id = u.id
      WHERE m.id = $1
    `;
    
    const result = await this.executeQuery(text, [messageId]);
    return result.rows[0] || null;
  }

  /**
   * Update message content
   * @param {string} messageId - Message ID
   * @param {string} content - New content
   * @returns {Promise<Object>} Updated message
   */
  async updateMessage(messageId, content) {
    const text = `
      UPDATE messages 
      SET content = $2, edited = true
      WHERE id = $1
      RETURNING *
    `;
    
    const result = await this.executeQuery(text, [messageId, content]);
    return result.rows[0];
  }

  /**
   * Delete message
   * @param {string} messageId - Message ID
   * @returns {Promise<boolean>} True if deleted
   */
  async deleteMessage(messageId) {
    const text = `DELETE FROM messages WHERE id = $1`;
    const result = await this.executeQuery(text, [messageId]);
    return result.rowCount > 0;
  }

  /**
   * Mark message as delivered for a user
   * @param {string} messageId - Message ID
   * @param {number} userId - User ID
   * @returns {Promise<Object>} Message status
   */
  async markAsDelivered(messageId, userId) {
    const text = `
      INSERT INTO message_statuses (message_id, user_id, delivered_at)
      VALUES ($1, $2, now())
      ON CONFLICT (message_id, user_id) 
      DO UPDATE SET delivered_at = now()
      RETURNING *
    `;
    
    const result = await this.executeQuery(text, [messageId, userId]);
    return result.rows[0];
  }

  /**
   * Mark message as read for a user
   * @param {string} messageId - Message ID
   * @param {number} userId - User ID
   * @returns {Promise<Object>} Message status
   */
  async markAsRead(messageId, userId) {
    const text = `
      INSERT INTO message_statuses (message_id, user_id, read_at)
      VALUES ($1, $2, now())
      ON CONFLICT (message_id, user_id) 
      DO UPDATE SET read_at = now()
      RETURNING *
    `;
    
    const result = await this.executeQuery(text, [messageId, userId]);
    return result.rows[0];
  }

  /**
   * Get unread message count for a user in a conversation
   * @param {string} conversationId - Conversation ID
   * @param {number} userId - User ID
   * @returns {Promise<number>} Unread count
   */
  async getUnreadCount(conversationId, userId) {
    const text = `
      SELECT COUNT(*) as count
      FROM messages m
      LEFT JOIN message_statuses ms ON m.id = ms.message_id AND ms.user_id = $2
      WHERE m.conversation_id = $1 
      AND m.sender_id != $2
      AND (ms.read_at IS NULL OR ms.read_at < m.created_at)
    `;
    
    const result = await this.executeQuery(text, [conversationId, userId]);
    return parseInt(result.rows[0].count);
  }

  /**
   * Get message statistics for a conversation
   * @param {string} conversationId - Conversation ID
   * @returns {Promise<Object>} Message statistics
   */
  async getMessageStats(conversationId) {
    const text = `
      SELECT 
        COUNT(*) as total_messages,
        COUNT(CASE WHEN content_type = 'text' THEN 1 END) as text_messages,
        COUNT(CASE WHEN content_type = 'image' THEN 1 END) as image_messages,
        COUNT(CASE WHEN content_type = 'file' THEN 1 END) as file_messages,
        COUNT(CASE WHEN edited = true THEN 1 END) as edited_messages,
        MIN(created_at) as first_message_at,
        MAX(created_at) as last_message_at
      FROM messages 
      WHERE conversation_id = $1
    `;
    
    const result = await this.executeQuery(text, [conversationId]);
    return result.rows[0];
  }

  /**
   * Search messages in a conversation
   * @param {string} conversationId - Conversation ID
   * @param {string} searchTerm - Search term
   * @param {Object} options - Search options
   * @returns {Promise<Array>} Matching messages
   */
  async searchMessages(conversationId, searchTerm, options = {}) {
    const { limit = 20, offset = 0 } = options;
    
    const text = `
      SELECT 
        m.*,
        u.name as sender_name,
        u.email as sender_email
      FROM messages m
      LEFT JOIN users u ON m.sender_id = u.id
      WHERE m.conversation_id = $1 
      AND m.content ILIKE $2
      ORDER BY m.created_at DESC
      LIMIT $3 OFFSET $4
    `;
    
    const searchPattern = `%${searchTerm}%`;
    const result = await this.executeQuery(text, [conversationId, searchPattern, limit, offset]);
    return result.rows;
  }
}

module.exports = MessageRepository;
