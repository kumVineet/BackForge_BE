const jwt = require('jsonwebtoken');
const { query } = require('../config/database');
const { config } = require('../config/app');
const { 
  AuthenticationError, 
  AuthorizationError, 
  NotFoundError 
} = require('../utils/errors');

// Verify JWT token middleware
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      throw new AuthenticationError('Access token required');
    }

    // Verify token
    const decoded = jwt.verify(token, config.jwtSecret);
    
    // Check if user exists and is active
    const result = await query(
      'SELECT id, email, mobile_number, name, role, is_active FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      throw new AuthenticationError('Invalid token - user not found');
    }

    const user = result.rows[0];

    if (!user.is_active) {
      throw new AuthenticationError('Account is deactivated');
    }

    // Add user info to request
    req.user = {
      id: user.id,
      email: user.email,
      mobile_number: user.mobile_number,
      name: user.name,
      role: user.role
    };

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      next(new AuthenticationError('Invalid token. Please login again.'));
    } else if (error.name === 'TokenExpiredError') {
      // Enhanced token expiry error with helpful message
      const expiredError = new AuthenticationError('Access token has expired. Please refresh your token or login again.');
      expiredError.code = 'TOKEN_EXPIRED';
      expiredError.action = 'REFRESH_TOKEN';
      next(expiredError);
    } else {
      next(error);
    }
  }
};

// Role-based authorization middleware
const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AuthenticationError('Authentication required'));
    }

    if (!roles.includes(req.user.role)) {
      return next(new AuthorizationError(`Access denied. Required roles: ${roles.join(', ')}`));
    }

    next();
  };
};

// Admin-only middleware
const requireAdmin = authorizeRoles('admin');



// Verify refresh token middleware
const verifyRefreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      throw new AuthenticationError('Refresh token required');
    }

    // Check if refresh token exists and is not revoked
    const result = await query(
      `SELECT rt.*, u.id as user_id, u.email, u.mobile_number, u.name, u.role, u.is_active 
       FROM refresh_tokens rt 
       JOIN users u ON rt.user_id = u.id 
       WHERE rt.token = $1 AND rt.is_revoked = false AND rt.expires_at > NOW()`,
      [refreshToken]
    );

    if (result.rows.length === 0) {
      throw new AuthenticationError('Invalid or expired refresh token');
    }

    const tokenData = result.rows[0];

    if (!tokenData.is_active) {
      throw new AuthenticationError('Account is deactivated');
    }

    // Add token and user info to request
    req.refreshToken = tokenData;
    req.user = {
      id: tokenData.user_id,
      email: tokenData.email,
      mobile_number: tokenData.mobile_number,
      name: tokenData.name,
      role: tokenData.role
    };

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  authenticateToken,
  authorizeRoles,
  requireAdmin,
  verifyRefreshToken
}; 