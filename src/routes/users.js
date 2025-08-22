/**
 * User Routes
 * Handles user management and profile operations using OOP service layer
 */
const express = require('express');
const { body } = require('express-validator');
const container = require('../config/container');
const { formatErrorResponse } = require('../utils/errors');
const { authenticateToken, authorizeRoles, requireAdmin } = require('../middleware/auth');

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

const validateRoleChange = [
  body('role')
    .trim()
    .isIn(['user', 'admin'])
    .withMessage('Role must be either user or admin')
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
 * @desc    Get all users (admin only)
 * @access  Private (Admin)
 */
router.get('/', authenticateToken, authorizeRoles(['admin']), async (req, res) => {
  try {
    const { page = 1, limit = 20, search, role } = req.query;

    const result = await userService.getAllUsers({
      page: parseInt(page),
      limit: parseInt(limit),
      search,
      role
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
 * @desc    Search users (admin only)
 * @access  Private (Admin)
 */
router.get('/search', authenticateToken, authorizeRoles(['admin']), async (req, res) => {
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
 * @route   GET /api/v1/users/role/:role
 * @desc    Get users by role (admin only)
 * @access  Private (Admin)
 */
router.get('/role/:role', authenticateToken, authorizeRoles(['admin']), async (req, res) => {
  try {
    const { role } = req.params;
    const { page = 1, limit = 20 } = req.query;

    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Invalid role. Must be either "user" or "admin"',
          statusCode: 400
        }
      });
    }

    const offset = (page - 1) * limit;
    const users = await userService.getUsersByRole(role, {
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
 * @desc    Get user statistics (admin only)
 * @access  Private (Admin)
 */
router.get('/stats', authenticateToken, authorizeRoles(['admin']), async (req, res) => {
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
 * @route   PUT /api/v1/users/:id/role
 * @desc    Change user role (admin only)
 * @access  Private (Admin)
 */
router.put('/:id/role', authenticateToken, authorizeRoles(['admin']), validateRoleChange, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { role } = req.body;
    const adminUserId = req.user.id;

    if (isNaN(userId)) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Invalid user ID',
          statusCode: 400
        }
      });
    }

    const updatedUser = await userService.changeUserRole(userId, role, adminUserId);

    res.json({
      success: true,
      message: 'User role updated successfully',
      data: updatedUser
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
 * @route   POST /api/v1/users/:id/deactivate
 * @desc    Deactivate user account (admin only)
 * @access  Private (Admin)
 */
router.post('/:id/deactivate', authenticateToken, authorizeRoles(['admin']), async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const adminUserId = req.user.id;

    if (isNaN(userId)) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Invalid user ID',
          statusCode: 400
        }
      });
    }

    const deactivatedUser = await userService.deactivateUser(userId, adminUserId);

    res.json({
      success: true,
      message: 'User account deactivated successfully',
      data: deactivatedUser
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
 * @route   POST /api/v1/users/:id/reactivate
 * @desc    Reactivate user account (admin only)
 * @access  Private (Admin)
 */
router.post('/:id/reactivate', authenticateToken, authorizeRoles(['admin']), async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const adminUserId = req.user.id;

    if (isNaN(userId)) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Invalid user ID',
          statusCode: 400
        }
      });
    }

    const reactivatedUser = await userService.reactivateUser(userId, adminUserId);

    res.json({
      success: true,
      message: 'User account reactivated successfully',
      data: reactivatedUser
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
 * @desc    Get user activity summary (admin or self)
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

    // Users can only see their own activity, admins can see any user's activity
    if (userId !== requestingUserId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: {
          message: 'Access denied',
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
      admin: await userService.hasPermission(userId, 'admin'),
      user_management: await userService.hasPermission(userId, 'user_management'),
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