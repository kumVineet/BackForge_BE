/**
 * Message Service
 * Handles message business logic
 */
const BaseService = require('../core/BaseService');
const MessageRepository = require('../repositories/MessageRepository');
const ConversationRepository = require('../repositories/ConversationRepository');
const { ValidationError } = require('../utils/errors');

class MessageService extends BaseService {
  constructor(messageRepository, conversationRepository) {
    super();
    this.messageRepository = messageRepository;
    this.conversationRepository = conversationRepository;
  }

  /**
   * Send a message to a conversation
   * @param {Object} messageData - Message data
   * @param {number} senderId - Sender user ID
   * @returns {Promise<Object>} Created message
   */
  async sendMessage(messageData, senderId) {
    try {
      const { conversation_id, content, content_type = 'text', attachments = null } = messageData;
      
      this.validateRequiredParams({ conversation_id, content, senderId }, ['conversation_id', 'content', 'senderId']);

      // Validate content
      if (!content || content.trim().length === 0) {
        throw new ValidationError('Message content cannot be empty');
      }

      if (content.length > 1000) {
        throw new ValidationError('Message content cannot exceed 1000 characters');
      }

      // Check if user is member of conversation
      const isMember = await this.conversationRepository.isUserMember(conversation_id, senderId);
      if (!isMember) {
        throw new ValidationError('Access denied - user is not a member of this conversation');
      }

      // Create message
      const message = await this.messageRepository.createMessage({
        conversation_id,
        sender_id: senderId,
        content: content.trim(),
        content_type,
        attachments
      });

      // Get conversation members to mark as delivered
      const conversation = await this.conversationRepository.getConversationWithMembers(conversation_id);
      const members = conversation.members || [];

      // Mark message as delivered for all members (except sender)
      for (const member of members) {
        if (member.user_id !== senderId) {
          await this.messageRepository.markAsDelivered(message.id, member.user_id);
        }
      }

      // Return message with sender info
      return await this.messageRepository.getMessageById(message.id);
    } catch (error) {
      this.handleError(error, 'sendMessage');
    }
  }

  /**
   * Get messages for a conversation
   * @param {string} conversationId - Conversation ID
   * @param {number} userId - User ID (for access control)
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Messages
   */
  async getConversationMessages(conversationId, userId, options = {}) {
    try {
      this.validateRequiredParams({ conversationId, userId }, ['conversationId', 'userId']);

      // Check if user is member
      const isMember = await this.conversationRepository.isUserMember(conversationId, userId);
      if (!isMember) {
        throw new ValidationError('Access denied - user is not a member of this conversation');
      }

      const messages = await this.messageRepository.getConversationMessages(conversationId, options);
      
      // Mark messages as read for this user
      for (const message of messages) {
        if (message.sender_id !== userId) {
          await this.messageRepository.markAsRead(message.id, userId);
        }
      }

      return messages;
    } catch (error) {
      this.handleError(error, 'getConversationMessages');
    }
  }

  /**
   * Edit a message
   * @param {string} messageId - Message ID
   * @param {string} newContent - New content
   * @param {number} userId - User ID (must be sender)
   * @returns {Promise<Object>} Updated message
   */
  async editMessage(messageId, newContent, userId) {
    try {
      this.validateRequiredParams({ messageId, newContent, userId }, ['messageId', 'newContent', 'userId']);

      // Validate content
      if (!newContent || newContent.trim().length === 0) {
        throw new ValidationError('Message content cannot be empty');
      }

      if (newContent.length > 1000) {
        throw new ValidationError('Message content cannot exceed 1000 characters');
      }

      // Get message to check ownership
      const message = await this.messageRepository.getMessageById(messageId);
      if (!message) {
        throw new ValidationError('Message not found');
      }

      if (message.sender_id !== userId) {
        throw new ValidationError('Access denied - can only edit your own messages');
      }

      // Check if message is too old (e.g., 24 hours)
      const messageAge = Date.now() - new Date(message.created_at).getTime();
      const maxEditAge = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
      
      if (messageAge > maxEditAge) {
        throw new ValidationError('Message is too old to edit (24 hour limit)');
      }

      return await this.messageRepository.updateMessage(messageId, newContent.trim());
    } catch (error) {
      this.handleError(error, 'editMessage');
    }
  }

