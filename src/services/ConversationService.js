/**
 * Conversation Service
 * Handles conversation business logic
 */
const BaseService = require('../core/BaseService');
const ConversationRepository = require('../repositories/ConversationRepository');
const MessageRepository = require('../repositories/MessageRepository');
const { ValidationError } = require('../utils/errors');

class ConversationService extends BaseService {
  constructor(conversationRepository, messageRepository) {
    super();
    this.conversationRepository = conversationRepository;
    this.messageRepository = messageRepository;
  }

  /**
   * Create a private conversation between two users
   * @param {number} user1Id - First user ID
   * @param {number} user2Id - Second user ID
   * @returns {Promise<Object>} Created conversation
   */
  async createPrivateConversation(user1Id, user2Id) {
    try {
      this.validateRequiredParams({ user1Id, user2Id }, ['user1Id', 'user2Id']);

      // Check if conversation already exists
      const existingConversation = await this.conversationRepository.getPrivateConversation(user1Id, user2Id);
      if (existingConversation) {
        return existingConversation;
      }

      // Create new conversation
      const conversationData = {
        type: 'private',
        title: null, // Private conversations don't have titles
        metadata: {},
        created_by: user1Id
      };

      const conversation = await this.conversationRepository.createConversation(conversationData);

      // Add both users as members
      await this.conversationRepository.addMember(conversation.id, user1Id, 'member');
      await this.conversationRepository.addMember(conversation.id, user2Id, 'member');

      return await this.conversationRepository.getConversationWithMembers(conversation.id);
    } catch (error) {
      this.handleError(error, 'createPrivateConversation');
    }
  }

  /**
   * Create a group conversation
   * @param {Object} groupData - Group conversation data
   * @param {Array<number>} memberIds - Array of user IDs to add
   * @returns {Promise<Object>} Created conversation
   */
  async createGroupConversation(groupData, memberIds) {
    try {
      const { title, metadata = {}, created_by } = groupData;
      this.validateRequiredParams({ title, created_by, memberIds }, ['title', 'created_by', 'memberIds']);

      if (memberIds.length < 2) {
        throw new ValidationError('Group conversation must have at least 2 members');
      }

      // Create conversation
      const conversationData = {
        type: 'group',
        title,
        metadata,
        created_by
      };

      const conversation = await this.conversationRepository.createConversation(conversationData);

      // Add all members
      for (const userId of memberIds) {
        const role = userId === created_by ? 'admin' : 'member';
        await this.conversationRepository.addMember(conversation.id, userId, role);
      }

      return await this.conversationRepository.getConversationWithMembers(conversation.id);
    } catch (error) {
      this.handleError(error, 'createGroupConversation');
    }
  }

  /**
   * Get user's conversations
   * @param {number} userId - User ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} User's conversations
   */
  async getUserConversations(userId, options = {}) {
    try {
      this.validateRequiredParams({ userId }, ['userId']);
      
      const conversations = await this.conversationRepository.getUserConversations(userId, options);
      
      // Enrich conversations with member details
      const enrichedConversations = await Promise.all(
        conversations.map(async (conversation) => {
          if (conversation.type === 'private') {
            // For private conversations, get the other user's info
            const members = await this.getConversationMembers(conversation.id);
            const otherMember = members.find(m => m.user_id !== userId);
            if (otherMember) {
              conversation.other_user = {
                id: otherMember.user_id,
                name: otherMember.name,
                email: otherMember.email
              };
            }
          }
          return conversation;
        })
      );

      return enrichedConversations;
    } catch (error) {
      this.handleError(error, 'getUserConversations');
    }
  }

  /**
   * Get conversation by ID
   * @param {string} conversationId - Conversation ID
   * @param {number} userId - User ID (for access control)
   * @returns {Promise<Object>} Conversation
   */
  async getConversation(conversationId, userId) {
    try {
      this.validateRequiredParams({ conversationId, userId }, ['conversationId', 'userId']);

      // Check if user is member
      const isMember = await this.conversationRepository.isUserMember(conversationId, userId);
      if (!isMember) {
        throw new ValidationError('Access denied - user is not a member of this conversation');
      }

      return await this.conversationRepository.getConversationWithMembers(conversationId);
    } catch (error) {
      this.handleError(error, 'getConversation');
    }
  }

  /**
   * Get conversation members
   * @param {string} conversationId - Conversation ID
   * @returns {Promise<Array>} Conversation members
   */
  async getConversationMembers(conversationId) {
    try {
      this.validateRequiredParams({ conversationId }, ['conversationId']);
      
      const conversation = await this.conversationRepository.getConversationWithMembers(conversationId);
      return conversation?.members || [];
    } catch (error) {
      this.handleError(error, 'getConversationMembers');
    }
  }

