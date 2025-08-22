/**
 * Authentication Service
 * Handles user authentication, registration, and session management
 */
const BaseService = require('../core/BaseService');
const IAuthService = require('../core/interfaces/IAuthService');
const UserRepository = require('../repositories/UserRepository');
const TokenService = require('./TokenService');
const { AuthenticationError, ValidationError } = require('../utils/errors');

class AuthService extends BaseService {
  constructor(userRepository, tokenService) {
    super();
    
    if (!userRepository || !tokenService) {
      throw new Error('UserRepository and TokenService are required');
    }
    
    this.userRepository = userRepository;
    this.tokenService = tokenService;
  }

  /**
   * Authenticate a user with credentials
   * @param {string} identifier - Email or mobile number
   * @param {string} password - User password
   * @returns {Promise<Object>} Authentication result with user and tokens
   */
  async authenticateUser(identifier, password) {
    try {
      this.validateRequiredParams({ identifier, password }, ['identifier', 'password']);
      
      // Sanitize input
      const sanitizedIdentifier = identifier.trim().toLowerCase();
      
      // Find user by email or mobile
      const user = await this.userRepository.findByEmailOrMobile(sanitizedIdentifier);
      
      if (!user) {
        throw new AuthenticationError('Invalid credentials');
      }
      
      // Verify password
      const isValidPassword = await this.userRepository.verifyPassword(password, user.password);
      
      if (!isValidPassword) {
        throw new AuthenticationError('Invalid credentials');
      }
      
      // Check if user is active
      if (user.is_active === false) {
        throw new AuthenticationError('Account is deactivated');
      }
      
      // Generate tokens
      const tokens = await this.tokenService.generateTokenPair(user.id, user.email, user.role);
      
      // Remove sensitive data from user object
      const { password: userPassword, ...safeUser } = user;
      
      return {
        user: safeUser,
        tokens
      };
    } catch (error) {
      this.handleError(error, 'authenticateUser');
    }
  }

  /**
   * Register a new user
   * @param {Object} userData - User registration data
   * @returns {Promise<Object>} Created user with tokens
   */
  async registerUser(userData) {
    try {
      this.validateRequiredParams(userData, ['name', 'email', 'password']);
      
      // Sanitize input
      const sanitizedData = this.sanitizeInput(userData);
      
      // Validate email format
      if (!this.isValidEmail(sanitizedData.email)) {
        throw new ValidationError('Invalid email format');
      }
      
      // Validate password strength
      if (!this.isValidPassword(sanitizedData.password)) {
        throw new ValidationError('Password must be at least 8 characters long');
      }
      
      // Check if email already exists
      const existingUser = await this.userRepository.findByEmail(sanitizedData.email);
      if (existingUser) {
        throw new ValidationError('Email already registered');
      }
      
      // Check if mobile already exists (if provided)
      if (sanitizedData.mobile) {
        const existingMobile = await this.userRepository.findByMobile(sanitizedData.mobile);
        if (existingMobile) {
          throw new ValidationError('Mobile number already registered');
        }
      }
      
      // Create user
      const newUser = await this.userRepository.createUser(sanitizedData);
      
      // Generate tokens
      const tokens = await this.tokenService.generateTokenPair(newUser.id, newUser.email, newUser.role);
      
      // Remove sensitive data
      const { password: userPassword, ...safeUser } = newUser;
      
      return {
        user: safeUser,
        tokens
      };
    } catch (error) {
      this.handleError(error, 'registerUser');
    }
  }

  /**
   * Refresh an access token using refresh token
   * @param {string} refreshToken - Valid refresh token
   * @returns {Promise<Object>} New token pair
   */
  async refreshToken(refreshToken) {
    try {
      this.validateRequiredParams({ refreshToken }, ['refreshToken']);
      
      // Validate refresh token
      const payload = this.tokenService.validateRefreshToken(refreshToken);
      
      // Check if refresh token exists in database
      const isValid = await this.tokenService.isRefreshTokenValid(refreshToken);
      if (!isValid) {
        throw new AuthenticationError('Invalid refresh token');
      }
      
      // Get user details
      const user = await this.userRepository.findById(payload.userId);
      if (!user || user.is_active === false) {
        throw new AuthenticationError('User not found or inactive');
      }
      
      // Generate new token pair
      const tokens = await this.tokenService.generateTokenPair(user.id, user.email, user.role);
      
      // Revoke old refresh token
      await this.tokenService.revokeRefreshToken(refreshToken);
      
      return tokens;
    } catch (error) {
      this.handleError(error, 'refreshToken');
    }
  }

  /**
   * Logout a user (revoke tokens)
   * @param {string} refreshToken - Refresh token to revoke
   * @returns {Promise<boolean>} True if logout successful
   */
  async logout(refreshToken) {
    try {
      this.validateRequiredParams({ refreshToken }, ['refreshToken']);
      
      // Revoke refresh token
      const revoked = await this.tokenService.revokeRefreshToken(refreshToken);
      
      if (!revoked) {
        throw new AuthenticationError('Invalid refresh token');
      }
      
      return true;
    } catch (error) {
      this.handleError(error, 'logout');
    }
  }

