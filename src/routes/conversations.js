/**
 * Conversation Routes
 * Handles conversation management and operations
 */
const express = require('express');
const { body, param, query } = require('express-validator');
const container = require('../config/container');
const { formatErrorResponse } = require('../utils/errors');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get services from container
const conversationService = container.get('conversationService');
const messageService = container.get('messageService');

// Validation middleware
const validateCreatePrivateConversation = [
  body('user_id')
    .isInt({ min: 1 })
    .withMessage('Valid user ID is required')
];

const validateCreateGroupConversation = [
  body('title')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Group title must be between 1 and 100 characters'),
  body('member_ids')
    .isArray({ min: 2 })
    .withMessage('Group must have at least 2 members'),
  body('member_ids.*')
    .isInt({ min: 1 })
    .withMessage('All member IDs must be valid integers')
];

const validateSendMessage = [
  body('conversation_id')
    .isUUID()
    .withMessage('Valid conversation ID is required'),
  body('content')
    .trim()
    .isLength({ min: 1, max: 1000 })
    .withMessage('Message content must be between 1 and 1000 characters'),
  body('content_type')
    .optional()
    .isIn(['text', 'image', 'file', 'system'])
    .withMessage('Content type must be text, image, file, or system'),
  body('attachments')
    .optional()
    .isObject()
    .withMessage('Attachments must be a valid object')
];

const validateEditMessage = [
  body('content')
    .trim()
    .isLength({ min: 1, max: 1000 })
    .withMessage('Message content must be between 1 and 1000 characters')
];

const validateConversationId = [
  param('conversationId')
    .isUUID()
    .withMessage('Valid conversation ID is required')
];

const validateMessageId = [
  param('messageId')
    .isUUID()
    .withMessage('Valid message ID is required')
];

const validateQueryParams = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
];

/**
 * @route   POST /api/v1/conversations/private
 * @desc    Create a private conversation with another user
 * @access  Private
 */
router.post('/private', authenticateToken, validateCreatePrivateConversation, async (req, res) => {
  try {
    const { user_id } = req.body;
    const currentUserId = req.user.id;

    if (currentUserId === user_id) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Cannot create conversation with yourself',
          statusCode: 400
        }
      });
    }

    const conversation = await conversationService.createPrivateConversation(currentUserId, user_id);

    res.status(201).json({
      success: true,
      message: 'Private conversation created successfully',
      data: conversation
    });
  } catch (error) {
    const formattedError = formatErrorResponse(error);
    res.status(formattedError.error.statusCode).json({
      success: false,
      error: formattedError
    });
  }
});

/**
 * @route   POST /api/v1/conversations/group
 * @desc    Create a group conversation
 * @access  Private
 */
router.post('/group', authenticateToken, validateCreateGroupConversation, async (req, res) => {
  try {
    const { title, member_ids, metadata = {} } = req.body;
    const currentUserId = req.user.id;

    // Ensure current user is included in members
    if (!member_ids.includes(currentUserId)) {
      member_ids.push(currentUserId);
    }

    const groupData = {
      title,
      metadata,
      created_by: currentUserId
    };

    const conversation = await conversationService.createGroupConversation(groupData, member_ids);

    res.status(201).json({
      success: true,
      message: 'Group conversation created successfully',
      data: conversation
    });
  } catch (error) {
    const formattedError = formatErrorResponse(error);
    res.status(formattedError.error.statusCode).json({
      success: false,
      error: formattedError
    });
  }
});

/**
 * @route   GET /api/v1/conversations
 * @desc    Get user's conversations
 * @access  Private
 */
router.get('/', authenticateToken, validateQueryParams, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const currentUserId = req.user.id;

    const options = {
      page: parseInt(page),
      limit: parseInt(limit)
    };

    const conversations = await conversationService.getUserConversations(currentUserId, options);

    res.json({
      success: true,
      data: conversations
    });
  } catch (error) {
    const formattedError = formatErrorResponse(error);
    res.status(formattedError.error.statusCode).json({
      success: false,
      error: formattedError
    });
  }
});

/**
 * @route   GET /api/v1/conversations/:conversationId
 * @desc    Get conversation by ID
 * @access  Private
 */
