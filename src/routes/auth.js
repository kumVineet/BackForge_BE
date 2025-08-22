/**
 * Authentication Routes
 * Handles user authentication, registration, and token management
 */
const express = require('express');
const { body } = require('express-validator');
const { check } = require('express-validator');
const container = require('../config/container');
const { formatErrorResponse } = require('../utils/errors');

const router = express.Router();

// Get services from container
const authService = container.get('authService');

// Validation middleware
const validateLogin = [
  body('identifier')
    .trim()
    .notEmpty()
    .withMessage('Email or mobile number is required')
    .isLength({ min: 3 })
    .withMessage('Please provide a valid email or mobile number'),
  body('password')
    .trim()
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
];

const validateRegister = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  body('password')
    .trim()
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long'),
  body('mobile')
    .optional()
    .trim()
    .isMobilePhone()
    .withMessage('Please provide a valid mobile number'),
  body('role')
    .optional()
    .isIn(['user', 'admin'])
    .withMessage('Role must be either user or admin')
];

const validateRefreshToken = [
  body('refreshToken')
    .trim()
    .notEmpty()
    .withMessage('Refresh token is required')
];

const validateLogout = [
  body('refreshToken')
    .trim()
    .notEmpty()
    .withMessage('Refresh token is required')
];

const validateChangePassword = [
  body('currentPassword')
    .trim()
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .trim()
    .notEmpty()
    .withMessage('New password is required')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters long')
];

/**
 * @route   POST /api/v1/auth/login
 * @desc    Authenticate user and return tokens
 * @access  Public
 */
router.post('/login', validateLogin, async (req, res) => {
  try {
    const { identifier, password } = req.body;
    
    const result = await authService.authenticateUser(identifier, password);
    
    res.json({
      success: true,
      message: 'Login successful',
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
 * @route   POST /api/v1/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post('/register', validateRegister, async (req, res) => {
  try {
    const userData = req.body;
    
    const result = await authService.registerUser(userData);
    
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
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
 * @route   POST /api/v1/auth/refresh
 * @desc    Refresh access token using refresh token
 * @access  Public
 */
router.post('/refresh', validateRefreshToken, async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    const tokens = await authService.refreshToken(refreshToken);
    
    res.json({
      success: true,
      message: 'Token refreshed successfully',
      data: tokens
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
 * @route   POST /api/v1/auth/logout
 * @desc    Logout user and revoke tokens
 * @access  Public
 */
router.post('/logout', validateLogout, async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    await authService.logout(refreshToken);
    
    res.json({
      success: true,
      message: 'Logout successful'
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
 * @route   POST /api/v1/auth/change-password
 * @desc    Change user password
 * @access  Private
 */
router.post('/change-password', validateChangePassword, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id; // From authenticateToken middleware
    
    await authService.changePassword(userId, currentPassword, newPassword);
    
    res.json({
      success: true,
      message: 'Password changed successfully'
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
 * @route   POST /api/v1/auth/request-password-reset
 * @desc    Request password reset
 * @access  Public
 */
router.post('/request-password-reset', [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail()
], async (req, res) => {
  try {
    const { email } = req.body;
    
    await authService.requestPasswordReset(email);
    
    res.json({
      success: true,
      message: 'Password reset email sent (if email exists)'
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
 * @route   POST /api/v1/auth/reset-password
 * @desc    Reset password with reset token
 * @access  Public
 */
router.post('/reset-password', [
  body('resetToken')
    .trim()
    .notEmpty()
    .withMessage('Reset token is required'),
  body('newPassword')
    .trim()
    .notEmpty()
    .withMessage('New password is required')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters long')
], async (req, res) => {
  try {
    const { resetToken, newPassword } = req.body;
    
    await authService.resetPassword(resetToken, newPassword);
    
    res.json({
      success: true,
      message: 'Password reset successfully'
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
 * @route   GET /api/v1/auth/profile
 * @desc    Get user profile
 * @access  Private
 */
router.get('/profile', async (req, res) => {
  try {
    const userId = req.user.id; // From authenticateToken middleware
    
    const profile = await authService.getUserProfile(userId);
    
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
 * @route   PUT /api/v1/auth/profile
 * @desc    Update user profile
 * @access  Private
 */
router.put('/profile', [
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
], async (req, res) => {
  try {
    const userId = req.user.id; // From authenticateToken middleware
    const profileData = req.body;
    
    const updatedProfile = await authService.updateUserProfile(userId, profileData);
    
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
 * @route   GET /api/v1/auth/validate-token
 * @desc    Validate access token
 * @access  Public
 */
router.get('/validate-token', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Access token required',
          statusCode: 401
        }
      });
    }
    
    const token = authHeader.substring(7);
    const payload = await authService.validateToken(token);
    
    res.json({
      success: true,
      message: 'Token is valid',
      data: payload
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