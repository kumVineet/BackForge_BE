/**
 * Authentication Service Interface
 * Defines the contract for all authentication services
 */
class IAuthService {
  constructor() {
    if (this.constructor === IAuthService) {
      throw new Error('IAuthService cannot be instantiated directly');
    }
  }

  /**
   * Authenticate a user with credentials
   * @param {string} identifier - Email or mobile number
   * @param {string} password - User password
   * @returns {Promise<Object>} Authentication result with user and tokens
   */
  async authenticateUser(identifier, password) {
    throw new Error('authenticateUser method must be implemented');
  }

  /**
   * Register a new user
   * @param {Object} userData - User registration data
   * @returns {Promise<Object>} Created user with tokens
   */
  async registerUser(userData) {
    throw new Error('registerUser method must be implemented');
  }

  /**
   * Refresh an access token using refresh token
   * @param {string} refreshToken - Valid refresh token
   * @returns {Promise<Object>} New token pair
   */
  async refreshToken(refreshToken) {
    throw new Error('refreshToken method must be implemented');
  }

  /**
   * Logout a user (revoke tokens)
   * @param {string} refreshToken - Refresh token to revoke
   * @returns {Promise<boolean>} True if logout successful
   */
  async logout(refreshToken) {
    throw new Error('logout method must be implemented');
  }

  /**
   * Validate an access token
   * @param {string} token - Access token to validate
   * @returns {Promise<Object>} Token payload if valid
   */
  async validateToken(token) {
    throw new Error('validateToken method must be implemented');
  }

  /**
   * Change user password
   * @param {number} userId - User ID
   * @param {string} currentPassword - Current password
   * @param {string} newPassword - New password
   * @returns {Promise<boolean>} True if password changed successfully
   */
  async changePassword(userId, currentPassword, newPassword) {
    throw new Error('changePassword method must be implemented');
  }
}

module.exports = IAuthService;
