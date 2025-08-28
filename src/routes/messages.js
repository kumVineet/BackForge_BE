/**
 * Message Routes
 * Handles message operations within conversations
 */
const express = require('express');
const { body, param, query } = require('express-validator');
const container = require('../config/container');
const { formatErrorResponse } = require('../utils/errors');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get services from container
const messageService = container.get('messageService');

// Validation middleware
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
    .withMessage('Limit must be between 1 and 100'),
  query('before')
    .optional()
    .isISO8601()
    .withMessage('Before must be a valid ISO 8601 date')
];

const validateSearchParams = [
  query('q')
    .trim()
    .isLength({ min: 2 })
    .withMessage('Search term must be at least 2 characters long')
];

/**
 * @route   POST /api/v1/messages
 * @desc    Send a message to a conversation
 * @access  Private
 */
router.post('/', authenticateToken, validateSendMessage, async (req, res) => {
  try {
    const { conversation_id, content, content_type, attachments } = req.body;
    const currentUserId = req.user.id;

    const messageData = {
      conversation_id,
      content,
      content_type,
      attachments
    };

    const message = await messageService.sendMessage(messageData, currentUserId);

    res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: message
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
 * @route   GET /api/v1/conversations/:conversationId/messages
 * @desc    Get messages for a conversation
 * @access  Private
 */
router.get('/conversations/:conversationId/messages', authenticateToken, validateConversationId, validateQueryParams, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { page = 1, limit = 50, before } = req.query;
    const currentUserId = req.user.id;

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      before: before ? new Date(before) : null
    };

    const messages = await messageService.getConversationMessages(conversationId, currentUserId, options);

    res.json({
      success: true,
      data: messages
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
 * @route   GET /api/v1/messages/:messageId
 * @desc    Get a specific message by ID
 * @access  Private
 */
router.get('/:messageId', authenticateToken, validateMessageId, async (req, res) => {
  try {
    const { messageId } = req.params;
    const currentUserId = req.user.id;

    const message = await messageService.getMessage(messageId, currentUserId);

    res.json({
      success: true,
      data: message
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
 * @route   PUT /api/v1/messages/:messageId
 * @desc    Edit a message
 * @access  Private
 */
router.put('/:messageId', authenticateToken, validateMessageId, validateEditMessage, async (req, res) => {
  try {
    const { messageId } = req.params;
    const { content } = req.body;
    const currentUserId = req.user.id;

    const message = await messageService.editMessage(messageId, content, currentUserId);

    res.json({
      success: true,
      message: 'Message updated successfully',
      data: message
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
 * @route   DELETE /api/v1/messages/:messageId
 * @desc    Delete a message
 * @access  Private
 */
router.delete('/:messageId', authenticateToken, validateMessageId, async (req, res) => {
  try {
    const { messageId } = req.params;
    const currentUserId = req.user.id;

    const deleted = await messageService.deleteMessage(messageId, currentUserId);

    res.json({
      success: true,
      message: 'Message deleted successfully',
      data: { deleted }
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
 * @route   POST /api/v1/messages/:messageId/read
 * @desc    Mark a message as read
 * @access  Private
 */
router.post('/:messageId/read', authenticateToken, validateMessageId, async (req, res) => {
  try {
    const { messageId } = req.params;
    const currentUserId = req.user.id;

    const messageStatus = await messageService.markMessageAsRead(messageId, currentUserId);

    res.json({
      success: true,
      message: 'Message marked as read',
      data: messageStatus
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
 * @route   GET /api/v1/conversations/:conversationId/messages/search
 * @desc    Search messages in a conversation
 * @access  Private
 */
router.get('/conversations/:conversationId/messages/search', authenticateToken, validateConversationId, validateSearchParams, validateQueryParams, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { q: searchTerm, page = 1, limit = 20 } = req.query;
    const currentUserId = req.user.id;

    const options = {
      page: parseInt(page),
      limit: parseInt(limit)
    };

    const messages = await messageService.searchMessages(conversationId, searchTerm, currentUserId, options);

    res.json({
      success: true,
      data: messages
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
 * @route   GET /api/v1/conversations/:conversationId/messages/unread-count
 * @desc    Get unread message count for a conversation
 * @access  Private
 */
router.get('/conversations/:conversationId/messages/unread-count', authenticateToken, validateConversationId, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const currentUserId = req.user.id;

    const unreadCount = await messageService.getUnreadCount(conversationId, currentUserId);

    res.json({
      success: true,
      data: { unread_count: unreadCount }
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
 * @route   GET /api/v1/conversations/:conversationId/messages/stats
 * @desc    Get message statistics for a conversation
 * @access  Private
 */
router.get('/conversations/:conversationId/messages/stats', authenticateToken, validateConversationId, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const currentUserId = req.user.id;

    const stats = await messageService.getMessageStats(conversationId, currentUserId);

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