router.get('/:conversationId', authenticateToken, validateConversationId, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const currentUserId = req.user.id;

    const conversation = await conversationService.getConversation(conversationId, currentUserId);

    res.json({
      success: true,
      data: conversation
    });
  } catch (error) {
    const formattedError = formatErrorResponse(error);
    res.status(formattedError.error.statusCode).json({
      success: false,
      error: formattedError
    });
  }
});

/**
 * @route   GET /api/v1/conversations/:conversationId/members
 * @desc    Get conversation members
 * @access  Private
 */
router.get('/:conversationId/members', authenticateToken, validateConversationId, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const currentUserId = req.user.id;

    const members = await conversationService.getConversationMembers(conversationId);

    res.json({
      success: true,
      data: members
    });
  } catch (error) {
    const formattedError = formatErrorResponse(error);
    res.status(formattedError.error.statusCode).json({
      success: false,
      error: formattedError
    });
  }
});

/**
 * @route   POST /api/v1/conversations/:conversationId/members
 * @desc    Add member to group conversation
 * @access  Private
 */
router.post('/:conversationId/members', authenticateToken, validateConversationId, [
  body('user_id')
    .isInt({ min: 1 })
    .withMessage('Valid user ID is required')
], async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { user_id } = req.body;
    const currentUserId = req.user.id;

    const member = await conversationService.addMemberToGroup(conversationId, user_id, currentUserId);

    res.json({
      success: true,
      message: 'Member added successfully',
      data: member
    });
  } catch (error) {
    const formattedError = formatErrorResponse(error);
    res.status(formattedError.error.statusCode).json({
      success: false,
      error: formattedError
    });
  }
});

/**
 * @route   DELETE /api/v1/conversations/:conversationId/members/:userId
 * @desc    Remove member from group conversation
 * @access  Private
 */
router.delete('/:conversationId/members/:userId', authenticateToken, validateConversationId, [
  param('userId')
    .isInt({ min: 1 })
    .withMessage('Valid user ID is required')
], async (req, res) => {
  try {
    const { conversationId, userId } = req.params;
    const currentUserId = req.user.id;

    const removed = await conversationService.removeMemberFromGroup(conversationId, parseInt(userId), currentUserId);

    res.json({
      success: true,
      message: 'Member removed successfully',
      data: { removed }
    });
  } catch (error) {
    const formattedError = formatErrorResponse(error);
    res.status(formattedError.error.statusCode).json({
      success: false,
      error: formattedError
    });
  }
});

/**
 * @route   PUT /api/v1/conversations/:conversationId/title
 * @desc    Update group conversation title
 * @access  Private
 */
router.put('/:conversationId/title', authenticateToken, validateConversationId, [
  body('title')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Group title must be between 1 and 100 characters')
], async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { title } = req.body;
    const currentUserId = req.user.id;

    const conversation = await conversationService.updateGroupTitle(conversationId, title, currentUserId);

    res.json({
      success: true,
      message: 'Group title updated successfully',
      data: conversation
    });
  } catch (error) {
    const formattedError = formatErrorResponse(error);
    res.status(formattedError.error.statusCode).json({
      success: false,
      error: formattedError
    });
  }
});

/**
 * @route   POST /api/v1/conversations/:conversationId/leave
 * @desc    Leave group conversation
 * @access  Private
 */
router.post('/:conversationId/leave', authenticateToken, validateConversationId, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const currentUserId = req.user.id;

    const left = await conversationService.leaveGroupConversation(conversationId, currentUserId);

    res.json({
      success: true,
      message: 'Left group conversation successfully',
      data: { left }
    });
  } catch (error) {
    const formattedError = formatErrorResponse(error);
    res.status(formattedError.error.statusCode).json({
      success: false,
      error: formattedError
    });
  }
});

/**
 * @route   GET /api/v1/conversations/:conversationId/stats
 * @desc    Get conversation statistics
 * @access  Private
 */
router.get('/:conversationId/stats', authenticateToken, validateConversationId, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const currentUserId = req.user.id;

    const stats = await conversationService.getConversationStats(conversationId, currentUserId);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    const formattedError = formatErrorResponse(error);
    res.status(formattedError.error.statusCode).json({
      success: false,
      error: formattedError
    });
  }
});

module.exports = router;
