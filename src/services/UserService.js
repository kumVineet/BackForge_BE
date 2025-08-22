/**
 * User Service
 * Handles user management and profile operations
 */
const BaseService = require('../core/BaseService');
const UserRepository = require('../repositories/UserRepository');
const { ValidationError, AuthenticationError } = require('../utils/errors');

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
   * Get all users (admin only)
   * @param {Object} options - Query options
   * @param {number} options.page - Page number
   * @param {number} options.limit - Items per page
   * @param {string} options.search - Search term
   * @param {string} options.role - Filter by role
   * @returns {Promise<Object>} Users with pagination
   */
  async getAllUsers(options = {}) {
    try {
      const { page = 1, limit = 20, search, role } = options;
      const offset = (page - 1) * limit;
      
      let users;
      if (search) {
        users = await this.userRepository.searchUsers(search, { limit, offset });
      } else if (role) {
        users = await this.userRepository.findByRole(role, { limit, offset });
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
   * Get users by role
   * @param {string} role - User role
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of users
   */
  async getUsersByRole(role, options = {}) {
    try {
      this.validateRequiredParams({ role }, ['role']);
      
      const users = await this.userRepository.findByRole(role, options);
      
      // Remove sensitive data
      return users.map(user => {
        const { password_hash, ...safeUser } = user;
        return safeUser;
      });
    } catch (error) {
      this.handleError(error, 'getUsersByRole');
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
   * Deactivate user account
   * @param {number} userId - User ID to deactivate
   * @param {number} adminUserId - Admin user ID making the request
   * @returns {Promise<Object>} Deactivated user
   */
  async deactivateUser(userId, adminUserId) {
    try {
      this.validateRequiredParams({ userId, adminUserId }, ['userId', 'adminUserId']);
      
      // Check if requesting user is admin
      const adminUser = await this.userRepository.findById(adminUserId);
      if (!adminUser || adminUser.role !== 'admin') {
        throw new AuthenticationError('Admin privileges required');
      }
      
      // Check if user exists
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }
      
      // Deactivate user
      const deactivatedUser = await this.userRepository.softDelete(userId);
      
      if (!deactivatedUser) {
        throw new Error('Failed to deactivate user');
      }
      
      // Remove sensitive data
      const { password_hash, ...safeUser } = deactivatedUser;
      return safeUser;
    } catch (error) {
      this.handleError(error, 'deactivateUser');
    }
  }

  /**
   * Reactivate user account
   * @param {number} userId - User ID to reactivate
   * @param {number} adminUserId - Admin user ID making the request
   * @returns {Promise<Object>} Reactivated user
   */
  async reactivateUser(userId, adminUserId) {
    try {
      this.validateRequiredParams({ userId, adminUserId }, ['userId', 'adminUserId']);
      
      // Check if requesting user is admin
      const adminUser = await this.userRepository.findById(adminUserId);
      if (!adminUser || adminUser.role !== 'admin') {
        throw new AuthenticationError('Admin privileges required');
      }
      
      // Check if user exists
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }
      
      // Reactivate user
      const reactivatedUser = await this.userRepository.reactivate(userId);
      
      if (!reactivatedUser) {
        throw new Error('Failed to reactivate user');
      }
      
      // Remove sensitive data
      const { password_hash, ...safeUser } = reactivatedUser;
      return safeUser;
    } catch (error) {
      this.handleError(error, 'reactivateUser');
    }
  }

  /**
   * Change user role
   * @param {number} userId - User ID
   * @param {string} newRole - New role
   * @param {number} adminUserId - Admin user ID making the request
   * @returns {Promise<Object>} Updated user
   */
  async changeUserRole(userId, newRole, adminUserId) {
    try {
      this.validateRequiredParams({ userId, newRole, adminUserId }, ['userId', 'newRole', 'adminUserId']);
      
      // Validate role
      if (!['user', 'admin'].includes(newRole)) {
        throw new ValidationError('Invalid role. Must be either "user" or "admin"');
      }
      
      // Check if requesting user is admin
      const adminUser = await this.userRepository.findById(adminUserId);
      if (!adminUser || adminUser.role !== 'admin') {
        throw new AuthenticationError('Admin privileges required');
      }
      
      // Check if user exists
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }
      
      // Update role
      const updatedUser = await this.userRepository.updateById(userId, { role: newRole });
      
      if (!updatedUser) {
        throw new Error('Failed to update user role');
      }
      
      // Remove sensitive data
      const { password_hash, ...safeUser } = updatedUser;
      return safeUser;
    } catch (error) {
      this.handleError(error, 'changeUserRole');
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
      
      // This would typically include more activity data
      // For now, return basic user info
      const { password_hash, ...safeUser } = user;
      
      return {
        user: safeUser,
        activity: {
          lastLogin: user.last_login || null,
          accountAge: user.created_at ? Math.floor((Date.now() - new Date(user.created_at)) / (1000 * 60 * 60 * 24)) : 0,
          status: user.is_active ? 'active' : 'inactive'
        }
      };
    } catch (error) {
      this.handleError(error, 'getUserActivitySummary');
    }
  }

  /**
   * Validate user permissions
   * @param {number} userId - User ID
   * @param {string} permission - Permission to check
   * @returns {Promise<boolean>} True if user has permission
   */
  async hasPermission(userId, permission) {
    try {
      this.validateRequiredParams({ userId, permission }, ['userId', 'permission']);
      
      const user = await this.userRepository.findById(userId);
      if (!user || !user.is_active) {
        return false;
      }
      
      // Basic permission system
      switch (permission) {
        case 'admin':
          return user.role === 'admin';
        case 'user_management':
          return user.role === 'admin';
        case 'file_upload':
          return true; // All active users can upload files
        case 'file_delete':
          return true; // Users can delete their own files
        default:
          return false;
      }
    } catch (error) {
      this.handleError(error, 'hasPermission');
    }
  }
}

module.exports = UserService;
