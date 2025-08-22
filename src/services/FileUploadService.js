/**
 * File Upload Service
 * Handles file upload operations and metadata management
 */
const BaseService = require('../core/BaseService');
const FileUploadRepository = require('../repositories/FileUploadRepository');
const S3StorageService = require('./S3StorageService');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');

class FileUploadService extends BaseService {
  constructor(fileUploadRepository, s3StorageService) {
    super();
    
    if (!fileUploadRepository || !s3StorageService) {
      throw new Error('FileUploadRepository and S3StorageService are required');
    }
    
    this.fileUploadRepository = fileUploadRepository;
    this.s3StorageService = s3StorageService;
  }

  /**
   * Generate presigned upload URL for S3
   * @param {Object} options - Upload options
   * @param {string} options.originalName - Original file name
   * @param {string} options.mimeType - File MIME type
   * @param {number} options.userId - User ID
   * @param {string} options.category - File category
   * @returns {Promise<Object>} Presigned URL and metadata
   */
  async generatePresignedUploadUrl(options) {
    try {
      this.validateRequiredParams(options, ['originalName', 'mimeType', 'userId']);
      
      const { originalName, mimeType, userId, category = 'general' } = options;
      
      // Generate unique S3 key
      const s3Key = this.s3StorageService.generateS3Key(originalName, userId, category);
      
      // Generate presigned upload URL
      const presignedUrl = await this.s3StorageService.getPresignedUploadUrl(s3Key, {
        mimeType,
        expiresIn: 3600 // 1 hour
      });
      
      return {
        presignedUrl,
        s3Key,
        expiresIn: 3600,
        fields: {
          key: s3Key,
          'Content-Type': mimeType
        }
      };
    } catch (error) {
      this.handleError(error, 'generatePresignedUploadUrl');
    }
  }

  /**
   * Store file metadata after successful S3 upload
   * @param {Object} metadata - File metadata
   * @param {string} metadata.s3Key - S3 key
   * @param {string} metadata.originalName - Original file name
   * @param {number} metadata.fileSize - File size in bytes
   * @param {string} metadata.mimeType - File MIME type
   * @param {string} metadata.category - File category
   * @param {string} metadata.title - File title
   * @param {string} metadata.description - File description
   * @param {Array} metadata.tags - File tags
   * @param {boolean} metadata.isPublic - Whether file is public
   * @param {number} metadata.userId - User ID
   * @returns {Promise<Object>} Stored file record
   */
  async storeFileMetadata(metadata) {
    try {
      this.validateRequiredParams(metadata, [
        's3Key', 'originalName', 'fileSize', 'mimeType', 'category', 'userId'
      ]);
      
      // Sanitize input
      const sanitizedMetadata = this.sanitizeInput(metadata);
      
      // Determine file category if not provided
      if (!sanitizedMetadata.category) {
        sanitizedMetadata.category = this.determineFileCategory(sanitizedMetadata.mimeType);
      }
      
      // Generate file hash for duplicate detection
      const fileHash = this.generateFileHash(sanitizedMetadata);
      
      // Check for duplicates
      const duplicates = await this.fileUploadRepository.findDuplicatesByHash(
        fileHash, 
        sanitizedMetadata.userId
      );
      
      if (duplicates.length > 0) {
        throw new Error('Duplicate file detected');
      }
      
      // Prepare file data for database
      const fileData = {
        user_id: sanitizedMetadata.userId,
        original_name: sanitizedMetadata.originalName,
        file_size: sanitizedMetadata.fileSize,
        mime_type: sanitizedMetadata.mimeType,
        category: sanitizedMetadata.category,
        title: sanitizedMetadata.title || sanitizedMetadata.originalName,
        description: sanitizedMetadata.description || '',
        tags: sanitizedMetadata.tags || [],
        is_public: sanitizedMetadata.isPublic || false,
        storage_type: 's3',
        cloud_key: sanitizedMetadata.s3Key,
        file_hash: fileHash
      };
      
      // Store in database
      const fileRecord = await this.fileUploadRepository.create(fileData);
      
      return fileRecord;
    } catch (error) {
      this.handleError(error, 'storeFileMetadata');
    }
  }

