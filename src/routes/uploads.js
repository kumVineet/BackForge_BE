const express = require('express');
const { body, validationResult } = require('express-validator');
const { query } = require('../config/database');
const { 
  authenticateToken, 
  authorizeRoles 
} = require('../middleware/auth');
const { 
  uploadSingle, 
  uploadMultiple, 
  uploadToMemory,
  fileConfig 
} = require('../middleware/upload');
const { 
  uploadToCloud, 
  deleteFromCloud,
  generatePresignedUploadUrl,
  generatePresignedDownloadUrl
} = require('../utils/cloudStorage');
const { 
  ValidationError, 
  DatabaseError,
  NotFoundError 
} = require('../utils/errors');
const { config } = require('../config/app');

const router = express.Router();

// Validation middleware
const validateUploadMetadata = [
  body('title').optional().trim().isLength({ min: 1, max: 255 }).withMessage('Title must be between 1 and 255 characters'),
  body('description').optional().trim().isLength({ max: 1000 }).withMessage('Description must be less than 1000 characters'),
  body('tags').optional().isArray().withMessage('Tags must be an array'),
  body('category').optional().isIn(['image', 'document', 'video', 'audio']).withMessage('Invalid category'),
  body('isPublic').optional().isBoolean().withMessage('isPublic must be a boolean')
];

// Validation for presigned URL generation
const validatePresignedUrlRequest = [
  body('fileName').trim().isLength({ min: 1, max: 255 }).withMessage('File name is required and must be between 1 and 255 characters'),
  body('fileType').optional().trim().isLength({ min: 1, max: 100 }).withMessage('File type must be between 1 and 100 characters'),
  body('expiresIn').optional().isInt({ min: 300, max: 3600 }).withMessage('Expires in must be between 300 and 3600 seconds')
];

// Generate presigned upload URL for S3
router.post('/presigned-upload-url',
  authenticateToken,
  validatePresignedUrlRequest,
  async (req, res, next) => {
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new ValidationError('Validation failed', errors.array());
      }

      const { fileName, fileType, expiresIn = 3600 } = req.body;
      const userId = req.user.id;

      // Generate presigned upload URL
      const presignedData = await generatePresignedUploadUrl(userId, fileName, fileType, expiresIn);

      res.json({
        message: 'Presigned upload URL generated successfully',
        presignedUrl: presignedData.presignedUrl,
        s3Key: presignedData.s3Key,
        expiresIn: presignedData.expiresIn,
        bucket: presignedData.bucket
      });
    } catch (error) {
      next(error);
    }
  }
);

