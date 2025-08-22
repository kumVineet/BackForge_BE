/**
 * S3 Storage Service
 * Handles file operations with AWS S3
 */
const BaseService = require('../core/BaseService');
const IStorageService = require('../core/interfaces/IStorageService');
const AWS = require('aws-sdk');
const { config } = require('../config/app');
const { v4: uuidv4 } = require('uuid');

class S3StorageService extends BaseService {
  constructor() {
    super();
    
    // Initialize S3 client
    this.s3 = new AWS.S3({
      accessKeyId: config.aws.accessKeyId,
      secretAccessKey: config.aws.secretAccessKey,
      region: config.aws.region
    });
    
    this.bucketName = config.aws.bucketName;
    this.region = config.aws.region;
  }

  /**
   * Upload a file to S3
   * @param {Buffer|Stream} file - File data or stream
   * @param {Object} options - Upload options
   * @param {string} options.key - Storage key
   * @param {string} options.mimeType - File MIME type
   * @param {Object} options.metadata - Additional metadata
   * @returns {Promise<Object>} Upload result with URL and key
   */
  async upload(file, options) {
    try {
      this.validateRequiredParams(options, ['key']);
      
      const { key, mimeType, metadata = {} } = options;
      
      const uploadParams = {
        Bucket: this.bucketName,
        Key: key,
        Body: file,
        ContentType: mimeType || 'application/octet-stream',
        Metadata: metadata,
        ACL: 'private' // Private by default for security
      };
      
      const result = await this.s3.upload(uploadParams).promise();
      
      return {
        url: result.Location,
        key: result.Key,
        bucket: result.Bucket,
        etag: result.ETag,
        size: result.ContentLength
      };
    } catch (error) {
      this.handleError(error, 'upload');
    }
  }

  /**
   * Delete a file from S3
   * @param {string} key - Storage key
   * @returns {Promise<boolean>} True if deleted successfully
   */
  async delete(key) {
    try {
      this.validateRequiredParams({ key }, ['key']);
      
      const deleteParams = {
        Bucket: this.bucketName,
        Key: key
      };
      
      await this.s3.deleteObject(deleteParams).promise();
      return true;
    } catch (error) {
      this.handleError(error, 'delete');
    }
  }

  /**
   * Get a presigned URL for file upload
   * @param {string} key - Storage key
   * @param {Object} options - URL options
   * @param {string} options.mimeType - File MIME type
   * @param {number} options.expiresIn - URL expiration time in seconds
   * @returns {Promise<string>} Presigned upload URL
   */
  async getPresignedUploadUrl(key, options = {}) {
    try {
      this.validateRequiredParams({ key }, ['key']);
      
      const { mimeType, expiresIn = 3600 } = options;
      
      const uploadParams = {
        Bucket: this.bucketName,
        Key: key,
        ContentType: mimeType || 'application/octet-stream',
        Expires: expiresIn
      };
      
      const presignedUrl = await this.s3.getSignedUrlPromise('putObject', uploadParams);
      
      return presignedUrl;
    } catch (error) {
      this.handleError(error, 'getPresignedUploadUrl');
    }
  }

  /**
   * Get a presigned URL for file download
   * @param {string} key - Storage key
   * @param {Object} options - URL options
   * @param {number} options.expiresIn - URL expiration time in seconds
   * @returns {Promise<string>} Presigned download URL
   */
  async getPresignedDownloadUrl(key, options = {}) {
    try {
      this.validateRequiredParams({ key }, ['key']);
      
      const { expiresIn = 3600 } = options;
      
      const downloadParams = {
        Bucket: this.bucketName,
        Key: key,
        Expires: expiresIn
      };
      
      const presignedUrl = await this.s3.getSignedUrlPromise('getObject', downloadParams);
      
      return presignedUrl;
    } catch (error) {
      this.handleError(error, 'getPresignedDownloadUrl');
    }
  }

  /**
   * Get a public URL for a file (if public)
   * @param {string} key - Storage key
   * @returns {string} Public URL
   */
  getUrl(key) {
    return `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${key}`;
  }

  /**
   * Check if a file exists in S3
   * @param {string} key - Storage key
   * @returns {Promise<boolean>} True if file exists
   */
  async exists(key) {
    try {
      this.validateRequiredParams({ key }, ['key']);
      
      const headParams = {
        Bucket: this.bucketName,
        Key: key
      };
      
      await this.s3.headObject(headParams).promise();
      return true;
    } catch (error) {
      if (error.code === 'NotFound' || error.statusCode === 404) {
        return false;
      }
      throw error;
    }
  }

  /**
   * Get file metadata from S3
   * @param {string} key - Storage key
   * @returns {Promise<Object>} File metadata
   */
  async getMetadata(key) {
    try {
      this.validateRequiredParams({ key }, ['key']);
      
      const headParams = {
        Bucket: this.bucketName,
        Key: key
      };
      
      const result = await this.s3.headObject(headParams).promise();
      
      return {
        contentType: result.ContentType,
        contentLength: result.ContentLength,
        lastModified: result.LastModified,
        etag: result.ETag,
        metadata: result.Metadata
      };
    } catch (error) {
      this.handleError(error, 'getMetadata');
    }
  }