  /**
   * Upload file directly to S3
   * @param {Buffer|Stream} file - File data
   * @param {Object} options - Upload options
   * @param {string} options.originalName - Original file name
   * @param {string} options.mimeType - File MIME type
   * @param {number} options.userId - User ID
   * @param {string} options.category - File category
   * @param {Object} options.metadata - Additional metadata
   * @returns {Promise<Object>} Upload result
   */
  async uploadFileDirectly(file, options) {
    try {
      this.validateRequiredParams(options, ['originalName', 'mimeType', 'userId']);
      
      const { originalName, mimeType, userId, category = 'general', metadata = {} } = options;
      
      // Generate unique S3 key
      const s3Key = this.s3StorageService.generateS3Key(originalName, userId, category);
      
      // Upload to S3
      const uploadResult = await this.s3StorageService.upload(file, {
        key: s3Key,
        mimeType,
        metadata
      });
      
      return {
        ...uploadResult,
        originalName,
        mimeType,
        userId,
        category
      };
    } catch (error) {
      this.handleError(error, 'uploadFileDirectly');
    }
  }

  /**
   * Get file by ID for a specific user
   * @param {number} fileId - File ID
   * @param {number} userId - User ID
   * @returns {Promise<Object|null>} File record or null if not found
   */
  async getFileById(fileId, userId) {
    try {
      this.validateRequiredParams({ fileId, userId }, ['fileId', 'userId']);
      
      const file = await this.fileUploadRepository.findById(fileId);
      
      if (!file) {
        return null;
      }
      
      // Check if user has access to this file
      if (file.user_id !== userId && !file.is_public) {
        throw new Error('Access denied');
      }
      
      return file;
    } catch (error) {
      console.error(`[FileUploadService] Error in getFileById:`, error);
      throw error; // Re-throw the original error instead of using handleError
    }
  }

  /**
   * Get file download URL
   * @param {number} fileId - File ID
   * @param {number} userId - User ID
   * @returns {Promise<Object>} Download URL and file info
   */
  async getFileDownloadUrl(fileId, userId) {
    try {
      this.validateRequiredParams({ fileId, userId }, ['fileId', 'userId']);
      
      const file = await this.getFileById(fileId, userId);
      
      if (!file) {
        throw new Error('File not found');
      }
      
      // Generate presigned download URL
      const downloadUrl = await this.s3StorageService.getPresignedDownloadUrl(file.cloud_key, {
        expiresIn: 3600 // 1 hour
      });
      
      return {
        downloadUrl,
        file: {
          id: file.id,
          originalName: file.original_name,
          fileSize: file.file_size,
          mimeType: file.mime_type,
          category: file.category,
          title: file.title,
          description: file.description,
          tags: file.tags || [],
          isPublic: file.is_public,
          createdAt: file.created_at,
          updatedAt: file.updated_at
        }
      };
    } catch (error) {
      console.error(`[FileUploadService] Error in getFileDownloadUrl:`, error);
      throw error; // Re-throw the original error instead of using handleError
    }
  }

  /**
   * Delete file
   * @param {number} fileId - File ID
   * @param {number} userId - User ID (for authorization)
   * @returns {Promise<boolean>} True if deleted successfully
   */
  async deleteFile(fileId, userId) {
    try {
      this.validateRequiredParams({ fileId, userId }, ['fileId', 'userId']);
      
      // Get file record
      const file = await this.fileUploadRepository.findById(fileId);
      
      if (!file) {
        throw new Error('File not found');
      }
      
      // Check authorization
      if (file.user_id !== userId) {
        throw new Error('Access denied');
      }
      
      // Delete from S3
      await this.s3StorageService.delete(file.cloud_key);
      
      // Delete from database
      await this.fileUploadRepository.deleteById(fileId);
      
      return true;
    } catch (error) {
      this.handleError(error, 'deleteFile');
    }
  }

