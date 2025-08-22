/**
 * Storage Service Interface
 * Defines the contract for all storage services
 */
class IStorageService {
  constructor() {
    if (this.constructor === IStorageService) {
      throw new Error('IStorageService cannot be instantiated directly');
    }
  }

  /**
   * Upload a file to storage
   * @param {Buffer|Stream} file - File data or stream
   * @param {Object} options - Upload options
   * @param {string} options.key - Storage key
   * @param {string} options.mimeType - File MIME type
   * @param {Object} options.metadata - Additional metadata
   * @returns {Promise<Object>} Upload result with URL and key
   */
  async upload(file, options) {
    throw new Error('upload method must be implemented');
  }

  /**
   * Delete a file from storage
   * @param {string} key - Storage key
   * @returns {Promise<boolean>} True if deleted successfully
   */
  async delete(key) {
    throw new Error('delete method must be implemented');
  }

  /**
   * Get a file URL from storage
   * @param {string} key - Storage key
   * @param {Object} options - URL options
   * @param {number} options.expiresIn - URL expiration time in seconds
   * @returns {Promise<string>} File URL
   */
  async getUrl(key, options = {}) {
    throw new Error('getUrl method must be implemented');
  }

  /**
   * Check if a file exists in storage
   * @param {string} key - Storage key
   * @returns {Promise<boolean>} True if file exists
   */
  async exists(key) {
    throw new Error('exists method must be implemented');
  }

  /**
   * Get file metadata from storage
   * @param {string} key - Storage key
   * @returns {Promise<Object>} File metadata
   */
  async getMetadata(key) {
    throw new Error('getMetadata method must be implemented');
  }
}

module.exports = IStorageService;
