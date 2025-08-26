/**
 * User Service
 * Handles user management and profile operations
 */
const BaseService = require('../core/BaseService');
const UserRepository = require('../repositories/UserRepository');
const { ValidationError } = require('../utils/errors');

class UserService extends BaseService {
  constructor(userRepository) {
    super();
    
    if (!userRepository) {
      throw new Error('UserRepository is required');
    }
    
    this.userRepository = userRepository;
  }

  /**
   * Get user profile by ID
   * @param {number} userId - User ID
   * @param {number} requestingUserId - ID of user making the request
   * @returns {Promise<Object>} User profile
   */
  async getUserProfile(userId, requestingUserId) {
    try {
      this.validateRequiredParams({ userId, requestingUserId }, ['userId', 'requestingUserId']);
      
      const user = await this.userRepository.findById(userId);
      
      if (!user) {
        throw new Error('User not found');
      }
      
      // Check if user is active
      if (user.is_active === false) {
        throw new Error('User account is deactivated');
      }
      
      // Remove sensitive data
      const { password_hash, ...safeUser } = user;
      
      return safeUser;
    } catch (error) {
      this.handleError(error, 'getUserProfile');
    }
  }

  /**
   * Update user profile
   * @param {number} userId - User ID
   * @param {Object} profileData - Profile data to update
   * @returns {Promise<Object>} Updated user profile
   */
  async updateUserProfile(userId, profileData) {
    try {
      this.validateRequiredParams({ userId, profileData }, ['userId', 'profileData']);
      
      // Sanitize input
      const sanitizedData = this.sanitizeInput(profileData);
      
      // Remove fields that shouldn't be updated
      const { id, email, role, password_hash, created_at, ...updateableFields } = sanitizedData;
      
      if (Object.keys(updateableFields).length === 0) {
        throw new ValidationError('No valid fields to update');
      }
      
      // Update profile
      const updatedUser = await this.userRepository.updateById(userId, updateableFields);
      
      if (!updatedUser) {
        throw new Error('User not found');
      }
      
      // Remove sensitive data
      const { password_hash: _, ...safeUser } = updatedUser;
      return safeUser;
    } catch (error) {
      this.handleError(error, 'updateUserProfile');
    }
  }

  /**
   * Get all users with pagination and search
   * @param {Object} options - Query options
   * @param {number} options.page - Page number
   * @param {number} options.limit - Results per page
   * @param {string} options.search - Search term
   * @returns {Promise<Object>} Users with pagination
   */
  async getAllUsers(options = {}) {
    try {
      const { page = 1, limit = 20, search } = options;
      
      // Validate search term length if provided
      if (search && search.length < 2) {
        throw new ValidationError('Search term must be at least 2 characters long');
      }
      
      const offset = (page - 1) * limit;
      
      let users;
      if (search) {
        users = await this.userRepository.searchUsers(search, { limit, offset });
      } else {
        users = await this.userRepository.findAll({ limit, offset });
      }
      
      // Get total count
      const totalCount = await this.userRepository.count();
      const totalPages = Math.ceil(totalCount / limit);
      
      // Remove sensitive data from all users
      const safeUsers = users.map(user => {
        const { password_hash, ...safeUser } = user;
        return safeUser;
      });
      
      return {
        users: safeUsers,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalUsers: totalCount,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      };
    } catch (error) {
      this.handleError(error, 'getAllUsers');
    }
  }

  /**
   * Search users
   * @param {string} searchTerm - Search term
   * @param {Object} options - Search options
   * @returns {Promise<Array>} Array of matching users
   */
  async searchUsers(searchTerm, options = {}) {
    try {
      this.validateRequiredParams({ searchTerm }, ['searchTerm']);
      
      // Validate search term length
      if (searchTerm.length < 2) {
        throw new ValidationError('Search term must be at least 2 characters long');
      }
      
      const users = await this.userRepository.searchUsers(searchTerm, options);
      
      // Remove sensitive data
      return users.map(user => {
        const { password_hash, ...safeUser } = user;
        return safeUser;
      });
    } catch (error) {
      this.handleError(error, 'searchUsers');
    }
  }

  /**
   * Get user statistics
   * @returns {Promise<Object>} User statistics
   */
  async getUserStats() {
    try {
      return await this.userRepository.getUserStats();
    } catch (error) {
      this.handleError(error, 'getUserStats');
    }
  }

  /**
   * Get user activity summary
   * @param {number} userId - User ID
   * @returns {Promise<Object>} User activity summary
   */
  async getUserActivitySummary(userId) {
    try {
      this.validateRequiredParams({ userId }, ['userId']);
      
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }
      
      return {
        userId: user.id,
        email: user.email,
        name: user.name,
        status: user.is_active ? 'active' : 'inactive',
        accountAge: user.created_at ? Math.floor((Date.now() - new Date(user.created_at)) / (1000 * 60 * 60 * 24)) : 0,
        lastLogin: user.last_login || null
      };
    } catch (error) {
      this.handleError(error, 'getUserActivitySummary');
    }
  }

  /**
   * Check if user has specific permission
   * @param {number} userId - User ID
   * @param {string} permission - Permission to check
   * @returns {Promise<boolean>} True if user has permission
   */
  async hasPermission(userId, permission) {
    try {
      this.validateRequiredParams({ userId, permission }, ['userId', 'permission']);
      
      const user = await this.userRepository.findById(userId);
      if (!user) {
        return false;
      }
      
      // Basic permission checks for regular users
      switch (permission) {
        case 'file_upload':
          return user.is_active === true;
        case 'file_delete':
          return user.is_active === true;
        default:
          return false;
      }
    } catch (error) {
      this.handleError(error, 'hasPermission');
      return false;
    }
  }
}

module.exports = UserService;
