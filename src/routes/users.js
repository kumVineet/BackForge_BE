/**
 * User Routes
 * Handles user management and profile operations using OOP service layer
 */
const express = require('express');
const { body } = require('express-validator');
const container = require('../config/container');
const { formatErrorResponse } = require('../utils/errors');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get services from container
const userService = container.get('userService');

// Validation middleware
const validateProfileUpdate = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  body('mobile')
    .optional()
    .trim()
    .isMobilePhone()
    .withMessage('Please provide a valid mobile number')
];

/**
 * @route   GET /api/v1/users/profile
 * @desc    Get current user's profile
 * @access  Private
 */
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const profile = await userService.getUserProfile(userId, userId);

    res.json({
      success: true,
      data: profile
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
 * @route   PUT /api/v1/users/profile
 * @desc    Update current user's profile
 * @access  Private
 */
router.put('/profile', authenticateToken, validateProfileUpdate, async (req, res) => {
  try {
    const userId = req.user.id;
    const profileData = req.body;

    const updatedProfile = await userService.updateUserProfile(userId, profileData);

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: updatedProfile
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
 * @route   GET /api/v1/users/profile/:id
 * @desc    Get user profile by ID (public info only)
 * @access  Public
 */
router.get('/profile/:id', async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const requestingUserId = req.user?.userId || null;

    if (isNaN(userId)) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Invalid user ID',
          statusCode: 400
        }
      });
    }

    const profile = await userService.getUserProfile(userId, requestingUserId);

    res.json({
      success: true,
      data: profile
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
 * @route   GET /api/v1/users
 * @desc    Get all users
 * @access  Private
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 20, search } = req.query;

    if (search && search.length < 2) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Search term must be at least 2 characters long',
          statusCode: 400
        }
      });
    }

    const result = await userService.getAllUsers({
      page: parseInt(page),
      limit: parseInt(limit),
      search
    });

    res.json({
      success: true,
      data: result
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
 * @route   GET /api/v1/users/search
 * @desc    Search users
 * @access  Private
 */
router.get('/search', authenticateToken, async (req, res) => {
  try {
    const { q: searchTerm, page = 1, limit = 20 } = req.query;

    if (!searchTerm) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Search term is required',
          statusCode: 400
        }
      });
    }

    if (searchTerm.length < 3) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Search term must be at least 3 characters long',
          statusCode: 400
        }
      });
    }

    const offset = (page - 1) * limit;
    const users = await userService.searchUsers(searchTerm, {
      limit: parseInt(limit),
      offset
    });

    res.json({
      success: true,
      data: users
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
 * @route   GET /api/v1/users/stats
 * @desc    Get user statistics
 * @access  Private
 */
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const stats = await userService.getUserStats();

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

/**
 * @route   GET /api/v1/users/:id/activity
 * @desc    Get user activity summary (self only)
 * @access  Private
 */
router.get('/:id/activity', authenticateToken, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const requestingUserId = req.user.id;

    if (isNaN(userId)) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Invalid user ID',
          statusCode: 400
        }
      });
    }

    // Users can only see their own activity
    if (userId !== requestingUserId) {
      return res.status(403).json({
        success: false,
        error: {
          message: 'Access denied - you can only view your own activity',
          statusCode: 403
        }
      });
    }

    const activity = await userService.getUserActivitySummary(userId);

    res.json({
      success: true,
      data: activity
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
 * @route   GET /api/v1/users/permissions
 * @desc    Get current user's permissions
 * @access  Private
 */
router.get('/permissions', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const permissions = {
      file_upload: await userService.hasPermission(userId, 'file_upload'),
      file_delete: await userService.hasPermission(userId, 'file_delete')
    };

    res.json({
      success: true,
      data: permissions
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