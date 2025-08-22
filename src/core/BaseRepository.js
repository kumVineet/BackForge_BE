/**
 * Base Repository Class
 * Provides common database operations for all repositories
 */
const { query } = require('../config/database');
const { DatabaseError } = require('../utils/errors');

class BaseRepository {
  constructor(tableName) {
    if (this.constructor === BaseRepository) {
      throw new Error('BaseRepository cannot be instantiated directly');
    }
    
    if (!tableName) {
      throw new Error('Table name is required for repository');
    }
    
    this.tableName = tableName;
  }

  /**
   * Execute a database query with error handling
   * @param {string} text - SQL query text
   * @param {Array} params - Query parameters
   * @returns {Promise<Object>} Query result
   */
  async executeQuery(text, params = []) {
    try {
      const result = await query(text, params);
      return result;
    } catch (error) {
      console.error(`[${this.constructor.name}] Database query error:`, error);
      throw new DatabaseError(`Database operation failed: ${error.message}`);
    }
  }

  /**
   * Find a single record by ID
   * @param {number|string} id - Record ID
   * @returns {Promise<Object|null>} Record or null if not found
   */
  async findById(id) {
    const text = `SELECT * FROM ${this.tableName} WHERE id = $1`;
    const result = await this.executeQuery(text, [id]);
    return result.rows[0] || null;
  }

  /**
   * Find all records with optional pagination
   * @param {Object} options - Query options
   * @param {number} options.limit - Number of records to return
   * @param {number} options.offset - Number of records to skip
   * @param {string} options.orderBy - Column to order by
   * @param {string} options.order - Order direction (ASC/DESC)
   * @returns {Promise<Array>} Array of records
   */
  async findAll(options = {}) {
    const { limit = 100, offset = 0, orderBy = 'id', order = 'ASC' } = options;
    
    const text = `
      SELECT * FROM ${this.tableName} 
      ORDER BY ${orderBy} ${order}
      LIMIT $1 OFFSET $2
    `;
    
    const result = await this.executeQuery(text, [limit, offset]);
    return result.rows;
  }

  /**
   * Count total records
   * @returns {Promise<number>} Total count
   */
  async count() {
    const text = `SELECT COUNT(*) FROM ${this.tableName}`;
    const result = await this.executeQuery(text);
    return parseInt(result.rows[0].count);
  }

  /**
   * Create a new record
   * @param {Object} data - Record data
   * @returns {Promise<Object>} Created record
   */
  async create(data) {
    const columns = Object.keys(data);
    const values = Object.values(data);
    const placeholders = columns.map((_, index) => `$${index + 1}`).join(', ');
    
    const text = `
      INSERT INTO ${this.tableName} (${columns.join(', ')}) 
      VALUES (${placeholders}) 
      RETURNING *
    `;
    
    const result = await this.executeQuery(text, values);
    return result.rows[0];
  }

  /**
   * Update a record by ID
   * @param {number|string} id - Record ID
   * @param {Object} data - Update data
   * @returns {Promise<Object|null>} Updated record or null if not found
   */
  async updateById(id, data) {
    const columns = Object.keys(data);
    const values = Object.values(data);
    const setClause = columns.map((col, index) => `${col} = $${index + 2}`).join(', ');
    
    const text = `
      UPDATE ${this.tableName} 
      SET ${setClause}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 
      RETURNING *
    `;
    
    const result = await this.executeQuery(text, [id, ...values]);
    return result.rows[0] || null;
  }

  /**
   * Delete a record by ID
   * @param {number|string} id - Record ID
   * @returns {Promise<boolean>} True if deleted, false if not found
   */
  async deleteById(id) {
    const text = `DELETE FROM ${this.tableName} WHERE id = $1 RETURNING id`;
    const result = await this.executeQuery(text, [id]);
    return result.rows.length > 0;
  }

  /**
   * Find records by a specific field
   * @param {string} field - Field name
   * @param {*} value - Field value
   * @returns {Promise<Array>} Array of matching records
   */
  async findByField(field, value) {
    const text = `SELECT * FROM ${this.tableName} WHERE ${field} = $1`;
    const result = await this.executeQuery(text, [value]);
    return result.rows;
  }

  /**
   * Find a single record by a specific field
   * @param {string} field - Field name
   * @param {*} value - Field value
   * @returns {Promise<Object|null>} Record or null if not found
   */
  async findOneByField(field, value) {
    const text = `SELECT * FROM ${this.tableName} WHERE ${field} = $1 LIMIT 1`;
    const result = await this.executeQuery(text, [value]);
    return result.rows[0] || null;
  }
}

module.exports = BaseRepository;
