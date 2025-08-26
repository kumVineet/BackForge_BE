/**
 * Profile Routes
 * Handles all profile-related API endpoints
 */
const express = require('express');
const { body, query, param } = require('express-validator');
const container = require('../config/container');
const { formatErrorResponse } = require('../utils/errors');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get services from container
const profileService = container.get('profileService');

// Validation middleware
const validateProfileData = [
  body('bio')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Bio must be less than 1000 characters'),
  body('date_of_birth')
    .optional()
    .isISO8601()
    .withMessage('Date of birth must be a valid date'),
  body('gender')
    .optional()
    .isIn(['male', 'female', 'other', 'prefer_not_to_say'])
    .withMessage('Gender must be one of: male, female, other, prefer_not_to_say'),
  body('location')
    .optional()
    .isLength({ max: 255 })
    .withMessage('Location must be less than 255 characters'),
  body('website')
    .optional()
    .isURL()
    .withMessage('Website must be a valid URL'),
  body('social_links')
    .optional()
    .isObject()
    .withMessage('Social links must be an object'),
  body('preferences')
    .optional()
    .isObject()
    .withMessage('Preferences must be an object'),
  body('skills')
    .optional()
    .isArray()
    .withMessage('Skills must be an array'),
  body('interests')
    .optional()
    .isArray()
    .withMessage('Interests must be an array'),
  body('occupation')
    .optional()
    .isLength({ max: 255 })
    .withMessage('Occupation must be less than 255 characters'),
  body('company')
    .optional()
    .isLength({ max: 255 })
    .withMessage('Company must be less than 255 characters'),
  body('education')
    .optional()
    .isObject()
    .withMessage('Education must be an object'),
  body('experience')
    .optional()
    .isObject()
    .withMessage('Experience must be an object'),
  body('achievements')
    .optional()
    .isObject()
    .withMessage('Achievements must be an object'),
  body('contact_info')
    .optional()
    .isObject()
    .withMessage('Contact info must be an object'),
  body('privacy_settings')
    .optional()
    .isObject()
    .withMessage('Privacy settings must be an object')
];

const validateProfileId = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Profile ID must be a positive integer')
];

const validateUserId = [
  param('userId')
    .isInt({ min: 1 })
    .withMessage('User ID must be a positive integer')
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
  query('search')
    .optional()
    .isLength({ max: 255 })
    .withMessage('Search query must be less than 255 characters'),
  query('location')
    .optional()
    .isLength({ max: 255 })
    .withMessage('Location must be less than 255 characters'),
  query('occupation')
    .optional()
    .isLength({ max: 255 })
    .withMessage('Occupation must be less than 255 characters'),
  query('skills')
    .optional()
    .isArray()
    .withMessage('Skills must be an array')
];

/**
 * @route   POST /api/v1/profiles
 * @desc    Create a new profile for the authenticated user
 * @access  Private
 */
router.post('/', authenticateToken, validateProfileData, async (req, res) => {
  try {
    const profileData = {
      user_id: req.user.id,
      ...req.body
    };
    
    const profile = await profileService.createProfile(profileData);
    
    res.status(201).json({
      success: true,
      message: 'Profile created successfully',
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
 * @route   GET /api/v1/profiles/me
 * @desc    Get the authenticated user's profile
 * @access  Private
 */
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const profile = await profileService.getProfileByUserId(req.user.id);
    
    if (!profile) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Profile not found',
          statusCode: 404
        }
      });
    }
    
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
 * @route   PUT /api/v1/profiles/me
 * @desc    Update the authenticated user's profile
 * @access  Private
 */
router.put('/me', authenticateToken, validateProfileData, async (req, res) => {
  try {
    const profile = await profileService.updateProfileByUserId(req.user.id, req.body);
    
    res.json({
      success: true,
      message: 'Profile updated successfully',
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
 * @route   DELETE /api/v1/profiles/me
 * @desc    Delete the authenticated user's profile
 * @access  Private
 */
router.delete('/me', authenticateToken, async (req, res) => {
  try {
    const deleted = await profileService.deleteProfileByUserId(req.user.id);
    
    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Profile not found',
          statusCode: 404
        }
      });
    }
    
    res.json({
      success: true,
      message: 'Profile deleted successfully'
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
 * @route   GET /api/v1/profiles
 * @desc    Get all profiles with pagination and filters
 * @access  Public
 */
router.get('/', validateQueryParams, async (req, res) => {
  try {
    const options = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 10,
      search: req.query.search || '',
      location: req.query.location || '',
      occupation: req.query.occupation || '',
      skills: req.query.skills || []
    };
    
    const result = await profileService.getAllProfiles(options);
    
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
 * @route   GET /api/v1/profiles/search
 * @desc    Search profiles by various criteria
 * @access  Public
 */
router.get('/search', async (req, res) => {
  try {
    const criteria = {
      query: req.query.q || '',
      location: req.query.location || '',
      occupation: req.query.occupation || '',
      skills: req.query.skills || [],
      interests: req.query.interests || []
    };
    
    const profiles = await profileService.searchProfiles(criteria);
    
    res.json({
      success: true,
      data: profiles
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
 * @route   GET /api/v1/profiles/location/:location
 * @desc    Get profiles by location
 * @access  Public
 */
router.get('/location/:location', async (req, res) => {
  try {
    const profiles = await profileService.getProfilesByLocation(req.params.location);
    
    res.json({
      success: true,
      data: profiles
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
 * @route   GET /api/v1/profiles/occupation/:occupation
 * @desc    Get profiles by occupation
 * @access  Public
 */
router.get('/occupation/:occupation', async (req, res) => {
  try {
    const profiles = await profileService.getProfilesByOccupation(req.params.occupation);
    
    res.json({
      success: true,
      data: profiles
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
 * @route   GET /api/v1/profiles/stats
 * @desc    Get profile statistics
 * @access  Public
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = await profileService.getProfileStats();
    
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
 * @route   GET /api/v1/profiles/:id
 * @desc    Get profile by ID
 * @access  Public
 */
router.get('/:id', validateProfileId, async (req, res) => {
  try {
    const profile = await profileService.getProfileById(parseInt(req.params.id));
    
    if (!profile) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Profile not found',
          statusCode: 404
        }
      });
    }
    
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
 * @route   GET /api/v1/profiles/user/:userId
 * @desc    Get profile by user ID
 * @access  Public
 */
router.get('/user/:userId', validateUserId, async (req, res) => {
  try {
    const profile = await profileService.getProfileByUserId(parseInt(req.params.userId));
    
    if (!profile) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Profile not found',
          statusCode: 404
        }
      });
    }
    
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
 * @route   PUT /api/v1/profiles/:id
 * @desc    Update profile by ID (Admin only)
 * @access  Private (Admin)
 */
router.put('/:id', authenticateToken, validateProfileId, validateProfileData, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: {
          message: 'Access denied. Admin privileges required.',
          statusCode: 403
        }
      });
    }
    
    const profile = await profileService.updateProfileById(parseInt(req.params.id), req.body);
    
    res.json({
      success: true,
      message: 'Profile updated successfully',
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
 * @route   DELETE /api/v1/profiles/:id
 * @desc    Delete profile by ID (Admin only)
 * @access  Private (Admin)
 */
router.delete('/:id', authenticateToken, validateProfileId, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: {
          message: 'Access denied. Admin privileges required.',
          statusCode: 403
        }
      });
    }
    
    const deleted = await profileService.deleteProfileById(parseInt(req.params.id));
    
    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Profile not found',
          statusCode: 404
        }
      });
    }
    
    res.json({
      success: true,
      message: 'Profile deleted successfully'
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