  /**
   * Add member to group conversation
   * @param {string} conversationId - Conversation ID
   * @param {number} userId - User ID to add
   * @param {number} adminUserId - Admin user ID making the request
   * @returns {Promise<Object>} Added member
   */
  async addMemberToGroup(conversationId, userId, adminUserId) {
    try {
      this.validateRequiredParams({ conversationId, userId, adminUserId }, ['conversationId', 'userId', 'adminUserId']);

      // Check if conversation is group type
      const conversation = await this.conversationRepository.getConversationWithMembers(conversationId);
      if (conversation.type !== 'group') {
        throw new ValidationError('Can only add members to group conversations');
      }

      // Check if requesting user is admin
      const adminMember = conversation.members.find(m => m.user_id === adminUserId);
      if (!adminMember || adminMember.role !== 'admin') {
        throw new ValidationError('Admin privileges required to add members');
      }

      // Check if user is already a member
      const isAlreadyMember = conversation.members.find(m => m.user_id === userId);
      if (isAlreadyMember) {
        throw new ValidationError('User is already a member of this conversation');
      }

      return await this.conversationRepository.addMember(conversationId, userId, 'member');
    } catch (error) {
      this.handleError(error, 'addMemberToGroup');
    }
  }

  /**
   * Remove member from group conversation
   * @param {string} conversationId - Conversation ID
   * @param {number} userId - User ID to remove
   * @param {number} adminUserId - Admin user ID making the request
   * @returns {Promise<boolean>} True if removed
   */
  async removeMemberFromGroup(conversationId, userId, adminUserId) {
    try {
      this.validateRequiredParams({ conversationId, userId, adminUserId }, ['conversationId', 'userId', 'adminUserId']);

      // Check if conversation is group type
      const conversation = await this.conversationRepository.getConversationWithMembers(conversationId);
      if (conversation.type !== 'group') {
        throw new ValidationError('Can only remove members from group conversations');
      }

      // Check if requesting user is admin
      const adminMember = conversation.members.find(m => m.user_id === adminUserId);
      if (!adminMember || adminMember.role !== 'admin') {
        throw new ValidationError('Admin privileges required to remove members');
      }

      // Prevent removing the last admin
      if (userId === adminUserId) {
        const adminCount = conversation.members.filter(m => m.role === 'admin').length;
        if (adminCount === 1) {
          throw new ValidationError('Cannot remove the last admin from the conversation');
        }
      }

      return await this.conversationRepository.removeMember(conversationId, userId);
    } catch (error) {
      this.handleError(error, 'removeMemberFromGroup');
    }
  }

  /**
   * Update conversation title (group conversations only)
   * @param {string} conversationId - Conversation ID
   * @param {string} title - New title
   * @param {number} adminUserId - Admin user ID making the request
   * @returns {Promise<Object>} Updated conversation
   */
  async updateGroupTitle(conversationId, title, adminUserId) {
    try {
      this.validateRequiredParams({ conversationId, title, adminUserId }, ['conversationId', 'title', 'adminUserId']);

      // Check if conversation is group type
      const conversation = await this.conversationRepository.getConversationWithMembers(conversationId);
      if (conversation.type !== 'group') {
        throw new ValidationError('Can only update title for group conversations');
      }

      // Check if requesting user is admin
      const adminMember = conversation.members.find(m => m.user_id === adminUserId);
      if (!adminMember || adminMember.role !== 'admin') {
        throw new ValidationError('Admin privileges required to update title');
      }

      return await this.conversationRepository.updateTitle(conversationId, title);
    } catch (error) {
      this.handleError(error, 'updateGroupTitle');
    }
  }

  /**
   * Leave group conversation
   * @param {string} conversationId - Conversation ID
   * @param {number} userId - User ID leaving
   * @returns {Promise<boolean>} True if left
   */
  async leaveGroupConversation(conversationId, userId) {
    try {
      this.validateRequiredParams({ conversationId, userId }, ['conversationId', 'userId']);

      // Check if conversation is group type
      const conversation = await this.conversationRepository.getConversationWithMembers(conversationId);
      if (conversation.type !== 'group') {
        throw new ValidationError('Can only leave group conversations');
      }

      // Check if user is a member
      const isMember = await this.conversationRepository.isUserMember(conversationId, userId);
      if (!isMember) {
        throw new ValidationError('User is not a member of this conversation');
      }

      return await this.conversationRepository.removeMember(conversationId, userId);
    } catch (error) {
      this.handleError(error, 'leaveGroupConversation');
    }
  }

  /**
   * Get conversation statistics
   * @param {string} conversationId - Conversation ID
   * @param {number} userId - User ID (for access control)
   * @returns {Promise<Object>} Conversation statistics
   */
  async getConversationStats(conversationId, userId) {
    try {
      this.validateRequiredParams({ conversationId, userId }, ['conversationId', 'userId']);

      // Check if user is member
      const isMember = await this.conversationRepository.isUserMember(conversationId, userId);
      if (!isMember) {
        throw new ValidationError('Access denied - user is not a member of this conversation');
      }

      const messageStats = await this.messageRepository.getMessageStats(conversationId);
      const unreadCount = await this.messageRepository.getUnreadCount(conversationId, userId);

      return {
        ...messageStats,
        unread_count: unreadCount
      };
    } catch (error) {
      this.handleError(error, 'getConversationStats');
    }
  }
}

module.exports = ConversationService;
