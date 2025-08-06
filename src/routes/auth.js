const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const { query } = require('../config/database');
const { config } = require('../config/app');
const { 
  ValidationError, 
  AuthenticationError, 
  ConflictError,
  DatabaseError 
} = require('../utils/errors');
const { 
  authenticateToken, 
  verifyRefreshToken 
} = require('../middleware/auth');
const { 
  generateTokenPair, 
  revokeRefreshToken, 
  revokeAllUserTokens 
} = require('../utils/tokens');

const router = express.Router();

// Validation middleware
const validateRegistration = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('name').trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
  body('role').optional().isIn(['user', 'admin']).withMessage('Role must be either user or admin')
];

const validateLogin = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required')
];

// Register endpoint
router.post('/register', validateRegistration, async (req, res, next) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', errors.array());
    }

    const { email, password, name, role = 'user' } = req.body;

    // Check if user already exists
    const existingUser = await query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      throw new ConflictError('User with this email already exists');
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user
    const result = await query(
      `INSERT INTO users (email, password, name, role, created_at) 
       VALUES ($1, $2, $3, $4, NOW()) 
       RETURNING id, email, name, role, created_at`,
      [email, hashedPassword, name, role]
    );

    const user = result.rows[0];

    // Generate token pair
    const tokens = await generateTokenPair(user.id, user.email, user.role, req);

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        created_at: user.created_at
      },
      tokens: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: config.jwtExpiresIn
      }
    });
  } catch (error) {
    next(error);
  }
});

// Login endpoint
router.post('/login', validateLogin, async (req, res, next) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', errors.array());
    }

    const { email, password } = req.body;

    // Find user
    const result = await query(
      'SELECT id, email, password, name, role, is_active FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      throw new AuthenticationError('Invalid credentials');
    }

    const user = result.rows[0];

    // Check if account is active
    if (!user.is_active) {
      throw new AuthenticationError('Account is deactivated');
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      throw new AuthenticationError('Invalid credentials');
    }

    // Update last login
    await query(
      'UPDATE users SET last_login = NOW() WHERE id = $1',
      [user.id]
    );

    // Generate token pair
    const tokens = await generateTokenPair(user.id, user.email, user.role, req);

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      },
      tokens: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: config.jwtExpiresIn
      }
    });
  } catch (error) {
    next(error);
  }
});

// Refresh token endpoint
router.post('/refresh', verifyRefreshToken, async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    const user = req.user;

    // Generate new token pair
    const tokens = await generateTokenPair(user.id, user.email, user.role, req);

    // Revoke the old refresh token
    await revokeRefreshToken(refreshToken);

    res.json({
      message: 'Tokens refreshed successfully',
      tokens: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: config.jwtExpiresIn
      }
    });
  } catch (error) {
    next(error);
  }
});

// Logout endpoint
router.post('/logout', authenticateToken, async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (refreshToken) {
      // Revoke the specific refresh token
      await revokeRefreshToken(refreshToken);
    }

    res.json({
      message: 'Logged out successfully'
    });
  } catch (error) {
    next(error);
  }
});

// Logout from all devices
router.post('/logout-all', authenticateToken, async (req, res, next) => {
  try {
    // Revoke all refresh tokens for the user
    await revokeAllUserTokens(req.user.id);

    res.json({
      message: 'Logged out from all devices successfully'
    });
  } catch (error) {
    next(error);
  }
});

// Verify token endpoint
router.get('/verify', authenticateToken, async (req, res, next) => {
  try {
    res.json({
      valid: true,
      user: {
        id: req.user.id,
        email: req.user.email,
        name: req.user.name,
        role: req.user.role
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get current user's active sessions
router.get('/sessions', authenticateToken, async (req, res, next) => {
  try {
    const result = await query(
      `SELECT id, created_at, created_ip, user_agent, expires_at 
       FROM refresh_tokens 
       WHERE user_id = $1 AND is_revoked = false AND expires_at > NOW()
       ORDER BY created_at DESC`,
      [req.user.id]
    );

    res.json({
      sessions: result.rows
    });
  } catch (error) {
    next(error);
  }
});

// Revoke specific session
router.delete('/sessions/:sessionId', authenticateToken, async (req, res, next) => {
  try {
    const { sessionId } = req.params;

    const result = await query(
      `UPDATE refresh_tokens 
       SET is_revoked = true 
       WHERE id = $1 AND user_id = $2 AND is_revoked = false
       RETURNING id`,
      [sessionId, req.user.id]
    );

    if (result.rows.length === 0) {
      throw new ValidationError('Session not found or already revoked');
    }

    res.json({
      message: 'Session revoked successfully'
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router; 