  /**
   * Copy a file within S3
   * @param {string} sourceKey - Source file key
   * @param {string} destinationKey - Destination file key
   * @returns {Promise<Object>} Copy result
   */
  async copyFile(sourceKey, destinationKey) {
    try {
      this.validateRequiredParams({ sourceKey, destinationKey }, ['sourceKey', 'destinationKey']);
      
      const copyParams = {
        Bucket: this.bucketName,
        CopySource: `${this.bucketName}/${sourceKey}`,
        Key: destinationKey
      };
      
      const result = await this.s3.copyObject(copyParams).promise();
      
      return {
        key: destinationKey,
        etag: result.ETag,
        copySource: sourceKey
      };
    } catch (error) {
      this.handleError(error, 'copyFile');
    }
  }

  /**
   * Move a file within S3 (copy + delete)
   * @param {string} sourceKey - Source file key
   * @param {string} destinationKey - Destination file key
   * @returns {Promise<Object>} Move result
   */
  async moveFile(sourceKey, destinationKey) {
    try {
      this.validateRequiredParams({ sourceKey, destinationKey }, ['sourceKey', 'destinationKey']);
      
      // Copy file to new location
      const copyResult = await this.copyFile(sourceKey, destinationKey);
      
      // Delete original file
      await this.delete(sourceKey);
      
      return {
        ...copyResult,
        moved: true
      };
    } catch (error) {
      this.handleError(error, 'moveFile');
    }
  }

  /**
   * Generate a unique S3 key for a file
   * @param {string} originalName - Original file name
   * @param {number} userId - User ID
   * @param {string} category - File category
   * @returns {string} Generated S3 key
   */
  generateS3Key(originalName, userId, category = 'general') {
    const extension = originalName.split('.').pop();
    const uuid = uuidv4();
    const timestamp = Date.now();
    
    return `users/${userId}/${category}/${timestamp}_${uuid}.${extension}`;
  }

  /**
   * List files in a directory
   * @param {string} prefix - Directory prefix
   * @param {Object} options - List options
   * @param {number} options.maxKeys - Maximum number of keys to return
   * @param {string} options.continuationToken - Continuation token for pagination
   * @returns {Promise<Object>} List result
   */
  async listFiles(prefix, options = {}) {
    try {
      this.validateRequiredParams({ prefix }, ['prefix']);
      
      const { maxKeys = 1000, continuationToken } = options;
      
      const listParams = {
        Bucket: this.bucketName,
        Prefix: prefix,
        MaxKeys: maxKeys
      };
      
      if (continuationToken) {
        listParams.ContinuationToken = continuationToken;
      }
      
      const result = await this.s3.listObjectsV2(listParams).promise();
      
      return {
        files: result.Contents || [],
        isTruncated: result.IsTruncated,
        nextContinuationToken: result.NextContinuationToken,
        keyCount: result.KeyCount
      };
    } catch (error) {
      this.handleError(error, 'listFiles');
    }
  }

  /**
   * Get bucket statistics
   * @returns {Promise<Object>} Bucket statistics
   */
  async getBucketStats() {
    try {
      const listParams = {
        Bucket: this.bucketName
      };
      
      let totalSize = 0;
      let fileCount = 0;
      let isTruncated = true;
      let continuationToken;
      
      while (isTruncated) {
        if (continuationToken) {
          listParams.ContinuationToken = continuationToken;
        }
        
        const result = await this.s3.listObjectsV2(listParams).promise();
        
        if (result.Contents) {
          result.Contents.forEach(obj => {
            totalSize += obj.Size || 0;
            fileCount++;
          });
        }
        
        isTruncated = result.IsTruncated;
        continuationToken = result.NextContinuationToken;
      }
      
      return {
        bucketName: this.bucketName,
        totalFiles: fileCount,
        totalSize,
        averageFileSize: fileCount > 0 ? totalSize / fileCount : 0
      };
    } catch (error) {
      this.handleError(error, 'getBucketStats');
    }
  }

  /**
   * Set file as public
   * @param {string} key - Storage key
   * @returns {Promise<boolean>} True if set successfully
   */
  async makePublic(key) {
    try {
      this.validateRequiredParams({ key }, ['key']);
      
      const aclParams = {
        Bucket: this.bucketName,
        Key: key,
        ACL: 'public-read'
      };
      
      await this.s3.putObjectAcl(aclParams).promise();
      return true;
    } catch (error) {
      this.handleError(error, 'makePublic');
    }
  }

  /**
   * Set file as private
   * @param {string} key - Storage key
   * @returns {Promise<boolean>} True if set successfully
   */
  async makePrivate(key) {
    try {
      this.validateRequiredParams({ key }, ['key']);
      
      const aclParams = {
        Bucket: this.bucketName,
        Key: key,
        ACL: 'private'
      };
      
      await this.s3.putObjectAcl(aclParams).promise();
      return true;
    } catch (error) {
      this.handleError(error, 'makePrivate');
    }
  }
}

module.exports = S3StorageService;