// Store file metadata after successful S3 upload
router.post('/store-metadata',
  authenticateToken,
  [
    body('s3Key').trim().isLength({ min: 1 }).withMessage('S3 key is required'),
    body('originalName').trim().isLength({ min: 1, max: 255 }).withMessage('Original name is required'),
    body('fileSize').isInt({ min: 1 }).withMessage('File size must be a positive integer'),
    body('mimeType').trim().isLength({ min: 1, max: 100 }).withMessage('MIME type is required'),
    body('category').optional().isIn(['image', 'document', 'video', 'audio']).withMessage('Invalid category'),
    body('title').optional().trim().isLength({ min: 1, max: 255 }).withMessage('Title must be between 1 and 255 characters'),
    body('description').optional().trim().isLength({ max: 1000 }).withMessage('Description must be less than 1000 characters'),
    body('tags').optional().isArray().withMessage('Tags must be an array'),
    body('isPublic').optional().isBoolean().withMessage('isPublic must be a boolean')
  ],
  async (req, res, next) => {
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new ValidationError('Validation failed', errors.array());
      }

      const { 
        s3Key, 
        originalName, 
        fileSize, 
        mimeType, 
        category = 'image',
        title, 
        description, 
        tags, 
        isPublic = false 
      } = req.body;
      const userId = req.user.id;

      // Store file metadata in database
      const result = await query(
        `INSERT INTO file_uploads (
          user_id, original_name, filename, file_path, file_size, 
          mime_type, category, title, description, tags, 
          is_public, storage_type, cloud_key, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())
        RETURNING *`,
        [
          userId, 
          originalName, 
          originalName, // filename same as original for S3
          null, // file_path is null for S3
          fileSize,
          mimeType, 
          category, 
          title, 
          description, 
          tags ? JSON.stringify(tags) : null, 
          isPublic, 
          's3',
          s3Key
        ]
      );

      const uploadRecord = result.rows[0];

      res.status(201).json({
        message: 'File metadata stored successfully',
        file: {
          id: uploadRecord.id,
          originalName: uploadRecord.original_name,
          s3Key: uploadRecord.cloud_key,
          size: uploadRecord.file_size,
          mimeType: uploadRecord.mime_type,
          category: uploadRecord.category,
          title: uploadRecord.title,
          description: uploadRecord.description,
          tags: uploadRecord.tags ? JSON.parse(uploadRecord.tags) : [],
          isPublic: uploadRecord.is_public,
          storageType: uploadRecord.storage_type,
          createdAt: uploadRecord.created_at
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get presigned download URL for a file
router.get('/presigned-download/:id',
  authenticateToken,
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      // Get file record (only user's own files)
      const result = await query(
        `SELECT * FROM file_uploads 
         WHERE id = $1 AND user_id = $2 AND storage_type = 's3'`,
        [id, userId]
      );

      if (result.rows.length === 0) {
        throw new NotFoundError('File not found or access denied');
      }

      const file = result.rows[0];

      // Generate presigned download URL
      const presignedData = await generatePresignedDownloadUrl(file.cloud_key);

      res.json({
        message: 'Presigned download URL generated successfully',
        presignedUrl: presignedData.presignedUrl,
        expiresIn: presignedData.expiresIn,
        file: {
          id: file.id,
          originalName: file.original_name,
          size: file.file_size,
          mimeType: file.mime_type,
          category: file.category,
          title: file.title,
          description: file.description,
          tags: file.tags ? JSON.parse(file.tags) : [],
          isPublic: file.is_public,
          storageType: file.storage_type,
          createdAt: file.created_at
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// Upload single file (local storage)
router.post('/local/single', 
  authenticateToken,
  uploadSingle('file', 'image'),
  validateUploadMetadata,
  async (req, res, next) => {
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new ValidationError('Validation failed', errors.array());
      }

      const { title, description, tags, category, isPublic = false } = req.body;
      const file = req.uploadedFile;
      const userId = req.user.id;

      // Store file metadata in database
      const result = await query(
        `INSERT INTO file_uploads (
          user_id, original_name, filename, file_path, file_size, 
          mime_type, category, title, description, tags, 
          is_public, storage_type, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
        RETURNING *`,
        [
          userId, file.originalname, file.filename, file.path, file.size,
          file.mimetype, category || file.category, title, description, 
          tags ? JSON.stringify(tags) : null, isPublic, 'local'
        ]
      );

      const uploadRecord = result.rows[0];

      res.status(201).json({
        message: 'File uploaded successfully',
        file: {
          id: uploadRecord.id,
          originalName: uploadRecord.original_name,
          filename: uploadRecord.filename,
          size: uploadRecord.file_size,
          mimeType: uploadRecord.mime_type,
          category: uploadRecord.category,
          title: uploadRecord.title,
          description: uploadRecord.description,
          tags: uploadRecord.tags ? JSON.parse(uploadRecord.tags) : [],
          isPublic: uploadRecord.is_public,
          storageType: uploadRecord.storage_type,
          createdAt: uploadRecord.created_at,
          url: `${config.apiPrefix}/uploads/file/${uploadRecord.id}`
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// Upload multiple files (local storage)
router.post('/local/multiple',
  authenticateToken,
  uploadMultiple('files', 'image'),
  validateUploadMetadata,
  async (req, res, next) => {
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new ValidationError('Validation failed', errors.array());
      }

      const { title, description, tags, category, isPublic = false } = req.body;
      const files = req.uploadedFiles;
      const userId = req.user.id;

      const uploadPromises = files.map(async (file) => {
        const result = await query(
          `INSERT INTO file_uploads (
            user_id, original_name, filename, file_path, file_size, 
            mime_type, category, title, description, tags, 
            is_public, storage_type, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
          RETURNING *`,
          [
            userId, file.originalname, file.filename, file.path, file.size,
            file.mimetype, category || file.category, title, description, 
            tags ? JSON.stringify(tags) : null, isPublic, 'local'
          ]
        );

        const uploadRecord = result.rows[0];
        return {
          id: uploadRecord.id,
          originalName: uploadRecord.original_name,
          filename: uploadRecord.filename,
          size: uploadRecord.file_size,
          mimeType: uploadRecord.mime_type,
          category: uploadRecord.category,
          title: uploadRecord.title,
          description: uploadRecord.description,
          tags: uploadRecord.tags ? JSON.parse(uploadRecord.tags) : [],
          isPublic: uploadRecord.is_public,
          storageType: uploadRecord.storage_type,
          createdAt: uploadRecord.created_at,
          url: `${config.apiPrefix}/uploads/file/${uploadRecord.id}`
        };
      });

      const uploadedFiles = await Promise.all(uploadPromises);

      res.status(201).json({
        message: `${files.length} files uploaded successfully`,
        files: uploadedFiles
      });
    } catch (error) {
      next(error);
    }
  }
);

// Upload to cloud storage (S3/Cloudinary)
router.post('/cloud/single',
  authenticateToken,
  uploadToMemory('file', 'image'),
  validateUploadMetadata,
  async (req, res, next) => {
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new ValidationError('Validation failed', errors.array());
      }

      const { title, description, tags, category, isPublic = false, folder = 'uploads' } = req.body;
      const file = req.uploadedFile;
      const userId = req.user.id;

      // Upload to cloud storage
      const cloudResult = await uploadToCloud(file, folder);

      // Store file metadata in database
      const result = await query(
        `INSERT INTO file_uploads (
          user_id, original_name, filename, file_path, file_size, 
          mime_type, category, title, description, tags, 
          is_public, storage_type, cloud_url, cloud_key, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW())
        RETURNING *`,
        [
          userId, file.originalname, file.originalname, null, file.size,
          file.mimetype, category || file.category, title, description, 
          tags ? JSON.stringify(tags) : null, isPublic, config.storageType,
          cloudResult.url, cloudResult.key || cloudResult.publicId
        ]
      );

      const uploadRecord = result.rows[0];

      res.status(201).json({
        message: 'File uploaded to cloud storage successfully',
        file: {
          id: uploadRecord.id,
          originalName: uploadRecord.original_name,
          size: uploadRecord.file_size,
          mimeType: uploadRecord.mime_type,
          category: uploadRecord.category,
          title: uploadRecord.title,
          description: uploadRecord.description,
          tags: uploadRecord.tags ? JSON.parse(uploadRecord.tags) : [],
          isPublic: uploadRecord.is_public,
          storageType: uploadRecord.storage_type,
          cloudUrl: uploadRecord.cloud_url,
          createdAt: uploadRecord.created_at
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get file by ID
router.get('/file/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    // Build query based on authentication
    let queryText, queryParams;
    
    if (userId) {
      // Authenticated user - can see their own files and public files
      queryText = `
        SELECT * FROM file_uploads 
        WHERE id = $1 AND (user_id = $2 OR is_public = true)
      `;
      queryParams = [id, userId];
    } else {
      // Anonymous user - can only see public files
      queryText = `
        SELECT * FROM file_uploads 
        WHERE id = $1 AND is_public = true
      `;
      queryParams = [id];
    }

    const result = await query(queryText, queryParams);

    if (result.rows.length === 0) {
      throw new NotFoundError('File not found');
    }

    const file = result.rows[0];

    // Generate presigned URL for S3 files if user owns the file
    let downloadUrl = null;
    if (file.storage_type === 's3' && userId === file.user_id) {
      try {
        const presignedData = await generatePresignedDownloadUrl(file.cloud_key);
        downloadUrl = presignedData.presignedUrl;
      } catch (error) {
        console.error('Failed to generate presigned URL:', error);
        // Continue without download URL
      }
    }

    res.json({
      file: {
        id: file.id,
        originalName: file.original_name,
        filename: file.filename,
        size: file.file_size,
        mimeType: file.mime_type,
        category: file.category,
        title: file.title,
        description: file.description,
        tags: file.tags ? JSON.parse(file.tags) : [],
        isPublic: file.is_public,
        storageType: file.storage_type,
        cloudUrl: file.cloud_url,
        s3Key: file.cloud_key,
        downloadUrl: downloadUrl,
        createdAt: file.created_at,
        updatedAt: file.updated_at
      }
    });
  } catch (error) {
    next(error);
  }
});

// Serve local file
router.get('/serve/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    // Get file record
    let queryText, queryParams;
    
    if (userId) {
      queryText = `
        SELECT * FROM file_uploads 
        WHERE id = $1 AND storage_type = 'local' AND (user_id = $2 OR is_public = true)
      `;
      queryParams = [id, userId];
    } else {
      queryText = `
        SELECT * FROM file_uploads 
        WHERE id = $1 AND storage_type = 'local' AND is_public = true
      `;
      queryParams = [id];
    }

    const result = await query(queryText, queryParams);

    if (result.rows.length === 0) {
      throw new NotFoundError('File not found');
    }

    const file = result.rows[0];

    // Check if file exists on disk
    const fs = require('fs-extra');
    if (!await fs.pathExists(file.file_path)) {
      throw new NotFoundError('File not found on disk');
    }

    // Set appropriate headers
    res.setHeader('Content-Type', file.mime_type);
    res.setHeader('Content-Disposition', `inline; filename="${file.original_name}"`);
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1 year cache

    // Stream the file
    const fileStream = require('fs').createReadStream(file.file_path);
    fileStream.pipe(res);
  } catch (error) {
    next(error);
  }
});

// Get user's files
router.get('/my-files', authenticateToken, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20, category, search } = req.query;
    
    const offset = (page - 1) * limit;
    
    // Build query with filters
    let queryText = `
      SELECT * FROM file_uploads 
      WHERE user_id = $1
    `;
    let queryParams = [userId];
    let paramCount = 1;

    if (category) {
      paramCount++;
      queryText += ` AND category = $${paramCount}`;
      queryParams.push(category);
    }

    if (search) {
      paramCount++;
      queryText += ` AND (title ILIKE $${paramCount} OR description ILIKE $${paramCount} OR original_name ILIKE $${paramCount})`;
      queryParams.push(`%${search}%`);
    }

    queryText += ` ORDER BY created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    queryParams.push(limit, offset);

    const result = await query(queryText, queryParams);

    // Get total count for pagination
    let countQuery = `SELECT COUNT(*) FROM file_uploads WHERE user_id = $1`;
    let countParams = [userId];

    if (category) {
      countQuery += ` AND category = $2`;
      countParams.push(category);
    }

    if (search) {
      const searchParamIndex = countParams.length + 1;
      countQuery += ` AND (title ILIKE $${searchParamIndex} OR description ILIKE $${searchParamIndex} OR original_name ILIKE $${searchParamIndex})`;
      countParams.push(`%${search}%`);
    }

    const countResult = await query(countQuery, countParams);
    const totalFiles = parseInt(countResult.rows[0].count);

    // Process files and generate presigned URLs for S3 files
    const processedFiles = await Promise.all(result.rows.map(async (file) => {
      let downloadUrl = null;
      
      if (file.storage_type === 's3') {
        try {
          const presignedData = await generatePresignedDownloadUrl(file.cloud_key);
          downloadUrl = presignedData.presignedUrl;
        } catch (error) {
          console.error('Failed to generate presigned URL for file:', file.id, error);
          // Continue without download URL
        }
      }

      return {
        id: file.id,
        originalName: file.original_name,
        filename: file.filename,
        size: file.file_size,
        mimeType: file.mime_type,
        category: file.category,
        title: file.title,
        description: file.description,
        tags: file.tags ? JSON.parse(file.tags) : [],
        isPublic: file.is_public,
        storageType: file.storage_type,
        cloudUrl: file.cloud_url,
        s3Key: file.cloud_key,
        downloadUrl: downloadUrl,
        createdAt: file.created_at,
        updatedAt: file.updated_at,
        url: file.storage_type === 'local' 
          ? `${config.apiPrefix}/uploads/serve/${file.id}`
          : downloadUrl || file.cloud_url
      };
    }));

    res.json({
      files: processedFiles,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalFiles,
        pages: Math.ceil(totalFiles / limit)
      }
    });
  } catch (error) {
    next(error);
  }
});

// Update file metadata
router.put('/file/:id', authenticateToken, validateUploadMetadata, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, description, tags, isPublic } = req.body;
    const userId = req.user.id;

    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', errors.array());
    }

    // Update file metadata
    const result = await query(
      `UPDATE file_uploads 
       SET title = COALESCE($1, title),
           description = COALESCE($2, description),
           tags = COALESCE($3, tags),
           is_public = COALESCE($4, is_public),
           updated_at = NOW()
       WHERE id = $5 AND user_id = $6
       RETURNING *`,
      [
        title, 
        description, 
        tags ? JSON.stringify(tags) : null, 
        isPublic, 
        id, 
        userId
      ]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('File not found or access denied');
    }

    const file = result.rows[0];

    res.json({
      message: 'File metadata updated successfully',
      file: {
        id: file.id,
        originalName: file.original_name,
        filename: file.filename,
        size: file.file_size,
        mimeType: file.mime_type,
        category: file.category,
        title: file.title,
        description: file.description,
        tags: file.tags ? JSON.parse(file.tags) : [],
        isPublic: file.is_public,
        storageType: file.storage_type,
        cloudUrl: file.cloud_url,
        createdAt: file.created_at,
        updatedAt: file.updated_at
      }
    });
  } catch (error) {
    next(error);
  }
});

// Delete file
router.delete('/file/:id', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Get file record
    const result = await query(
      'SELECT * FROM file_uploads WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('File not found or access denied');
    }

    const file = result.rows[0];

    // Delete from S3 if applicable
    if (file.storage_type === 's3' && file.cloud_key) {
      try {
        await deleteFromCloud(file.cloud_key);
      } catch (error) {
        console.error('Failed to delete from S3:', error);
        // Continue with database deletion even if S3 deletion fails
      }
    }

    // Delete from other cloud storage if applicable
    if (file.storage_type !== 'local' && file.storage_type !== 's3' && file.cloud_url) {
      await deleteFromCloud(file.cloud_url);
    }

    // Delete local file if exists
    if (file.storage_type === 'local' && file.file_path) {
      const fs = require('fs-extra');
      await fs.remove(file.file_path);
    }

    // Delete database record
    await query(
      'DELETE FROM file_uploads WHERE id = $1',
      [id]
    );

    res.json({
      message: 'File deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

// Get upload statistics
router.get('/stats', authenticateToken, async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Get file count by category
    const categoryStats = await query(
      `SELECT category, COUNT(*) as count, SUM(file_size) as total_size
       FROM file_uploads 
       WHERE user_id = $1 
       GROUP BY category`,
      [userId]
    );

    // Get storage type distribution
    const storageStats = await query(
      `SELECT storage_type, COUNT(*) as count
       FROM file_uploads 
       WHERE user_id = $1 
       GROUP BY storage_type`,
      [userId]
    );

    // Get total file count and size
    const totalStats = await query(
      `SELECT COUNT(*) as total_files, SUM(file_size) as total_size
       FROM file_uploads 
       WHERE user_id = $1`,
      [userId]
    );

    res.json({
      stats: {
        totalFiles: parseInt(totalStats.rows[0].total_files) || 0,
        totalSize: parseInt(totalStats.rows[0].total_size) || 0,
        byCategory: categoryStats.rows,
        byStorage: storageStats.rows
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router; 