  /**
   * Update file metadata
   * @param {number} fileId - File ID
   * @param {number} userId - User ID (for authorization)
   * @param {Object} metadata - Metadata to update
   * @returns {Promise<Object>} Updated file record
   */
  async updateFileMetadata(fileId, userId, metadata) {
    try {
      this.validateRequiredParams({ fileId, userId, metadata }, ['fileId', 'userId', 'metadata']);
      
      // Get file record
      const file = await this.fileUploadRepository.findById(fileId);
      
      if (!file) {
        throw new Error('File not found');
      }
      
      // Check authorization
      if (file.user_id !== userId) {
        throw new Error('Access denied');
      }
      
      // Update metadata
      const updatedFile = await this.fileUploadRepository.updateMetadata(fileId, metadata);
      
      return updatedFile;
    } catch (error) {
      this.handleError(error, 'updateFileMetadata');
    }
  }

  /**
   * Get user files
   * @param {number} userId - User ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of files
   */
  async getUserFiles(userId, options = {}) {
    try {
      this.validateRequiredParams({ userId }, ['userId']);
      
      return await this.fileUploadRepository.findByUserId(userId, options);
    } catch (error) {
      this.handleError(error, 'getUserFiles');
    }
  }

  /**
   * Search files
   * @param {string} searchTerm - Search term
   * @param {Object} options - Search options
   * @returns {Promise<Array>} Array of matching files
   */
  async searchFiles(searchTerm, options = {}) {
    try {
      this.validateRequiredParams({ searchTerm }, ['searchTerm']);
      
      return await this.fileUploadRepository.searchFiles(searchTerm, options);
    } catch (error) {
      this.handleError(error, 'searchFiles');
    }
  }

  /**
   * Get file statistics for user
   * @param {number} userId - User ID
   * @returns {Promise<Object>} File statistics
   */
  async getUserFileStats(userId) {
    try {
      this.validateRequiredParams({ userId }, ['userId']);
      
      return await this.fileUploadRepository.getFileStatsByUser(userId);
    } catch (error) {
      this.handleError(error, 'getUserFileStats');
    }
  }

  /**
   * Get global file statistics
   * @returns {Promise<Object>} Global file statistics
   */
  async getGlobalFileStats() {
    try {
      return await this.fileUploadRepository.getGlobalFileStats();
    } catch (error) {
      this.handleError(error, 'getGlobalFileStats');
    }
  }

  /**
   * Determine file category based on MIME type
   * @param {string} mimeType - File MIME type
   * @returns {string} File category
   */
  determineFileCategory(mimeType) {
    if (!mimeType) return 'general';
    
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';
    if (mimeType.startsWith('text/')) return 'document';
    if (mimeType.includes('pdf')) return 'document';
    if (mimeType.includes('word') || mimeType.includes('document')) return 'document';
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return 'document';
    if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return 'document';
    
    return 'general';
  }

  /**
   * Generate file hash for duplicate detection
   * @param {Object} metadata - File metadata
   * @returns {string} File hash
   */
  generateFileHash(metadata) {
    const { originalName, fileSize, mimeType, userId } = metadata;
    const hashInput = `${originalName}_${fileSize}_${mimeType}_${userId}`;
    
    // Simple hash function (in production, use crypto.createHash)
    let hash = 0;
    for (let i = 0; i < hashInput.length; i++) {
      const char = hashInput.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return Math.abs(hash).toString(36);
  }

  /**
   * Validate file type
   * @param {string} mimeType - File MIME type
   * @returns {boolean} True if file type is allowed
   */
  isAllowedFileType(mimeType) {
    const allowedTypes = [
      // Images
      'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
      // Documents
      'application/pdf', 'text/plain', 'text/html', 'text/css', 'text/javascript',
      'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      // Videos
      'video/mp4', 'video/webm', 'video/ogg', 'video/avi', 'video/mov',
      // Audio
      'audio/mpeg', 'audio/ogg', 'audio/wav', 'audio/mp4', 'audio/webm'
    ];
    
    return allowedTypes.includes(mimeType);
  }

  /**
   * Validate file size
   * @param {number} fileSize - File size in bytes
   * @param {number} maxSize - Maximum allowed size in bytes
   * @returns {boolean} True if file size is within limit
   */
  isFileSizeValid(fileSize, maxSize = 100 * 1024 * 1024) { // Default 100MB
    return fileSize > 0 && fileSize <= maxSize;
  }
}

module.exports = FileUploadService;
