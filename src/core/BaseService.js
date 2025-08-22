/**
 * Base Service Class
 * Provides common functionality for all services
 */
class BaseService {
  constructor() {
    if (this.constructor === BaseService) {
      throw new Error('BaseService cannot be instantiated directly');
    }
  }

  /**
   * Handle service errors consistently
   * @param {Error} error - The error to handle
   * @param {string} context - Context where error occurred
   * @returns {Object} Formatted error response
   */
  handleError(error, context = '') {
    console.error(`[${this.constructor.name}] Error in ${context}:`, error);
    
    if (error.name === 'ValidationError') {
      throw error;
    }
    
    if (error.name === 'AuthenticationError') {
      throw error;
    }
    
    if (error.name === 'AuthorizationError') {
      throw error;
    }
    
    // Default to internal server error
    throw new Error(`Internal server error in ${context}`);
  }

  /**
   * Validate required parameters
   * @param {Object} params - Parameters to validate
   * @param {Array} required - Array of required parameter names
   * @throws {Error} If required parameters are missing
   */
  validateRequiredParams(params, required) {
    const missing = required.filter(param => !params.hasOwnProperty(param) || params[param] === undefined);
    if (missing.length > 0) {
      throw new Error(`Missing required parameters: ${missing.join(', ')}`);
    }
  }

  /**
   * Sanitize input data
   * @param {Object} data - Data to sanitize
   * @returns {Object} Sanitized data
   */
  sanitizeInput(data) {
    if (!data || typeof data !== 'object') {
      return data;
    }
    
    const sanitized = {};
    for (const [key, value] of Object.entries(data)) {
      if (typeof value === 'string') {
        sanitized[key] = value.trim();
      } else {
        sanitized[key] = value;
      }
    }
    
    return sanitized;
  }
}

module.exports = BaseService;
