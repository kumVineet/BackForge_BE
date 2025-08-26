/**
 * User Repository
 * Handles all user-related database operations
 */
const BaseRepository = require('../core/BaseRepository');
const bcrypt = require('bcrypt');

class UserRepository extends BaseRepository {
  constructor() {
    super('users');
  }

  /**
   * Find user by email or mobile number
   * @param {string} identifier - Email or mobile number
   * @returns {Promise<Object|null>} User object or null
   */
  async findByEmailOrMobile(identifier) {
    const text = `
      SELECT * FROM ${this.tableName} 
      WHERE email = $1 OR mobile_number = $1 
      LIMIT 1
    `;
    
    const result = await this.executeQuery(text, [identifier]);
    return result.rows[0] || null;
  }

  /**
   * Find user by email
   * @param {string} email - User email
   * @returns {Promise<Object|null>} User object or null
   */
  async findByEmail(email) {
    return this.findOneByField('email', email);
  }

  /**
   * Find user by mobile number
   * @param {string} mobile - User mobile number
   * @returns {Promise<Object|null>} User object or null
   */
  async findByMobile(mobile) {
    return this.findOneByField('mobile_number', mobile);
  }

  /**
   * Create a new user with password hashing
   * @param {Object} userData - User data
   * @returns {Promise<Object>} Created user
   */
  async createUser(userData) {
    const { password, ...otherData } = userData;
    
    // Hash password if provided
    if (password) {
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);
      otherData.password = hashedPassword;
    }
    
    // Set default role if not provided
    if (!otherData.role) {
      otherData.role = 'user';
    }
    
    return this.create(otherData);
  }

  /**
   * Update user password
   * @param {number} userId - User ID
   * @param {string} newPassword - New password
   * @returns {Promise<Object|null>} Updated user
   */
  async updatePassword(userId, newPassword) {
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
    
    return this.updateById(userId, { password: hashedPassword });
  }

  /**
   * Verify user password
   * @param {string} password - Plain text password
   * @param {string} hashedPassword - Hashed password from database
   * @returns {Promise<boolean>} True if password matches
   */
  async verifyPassword(password, hashedPassword) {
    return bcrypt.compare(password, hashedPassword);
  }

  /**
   * Find all users with optional pagination (regular users only)
   * @param {Object} options - Query options
   * @param {number} options.limit - Number of records to return
   * @param {number} options.offset - Number of records to skip
   * @param {string} options.orderBy - Column to order by
   * @param {string} options.order - Order direction (ASC/DESC)
   * @returns {Promise<Array>} Array of users
   */
  async findAll(options = {}) {
    const { limit = 100, offset = 0, orderBy = 'id', order = 'ASC' } = options;
    
    const text = `
      SELECT * FROM ${this.tableName} 
      WHERE role = 'user'
      ORDER BY ${orderBy} ${order}
      LIMIT $1 OFFSET $2
    `;
    
    const result = await this.executeQuery(text, [limit, offset]);
    return result.rows;
  }

  /**
   * Count total regular users
   * @returns {Promise<number>} Total count of regular users
   */
  async count() {
    const text = `SELECT COUNT(*) FROM ${this.tableName} WHERE role = 'user'`;
    const result = await this.executeQuery(text);
    return parseInt(result.rows[0].count);
  }

  /**
   * Search users by name or mobile number (regular users only)
   * @param {string} searchTerm - Search term
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of matching users
   */
  async searchUsers(searchTerm, options = {}) {
    const { limit = 100, offset = 0 } = options;
    
    const text = `
      SELECT * FROM ${this.tableName} 
      WHERE (name ILIKE $1 OR mobile_number ILIKE $1) AND role = 'user'
      ORDER BY created_at DESC 
      LIMIT $2 OFFSET $3
    `;
    
    const searchPattern = `%${searchTerm}%`;
    const result = await this.executeQuery(text, [searchPattern, limit, offset]);
    return result.rows;
  }

  /**
   * Get user statistics
   * @returns {Promise<Object>} User statistics
   */
  async getUserStats() {
    const text = `
      SELECT 
        COUNT(*) as total_users,
        COUNT(CASE WHEN role = 'admin' THEN 1 END) as admin_count,
        COUNT(CASE WHEN role = 'user' THEN 1 END) as user_count,
        COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as new_users_30d
      FROM ${this.tableName}
    `;
    
    const result = await this.executeQuery(text);
    return result.rows[0];
  }

  /**
   * Soft delete user (mark as inactive)
   * @param {number} userId - User ID
   * @returns {Promise<Object|null>} Updated user
   */
  async softDelete(userId) {
    return this.updateById(userId, { 
      is_active: false, 
      deleted_at: new Date() 
    });
  }

  /**
   * Reactivate user
   * @param {number} userId - User ID
   * @returns {Promise<Object|null>} Updated user
   */
  async reactivate(userId) {
    return this.updateById(userId, { 
      is_active: true, 
      deleted_at: null 
    });
  }
}

module.exports = UserRepository;
