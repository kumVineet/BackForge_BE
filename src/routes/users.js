const express = require('express');
const { body, validationResult } = require('express-validator');
const { query } = require('../config/database');
const { 
  ValidationError, 
  NotFoundError, 
  ConflictError 
} = require('../utils/errors');
const { 
  authenticateToken, 
  requireAdmin
} = require('../middleware/auth');

const router = express.Router();

// Validation middleware
const validateUserUpdate = [
  body('name').optional().trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
  body('email').optional().isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('role').optional().isIn(['user', 'admin']).withMessage('Role must be either user or admin')
];

// Get current user profile
router.get('/profile', authenticateToken, async (req, res, next) => {
  try {
    const result = await query(
      `SELECT id, email, name, role, is_active, last_login, created_at, updated_at 
       FROM users WHERE id = $1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('User');
    }

    res.json({
      user: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
});

// Update user profile
router.put('/profile', authenticateToken, validateUserUpdate, async (req, res, next) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', errors.array());
    }

    const { name, email, role } = req.body;
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (name) {
      updates.push(`name = $${paramCount}`);
      values.push(name);
      paramCount++;
    }

    if (email) {
      // Check if email is already taken by another user
      const existingUser = await query(
        'SELECT id FROM users WHERE email = $1 AND id != $2',
        [email, req.user.id]
      );

      if (existingUser.rows.length > 0) {
        throw new ConflictError('Email already in use');
      }

      updates.push(`email = $${paramCount}`);
      values.push(email);
      paramCount++;
    }

    // Only allow role updates if user is admin
    if (role && req.user.role === 'admin') {
      updates.push(`role = $${paramCount}`);
      values.push(role);
      paramCount++;
    }

    if (updates.length === 0) {
      throw new ValidationError('No fields to update');
    }

    updates.push(`updated_at = NOW()`);
    values.push(req.user.id);

    const result = await query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramCount} 
       RETURNING id, email, name, role, is_active, last_login, created_at, updated_at`,
      values
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('User');
    }

    res.json({
      message: 'Profile updated successfully',
      user: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
});

// Get all users (admin only)
router.get('/', authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    const result = await query(
      `SELECT id, email, name, role, is_active, last_login, created_at, updated_at 
       FROM users ORDER BY created_at DESC`
    );

    res.json({
      users: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    next(error);
  }
});

// Get user by ID (admin or own profile)
router.get('/:id', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check if user is accessing their own profile or is admin
    if (req.user.role !== 'admin' && req.user.id !== parseInt(id)) {
      throw new ValidationError('You can only view your own profile');
    }

    const result = await query(
      `SELECT id, email, name, role, is_active, last_login, created_at, updated_at 
       FROM users WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('User');
    }

    res.json({
      user: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
});

// Update user by ID (admin only)
router.put('/:id', authenticateToken, requireAdmin, validateUserUpdate, async (req, res, next) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', errors.array());
    }

    const { id } = req.params;
    const { name, email, role, is_active } = req.body;
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (name) {
      updates.push(`name = $${paramCount}`);
      values.push(name);
      paramCount++;
    }

    if (email) {
      // Check if email is already taken by another user
      const existingUser = await query(
        'SELECT id FROM users WHERE email = $1 AND id != $2',
        [email, id]
      );

      if (existingUser.rows.length > 0) {
        throw new ConflictError('Email already in use');
      }

      updates.push(`email = $${paramCount}`);
      values.push(email);
      paramCount++;
    }

    if (role) {
      updates.push(`role = $${paramCount}`);
      values.push(role);
      paramCount++;
    }

    if (typeof is_active === 'boolean') {
      updates.push(`is_active = $${paramCount}`);
      values.push(is_active);
      paramCount++;
    }

    if (updates.length === 0) {
      throw new ValidationError('No fields to update');
    }

    updates.push(`updated_at = NOW()`);
    values.push(id);

    const result = await query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramCount} 
       RETURNING id, email, name, role, is_active, last_login, created_at, updated_at`,
      values
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('User');
    }

    res.json({
      message: 'User updated successfully',
      user: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
});

// Delete user (admin only)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;

    // Prevent admin from deleting themselves
    if (req.user.id === parseInt(id)) {
      throw new ValidationError('Cannot delete your own account');
    }

    const result = await query(
      'DELETE FROM users WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('User');
    }

    res.json({
      message: 'User deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

// Get user statistics (admin only)
router.get('/stats/overview', authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    const stats = await query(`
      SELECT 
        COUNT(*) as total_users,
        COUNT(CASE WHEN role = 'admin' THEN 1 END) as admin_count,
        COUNT(CASE WHEN role = 'user' THEN 1 END) as user_count,
        COUNT(CASE WHEN is_active = true THEN 1 END) as active_users,
        COUNT(CASE WHEN is_active = false THEN 1 END) as inactive_users,
        COUNT(CASE WHEN last_login > NOW() - INTERVAL '7 days' THEN 1 END) as recent_logins
      FROM users
    `);

    res.json({
      statistics: stats.rows[0]
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router; 