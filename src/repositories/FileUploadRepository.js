/**
 * File Upload Repository
 * Handles all file upload-related database operations
 */
const BaseRepository = require('../core/BaseRepository');

class FileUploadRepository extends BaseRepository {
  constructor() {
    super('file_uploads');
  }

  /**
   * Find files by user ID
   * @param {number} userId - User ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of files
   */
  async findByUserId(userId, options = {}) {
    const { limit = 100, offset = 0, orderBy = 'created_at', order = 'DESC' } = options;
    
    const text = `
      SELECT * FROM ${this.tableName} 
      WHERE user_id = $1 
      ORDER BY ${orderBy} ${order}
      LIMIT $2 OFFSET $3
    `;
    
    const result = await this.executeQuery(text, [userId, limit, offset]);
    return result.rows;
  }

  /**
   * Find files by category
   * @param {string} category - File category
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of files
   */
  async findByCategory(category, options = {}) {
    const { limit = 100, offset = 0, orderBy = 'created_at', order = 'DESC' } = options;
    
    const text = `
      SELECT * FROM ${this.tableName} 
      WHERE category = $1 
      ORDER BY ${orderBy} ${order}
      LIMIT $2 OFFSET $3
    `;
    
    const result = await this.executeQuery(text, [category, limit, offset]);
    return result.rows;
  }

  /**
   * Find public files
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of public files
   */
  async findPublicFiles(options = {}) {
    const { limit = 100, offset = 0, orderBy = 'created_at', order = 'DESC' } = options;
    
    const text = `
      SELECT * FROM ${this.tableName} 
      WHERE is_public = true 
      ORDER BY ${orderBy} ${order}
      LIMIT $1 OFFSET $2
    `;
    
    const result = await this.executeQuery(text, [limit, offset]);
    return result.rows;
  }

  /**
   * Search files by title or description
   * @param {string} searchTerm - Search term
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of matching files
   */
  async searchFiles(searchTerm, options = {}) {
    const { limit = 100, offset = 0, userId = null, category = null } = options;
    
    let text = `
      SELECT * FROM ${this.tableName} 
      WHERE (title ILIKE $1 OR description ILIKE $1)
    `;
    
    const params = [`%${searchTerm}%`];
    let paramIndex = 2;
    
    if (userId) {
      text += ` AND user_id = $${paramIndex}`;
      params.push(userId);
      paramIndex++;
    }
    
    if (category) {
      text += ` AND category = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }
    
    text += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);
    
    const result = await this.executeQuery(text, params);
    return result.rows;
  }

  /**
   * Find files by storage type
   * @param {string} storageType - Storage type (s3, cloudinary, local)
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of files
   */
  async findByStorageType(storageType, options = {}) {
    const { limit = 100, offset = 0 } = options;
    
    const text = `
      SELECT * FROM ${this.tableName} 
      WHERE storage_type = $1 
      ORDER BY created_at DESC 
      LIMIT $2 OFFSET $3
    `;
    
    const result = await this.executeQuery(text, [storageType, limit, offset]);
    return result.rows;
  }

  /**
   * Find files by MIME type
   * @param {string} mimeType - MIME type
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of files
   */
  async findByMimeType(mimeType, options = {}) {
    const { limit = 100, offset = 0 } = options;
    
    const text = `
      SELECT * FROM ${this.tableName} 
      WHERE mime_type = $1 
      ORDER BY created_at DESC 
      LIMIT $2 OFFSET $3
    `;
    
    const result = await this.executeQuery(text, [mimeType, limit, offset]);
    return result.rows;
  }

  /**
   * Get file statistics by user
   * @param {number} userId - User ID
   * @returns {Promise<Object>} File statistics
   */
  async getFileStatsByUser(userId) {
    const text = `
      SELECT 
        COUNT(*) as total_files,
        COUNT(CASE WHEN category = 'image' THEN 1 END) as image_count,
        COUNT(CASE WHEN category = 'document' THEN 1 END) as document_count,
        COUNT(CASE WHEN category = 'video' THEN 1 END) as video_count,
        COUNT(CASE WHEN category = 'audio' THEN 1 END) as audio_count,
        SUM(file_size) as total_size,
        AVG(file_size) as avg_file_size
      FROM ${this.tableName} 
      WHERE user_id = $1
    `;
    
    const result = await this.executeQuery(text, [userId]);
    return result.rows[0];
  }

  /**
   * Get global file statistics
   * @returns {Promise<Object>} Global file statistics
   */
  async getGlobalFileStats() {
    const text = `
      SELECT 
        COUNT(*) as total_files,
        COUNT(DISTINCT user_id) as unique_users,
        COUNT(CASE WHEN is_public = true THEN 1 END) as public_files,
        SUM(file_size) as total_size,
        AVG(file_size) as avg_file_size,
        COUNT(CASE WHEN storage_type = 's3' THEN 1 END) as s3_files,
        COUNT(CASE WHEN storage_type = 'cloudinary' THEN 1 END) as cloudinary_files,
        COUNT(CASE WHEN storage_type = 'local' THEN 1 END) as local_files
      FROM ${this.tableName}
    `;
    
    const result = await this.executeQuery(text);
    return result.rows[0];
  }

  /**
   * Find files by tags
   * @param {Array} tags - Array of tags
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of files
   */
  async findByTags(tags, options = {}) {
    const { limit = 100, offset = 0, operator = 'OR' } = options;
    
    if (!Array.isArray(tags) || tags.length === 0) {
      return [];
    }
    
    const tagConditions = tags.map((_, index) => `tags @> $${index + 1}`).join(` ${operator} `);
    
    const text = `
      SELECT * FROM ${this.tableName} 
      WHERE ${tagConditions}
      ORDER BY created_at DESC 
      LIMIT $${tags.length + 1} OFFSET $${tags.length + 2}
    `;
    
    const params = [...tags, limit, offset];
    const result = await this.executeQuery(text, params);
    return result.rows;
  }

  /**
   * Update file metadata
   * @param {number} fileId - File ID
   * @param {Object} metadata - Metadata to update
   * @returns {Promise<Object|null>} Updated file
   */
  async updateMetadata(fileId, metadata) {
    const allowedFields = ['title', 'description', 'tags', 'category', 'is_public'];
    const filteredMetadata = {};
    
    for (const [key, value] of Object.entries(metadata)) {
      if (allowedFields.includes(key)) {
        filteredMetadata[key] = value;
      }
    }
    
    if (Object.keys(filteredMetadata).length === 0) {
      throw new Error('No valid metadata fields provided');
    }
    
    return this.updateById(fileId, filteredMetadata);
  }

  /**
   * Delete files by user ID
   * @param {number} userId - User ID
   * @returns {Promise<number>} Number of files deleted
   */
  async deleteByUserId(userId) {
    const text = `DELETE FROM ${this.tableName} WHERE user_id = $1 RETURNING id`;
    const result = await this.executeQuery(text, [userId]);
    return result.rows.length;
  }

  /**
   * Find duplicate files by hash
   * @param {string} fileHash - File hash
   * @param {number} userId - User ID
   * @returns {Promise<Array>} Array of duplicate files
   */
  async findDuplicatesByHash(fileHash, userId) {
    const text = `
      SELECT * FROM ${this.tableName} 
      WHERE file_hash = $1 AND user_id = $2 
      ORDER BY created_at ASC
    `;
    
    const result = await this.executeQuery(text, [fileHash, userId]);
    return result.rows;
  }
}

module.exports = FileUploadRepository;