  /**
   * Delete a message
   * @param {string} messageId - Message ID
   * @param {number} userId - User ID (must be sender)
   * @returns {Promise<boolean>} True if deleted
   */
  async deleteMessage(messageId, userId) {
    try {
      this.validateRequiredParams({ messageId, userId }, ['messageId', 'userId']);

      // Get message to check ownership
      const message = await this.messageRepository.getMessageById(messageId);
      if (!message) {
        throw new ValidationError('Message not found');
      }

      if (message.sender_id !== userId) {
        throw new ValidationError('Access denied - can only delete your own messages');
      }

      // Check if message is too old (e.g., 1 hour)
      const messageAge = Date.now() - new Date(message.created_at).getTime();
      const maxDeleteAge = 60 * 60 * 1000; // 1 hour in milliseconds
      
      if (messageAge > maxDeleteAge) {
        throw new ValidationError('Message is too old to delete (1 hour limit)');
      }

      return await this.messageRepository.deleteMessage(messageId);
    } catch (error) {
      this.handleError(error, 'deleteMessage');
    }
  }

  /**
   * Mark message as read
   * @param {string} messageId - Message ID
   * @param {number} userId - User ID
   * @returns {Promise<Object>} Message status
   */
  async markMessageAsRead(messageId, userId) {
    try {
      this.validateRequiredParams({ messageId, userId }, ['messageId', 'userId']);

      // Get message to check if user is member of conversation
      const message = await this.messageRepository.getMessageById(messageId);
      if (!message) {
        throw new ValidationError('Message not found');
      }

      // Check if user is member of conversation
      const isMember = await this.conversationRepository.isUserMember(message.conversation_id, userId);
      if (!isMember) {
        throw new ValidationError('Access denied - user is not a member of this conversation');
      }

      return await this.messageRepository.markAsRead(messageId, userId);
    } catch (error) {
      this.handleError(error, 'markMessageAsRead');
    }
  }

  /**
   * Get unread message count for a user in a conversation
   * @param {string} conversationId - Conversation ID
   * @param {number} userId - User ID
   * @returns {Promise<number>} Unread count
   */
  async getUnreadCount(conversationId, userId) {
    try {
      this.validateRequiredParams({ conversationId, userId }, ['conversationId', 'userId']);

      // Check if user is member
      const isMember = await this.conversationRepository.isUserMember(conversationId, userId);
      if (!isMember) {
        throw new ValidationError('Access denied - user is not a member of this conversation');
      }

      return await this.messageRepository.getUnreadCount(conversationId, userId);
    } catch (error) {
      this.handleError(error, 'getUnreadCount');
    }
  }

  /**
   * Search messages in a conversation
   * @param {string} conversationId - Conversation ID
   * @param {string} searchTerm - Search term
   * @param {number} userId - User ID (for access control)
   * @param {Object} options - Search options
   * @returns {Promise<Array>} Matching messages
   */
  async searchMessages(conversationId, searchTerm, userId, options = {}) {
    try {
      this.validateRequiredParams({ conversationId, searchTerm, userId }, ['conversationId', 'searchTerm', 'userId']);

      if (searchTerm.length < 2) {
        throw new ValidationError('Search term must be at least 2 characters long');
      }

      // Check if user is member
      const isMember = await this.conversationRepository.isUserMember(conversationId, userId);
      if (!isMember) {
        throw new ValidationError('Access denied - user is not a member of this conversation');
      }

      return await this.messageRepository.searchMessages(conversationId, searchTerm, options);
    } catch (error) {
      this.handleError(error, 'searchMessages');
    }
  }

  /**
   * Get message by ID with access control
   * @param {string} messageId - Message ID
   * @param {number} userId - User ID (for access control)
   * @returns {Promise<Object>} Message
   */
  async getMessage(messageId, userId) {
    try {
      this.validateRequiredParams({ messageId, userId }, ['messageId', 'userId']);

      const message = await this.messageRepository.getMessageById(messageId);
      if (!message) {
        throw new ValidationError('Message not found');
      }

      // Check if user is member of conversation
      const isMember = await this.conversationRepository.isUserMember(message.conversation_id, userId);
      if (!isMember) {
        throw new ValidationError('Access denied - user is not a member of this conversation');
      }

      return message;
    } catch (error) {
      this.handleError(error, 'getMessage');
    }
  }

  /**
   * Get message statistics for a conversation
   * @param {string} conversationId - Conversation ID
   * @param {number} userId - User ID (for access control)
   * @returns {Promise<Object>} Message statistics
   */
  async getMessageStats(conversationId, userId) {
    try {
      this.validateRequiredParams({ conversationId, userId }, ['conversationId', 'userId']);

      // Check if user is member
      const isMember = await this.conversationRepository.isUserMember(conversationId, userId);
      if (!isMember) {
        throw new ValidationError('Access denied - user is not a member of this conversation');
      }

      return await this.messageRepository.getMessageStats(conversationId);
    } catch (error) {
      this.handleError(error, 'getMessageStats');
    }
  }
}

module.exports = MessageService;