  /**
   * Validate an access token
   * @param {string} token - Access token to validate
   * @returns {Promise<Object>} Token payload if valid
   */
  async validateToken(token) {
    try {
      this.validateRequiredParams({ token }, ['token']);
      
      // Validate access token
      const payload = this.tokenService.validateAccessToken(token);
      
      // Check if user still exists and is active
      const user = await this.userRepository.findById(payload.userId);
      if (!user || user.is_active === false) {
        throw new AuthenticationError('User not found or inactive');
      }
      
      return payload;
    } catch (error) {
      this.handleError(error, 'validateToken');
    }
  }

  /**
   * Change user password
   * @param {number} userId - User ID
   * @param {string} currentPassword - Current password
   * @param {string} newPassword - New password
   * @returns {Promise<boolean>} True if password changed successfully
   */
  async changePassword(userId, currentPassword, newPassword) {
    try {
      this.validateRequiredParams({ userId, currentPassword, newPassword }, ['userId', 'currentPassword', 'newPassword']);
      
      // Get user
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw new AuthenticationError('User not found');
      }
      
      // Verify current password
      const isValidPassword = await this.userRepository.verifyPassword(currentPassword, user.password);
      if (!isValidPassword) {
        throw new AuthenticationError('Current password is incorrect');
      }
      
      // Validate new password
      if (!this.isValidPassword(newPassword)) {
        throw new ValidationError('New password must be at least 8 characters long');
      }
      
      // Update password
      await this.userRepository.updatePassword(userId, newPassword);
      
      // Revoke all refresh tokens for this user (force re-login)
      await this.revokeAllUserTokens(userId);
      
      return true;
    } catch (error) {
      this.handleError(error, 'changePassword');
    }
  }

  /**
   * Request password reset
   * @param {string} email - User email
   * @returns {Promise<boolean>} True if reset email sent
   */
  async requestPasswordReset(email) {
    try {
      this.validateRequiredParams({ email }, ['email']);
      
      if (!this.isValidEmail(email)) {
        throw new ValidationError('Invalid email format');
      }
      
      const user = await this.userRepository.findByEmail(email);
      if (!user) {
        // Don't reveal if email exists or not
        return true;
      }
      
      // Generate reset token (implement based on your requirements)
      // For now, just return true
      return true;
    } catch (error) {
      this.handleError(error, 'requestPasswordReset');
    }
  }

  /**
   * Reset password with reset token
   * @param {string} resetToken - Password reset token
   * @param {string} newPassword - New password
   * @returns {Promise<boolean>} True if password reset successful
   */
  async resetPassword(resetToken, newPassword) {
    try {
      this.validateRequiredParams({ resetToken, newPassword }, ['resetToken', 'newPassword']);
      
      // Validate new password
      if (!this.isValidPassword(newPassword)) {
        throw new ValidationError('Password must be at least 8 characters long');
      }
      
      // TODO: Implement reset token validation and user lookup
      // For now, throw error
      throw new Error('Password reset not implemented yet');
    } catch (error) {
      this.handleError(error, 'resetPassword');
    }
  }

  /**
   * Revoke all tokens for a specific user
   * @param {number} userId - User ID
   * @returns {Promise<number>} Number of tokens revoked
   */
  async revokeAllUserTokens(userId) {
    try {
      const text = 'DELETE FROM refresh_tokens WHERE user_id = $1 RETURNING id';
      const result = await this.userRepository.executeQuery(text, [userId]);
      return result.rows.length;
    } catch (error) {
      console.error('Error revoking user tokens:', error);
      return 0;
    }
  }

  /**
   * Validate email format
   * @param {string} email - Email to validate
   * @returns {boolean} True if valid email
   */
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate password strength
   * @param {string} password - Password to validate
   * @returns {boolean} True if valid password
   */
  isValidPassword(password) {
    return password && password.length >= 8;
  }

  /**
   * Get user profile by ID
   * @param {number} userId - User ID
   * @returns {Promise<Object>} User profile
   */
  async getUserProfile(userId) {
    try {
      this.validateRequiredParams({ userId }, ['userId']);
      
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw new AuthenticationError('User not found');
      }
      
      // Remove sensitive data
      const { password: userPassword, ...safeUser } = user;
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
      const { id, email, role, password, created_at, ...updateableFields } = sanitizedData;
      
      if (Object.keys(updateableFields).length === 0) {
        throw new ValidationError('No valid fields to update');
      }
      
      // Update profile
      const updatedUser = await this.userRepository.updateById(userId, updateableFields);
      
      if (!updatedUser) {
        throw new AuthenticationError('User not found');
      }
      
      // Remove sensitive data
      const { password: _, ...safeUser } = updatedUser;
      return safeUser;
    } catch (error) {
      this.handleError(error, 'updateUserProfile');
    }
  }
}

module.exports = AuthService;
