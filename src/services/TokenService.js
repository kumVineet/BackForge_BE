/**
 * Token Service
 * Handles JWT token generation, validation, and management
 */
const BaseService = require('../core/BaseService');
const jwt = require('jsonwebtoken');
const { config } = require('../config/app');
const { query } = require('../config/database');

class TokenService extends BaseService {
  constructor() {
    super();
    this.jwtSecret = config.jwtSecret;
    this.accessTokenExpiry = config.jwtExpiresIn;
    this.refreshTokenExpiry = config.refreshTokenExpiresIn;
  }

  /**
   * Generate access and refresh token pair
   * @param {number} userId - User ID
   * @param {string} email - User email
   * @param {string} role - User role
   * @returns {Promise<Object>} Token pair
   */
  async generateTokenPair(userId, email, role) {
    try {
      this.validateRequiredParams({ userId, email, role }, ['userId', 'email', 'role']);

      const accessToken = this.generateAccessToken(userId, email, role);
      const refreshToken = this.generateRefreshToken(userId, email, role);

      // Save refresh token to database
      await this.saveRefreshToken(userId, refreshToken);

      return {
        accessToken,
        refreshToken,
        expiresIn: this.getTokenExpiryTime(this.accessTokenExpiry)
      };
    } catch (error) {
      this.handleError(error, 'generateTokenPair');
    }
  }

  /**
   * Generate access token
   * @param {number} userId - User ID
   * @param {string} email - User email
   * @param {string} role - User role
   * @returns {string} Access token
   */
  generateAccessToken(userId, email, role) {
    const payload = {
      userId,
      email,
      role,
      type: 'access'
    };

    return jwt.sign(payload, this.jwtSecret, {
      expiresIn: this.accessTokenExpiry
    });
  }

  /**
   * Generate refresh token
   * @param {number} userId - User ID
   * @param {string} email - User email
   * @param {string} role - User role
   * @returns {string} Refresh token
   */
  generateRefreshToken(userId, email, role) {
    const payload = {
      userId,
      email,
      role,
      type: 'refresh'
    };

    return jwt.sign(payload, this.jwtSecret, {
      expiresIn: this.refreshTokenExpiry
    });
  }

