/**
 * Conversation Repository
 * Handles conversation-related database operations
 */
const BaseRepository = require('../core/BaseRepository');

class ConversationRepository extends BaseRepository {
  constructor() {
    super('conversations');
  }

  /**
   * Create a new conversation
   * @param {Object} conversationData - Conversation data
   * @returns {Promise<Object>} Created conversation
   */
  async createConversation(conversationData) {
    const { type, title, metadata = {}, created_by } = conversationData;
    
    const text = `
      INSERT INTO conversations (type, title, metadata, created_by)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    
    const result = await this.executeQuery(text, [type, title, metadata, created_by]);
    return result.rows[0];
  }

  /**
   * Add member to conversation
   * @param {string} conversationId - Conversation ID
   * @param {number} userId - User ID
   * @param {string} role - Member role
   * @returns {Promise<Object>} Added member
   */
  async addMember(conversationId, userId, role = 'member') {
    const text = `
      INSERT INTO conversation_members (conversation_id, user_id, role)
      VALUES ($1, $2, $3)
      RETURNING *
    `;
    
    const result = await this.executeQuery(text, [conversationId, userId, role]);
    return result.rows[0];
  }

  /**
   * Get conversation by ID with members
   * @param {string} conversationId - Conversation ID
   * @returns {Promise<Object>} Conversation with members
   */
  async getConversationWithMembers(conversationId) {
    const text = `
      SELECT 
        c.*,
        json_agg(
          json_build_object(
            'user_id', cm.user_id,
            'role', cm.role,
            'joined_at', cm.joined_at,
            'last_read_message_id', cm.last_read_message_id
          )
        ) as members
      FROM conversations c
      LEFT JOIN conversation_members cm ON c.id = cm.conversation_id
      WHERE c.id = $1
      GROUP BY c.id
    `;
    
    const result = await this.executeQuery(text, [conversationId]);
    return result.rows[0] || null;
  }

  /**
   * Get conversations for a user
   * @param {number} userId - User ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} User's conversations
   */
  async getUserConversations(userId, options = {}) {
    const { limit = 50, offset = 0 } = options;
    
    const text = `
      SELECT 
        c.*,
        cm.role as user_role,
        cm.last_read_message_id,
        (
          SELECT m.content 
          FROM messages m 
          WHERE m.conversation_id = c.id 
          ORDER BY m.created_at DESC 
          LIMIT 1
        ) as last_message,
        (
          SELECT m.created_at 
          FROM messages m 
          WHERE m.conversation_id = c.id 
          ORDER BY m.created_at DESC 
          LIMIT 1
        ) as last_message_at,
        (
          SELECT COUNT(*) 
          FROM messages m 
          WHERE m.conversation_id = c.id 
          AND m.created_at > COALESCE(cm.last_read_message_id::timestamptz, '1970-01-01')
        ) as unread_count
      FROM conversations c
      INNER JOIN conversation_members cm ON c.id = cm.conversation_id
      WHERE cm.user_id = $1
      ORDER BY c.updated_at DESC
      LIMIT $2 OFFSET $3
    `;
    
    const result = await this.executeQuery(text, [userId, limit, offset]);
    return result.rows;
  }

  /**
   * Check if user is member of conversation
   * @param {string} conversationId - Conversation ID
   * @param {number} userId - User ID
   * @returns {Promise<boolean>} True if user is member
   */
  async isUserMember(conversationId, userId) {
    const text = `
      SELECT 1 FROM conversation_members 
      WHERE conversation_id = $1 AND user_id = $2
    `;
    
    const result = await this.executeQuery(text, [conversationId, userId]);
    return result.rows.length > 0;
  }

  /**
   * Update conversation metadata
   * @param {string} conversationId - Conversation ID
   * @param {Object} metadata - New metadata
   * @returns {Promise<Object>} Updated conversation
   */
  async updateMetadata(conversationId, metadata) {
    const text = `
      UPDATE conversations 
      SET metadata = $2, updated_at = now()
      WHERE id = $1
      RETURNING *
    `;
    
    const result = await this.executeQuery(text, [conversationId, metadata]);
    return result.rows[0];
  }

  /**
   * Update conversation title
   * @param {string} conversationId - Conversation ID
   * @param {string} title - New title
   * @returns {Promise<Object>} Updated conversation
   */
  async updateTitle(conversationId, title) {
    const text = `
      UPDATE conversations 
      SET title = $2, updated_at = now()
      WHERE id = $1
      RETURNING *
    `;
    
    const result = await this.executeQuery(text, [conversationId, title]);
    return result.rows[0];
  }

  /**
   * Remove member from conversation
   * @param {string} conversationId - Conversation ID
   * @param {number} userId - User ID
   * @returns {Promise<boolean>} True if removed
   */
  async removeMember(conversationId, userId) {
    const text = `
      DELETE FROM conversation_members 
      WHERE conversation_id = $1 AND user_id = $2
    `;
    
    const result = await this.executeQuery(text, [conversationId, userId]);
    return result.rowCount > 0;
  }

  /**
   * Get private conversation between two users
   * @param {number} user1Id - First user ID
   * @param {number} user2Id - Second user ID
   * @returns {Promise<Object|null>} Private conversation or null
   */
  async getPrivateConversation(user1Id, user2Id) {
    const text = `
      SELECT c.*
      FROM conversations c
      INNER JOIN conversation_members cm1 ON c.id = cm1.conversation_id
      INNER JOIN conversation_members cm2 ON c.id = cm2.conversation_id
      WHERE c.type = 'private'
      AND cm1.user_id = $1
      AND cm2.user_id = $2
      AND cm1.conversation_id = cm2.conversation_id
    `;
    
    const result = await this.executeQuery(text, [user1Id, user2Id]);
    return result.rows[0] || null;
  }

  /**
   * Update last read message for user in conversation
   * @param {string} conversationId - Conversation ID
   * @param {number} userId - User ID
   * @param {string} messageId - Message ID
   * @returns {Promise<Object>} Updated member record
   */
  async updateLastRead(conversationId, userId, messageId) {
    const text = `
      UPDATE conversation_members 
      SET last_read_message_id = $3
      WHERE conversation_id = $1 AND user_id = $2
      RETURNING *
    `;
    
    const result = await this.executeQuery(text, [conversationId, userId, messageId]);
    return result.rows[0];
  }
}

module.exports = ConversationRepository;