  /**
   * Verify and decode a token
   * @param {string} token - JWT token
   * @returns {Object} Decoded token payload
   */
  verifyToken(token) {
    try {
      return jwt.verify(token, this.jwtSecret);
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('Token expired');
      }
      if (error.name === 'JsonWebTokenError') {
        throw new Error('Invalid token');
      }
      throw error;
    }
  }

  /**
   * Validate access token
   * @param {string} token - Access token
   * @returns {Object} Token payload
   */
  validateAccessToken(token) {
    const payload = this.verifyToken(token);
    
    if (payload.type !== 'access') {
      throw new Error('Invalid token type');
    }
    
    return payload;
  }

  /**
   * Validate refresh token
   * @param {string} token - Refresh token
   * @returns {Object} Token payload
   */
  validateRefreshToken(token) {
    const payload = this.verifyToken(token);
    
    if (payload.type !== 'refresh') {
      throw new Error('Invalid token type');
    }
    
    return payload;
  }

  /**
   * Save refresh token to database
   * @param {number} userId - User ID
   * @param {string} refreshToken - Refresh token
   * @returns {Promise<boolean>} True if saved successfully
   */
  async saveRefreshToken(userId, refreshToken) {
    try {
      // First, revoke any existing tokens for this user
      await this.revokeUserTokens(userId);
      
      // Then insert the new token
      const text = `
        INSERT INTO refresh_tokens (user_id, token, expires_at) 
        VALUES ($1, $2, $3)
      `;
      
      const expiresAt = new Date(Date.now() + this.getTokenExpiryTimeMs(this.refreshTokenExpiry));
      
      await query(text, [userId, refreshToken, expiresAt]);
      return true;
    } catch (error) {
      console.error('Error saving refresh token:', error);
      throw new Error('Failed to save refresh token');
    }
  }

  /**
   * Revoke refresh token
   * @param {string} refreshToken - Refresh token to revoke
   * @returns {Promise<boolean>} True if revoked successfully
   */
  async revokeRefreshToken(refreshToken) {
    try {
      const text = 'DELETE FROM refresh_tokens WHERE token = $1 RETURNING id';
      const result = await query(text, [refreshToken]);
      return result.rows.length > 0;
    } catch (error) {
      console.error('Error revoking refresh token:', error);
      throw new Error('Failed to revoke refresh token');
    }
  }

  /**
   * Revoke all refresh tokens for a specific user
   * @param {number} userId - User ID
   * @returns {Promise<boolean>} True if revoked successfully
   */
  async revokeUserTokens(userId) {
    try {
      const text = 'DELETE FROM refresh_tokens WHERE user_id = $1 RETURNING id';
      const result = await query(text, [userId]);
      return result.rows.length > 0;
    } catch (error) {
      console.error('Error revoking user tokens:', error);
      throw new Error('Failed to revoke user tokens');
    }
  }

  /**
   * Check if refresh token is valid
   * @param {string} refreshToken - Refresh token to check
   * @returns {Promise<boolean>} True if valid
   */
  async isRefreshTokenValid(refreshToken) {
    try {
      const text = `
        SELECT id FROM refresh_tokens 
        WHERE token = $1 AND expires_at > CURRENT_TIMESTAMP
      `;
      
      const result = await query(text, [refreshToken]);
      return result.rows.length > 0;
    } catch (error) {
      console.error('Error checking refresh token validity:', error);
      return false;
    }
  }

  /**
   * Clean up expired refresh tokens
   * @returns {Promise<number>} Number of tokens cleaned up
   */
  async cleanupExpiredTokens() {
    try {
      const text = 'DELETE FROM refresh_tokens WHERE expires_at < CURRENT_TIMESTAMP RETURNING id';
      const result = await query(text);
      return result.rows.length;
    } catch (error) {
      console.error('Error cleaning up expired tokens:', error);
      return 0;
    }
  }

  /**
   * Get token expiry time in seconds
   * @param {string} expiryString - Expiry string (e.g., '1h', '7d')
   * @returns {number} Expiry time in seconds
   */
  getTokenExpiryTime(expiryString) {
    const timeUnits = {
      's': 1,
      'm': 60,
      'h': 3600,
      'd': 86400
    };
    
    const match = expiryString.match(/^(\d+)([smhd])$/);
    if (!match) {
      return 3600; // Default to 1 hour
    }
    
    const [, value, unit] = match;
    return parseInt(value) * timeUnits[unit];
  }

  /**
   * Get token expiry time in milliseconds
   * @param {string} expiryString - Expiry string
   * @returns {number} Expiry time in milliseconds
   */
  getTokenExpiryTimeMs(expiryString) {
    return this.getTokenExpiryTime(expiryString) * 1000;
  }

  /**
   * Get token payload without verification (for debugging)
   * @param {string} token - JWT token
   * @returns {Object|null} Decoded payload or null
   */
  decodeTokenWithoutVerification(token) {
    try {
      return jwt.decode(token);
    } catch (error) {
      return null;
    }
  }

  /**
   * Check if token is about to expire
   * @param {string} token - JWT token
   * @param {number} thresholdSeconds - Threshold in seconds
   * @returns {boolean} True if token expires soon
   */
  isTokenExpiringSoon(token, thresholdSeconds = 300) {
    try {
      const payload = jwt.decode(token);
      if (!payload || !payload.exp) {
        return false;
      }
      
      const currentTime = Math.floor(Date.now() / 1000);
      const timeUntilExpiry = payload.exp - currentTime;
      
      return timeUntilExpiry <= thresholdSeconds;
    } catch (error) {
      return false;
    }
  }
}

module.exports = TokenService;
