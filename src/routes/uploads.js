/**
 * File Upload Routes
 * Handles file upload operations using OOP service layer
 */
const express = require('express');
const { body } = require('express-validator');
const container = require('../config/container');
const { formatErrorResponse } = require('../utils/errors');
const { authenticateToken } = require('../middleware/auth');
const { localStorage, memory } = require('../middleware/upload');

const router = express.Router();

// Get services from container
const fileUploadService = container.get('fileUploadService');
const s3StorageService = container.get('s3StorageService');

// Validation middleware
const validatePresignedUpload = [
  body('originalName')
    .trim()
    .notEmpty()
    .withMessage('Original file name is required'),
  body('mimeType')
    .trim()
    .notEmpty()
    .withMessage('MIME type is required'),
  body('category')
    .optional()
    .isIn(['image', 'video', 'audio', 'document', 'general'])
    .withMessage('Invalid category')
];

const validateStoreMetadata = [
  body('s3Key')
    .trim()
    .notEmpty()
    .withMessage('S3 key is required'),
  body('originalName')
    .trim()
    .notEmpty()
    .withMessage('Original file name is required'),
  body('fileSize')
    .isInt({ min: 1 })
    .withMessage('File size must be a positive integer'),
  body('mimeType')
    .trim()
    .notEmpty()
    .withMessage('MIME type is required'),
  body('category')
    .optional()
    .isIn(['image', 'video', 'audio', 'document', 'general'])
    .withMessage('Invalid category'),
  body('title')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Title must be less than 255 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description must be less than 1000 characters'),
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),
  body('isPublic')
    .optional()
    .isBoolean()
    .withMessage('isPublic must be a boolean')
];

const validateUpdateMetadata = [
  body('title')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Title must be less than 255 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description must be less than 1000 characters'),
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),
  body('category')
    .optional()
    .isIn(['image', 'video', 'audio', 'document', 'general'])
    .withMessage('Invalid category'),
  body('isPublic')
    .optional()
    .isBoolean()
    .withMessage('isPublic must be a boolean')
];

/**
 * @route   POST /api/v1/uploads/presigned-upload-url
 * @desc    Generate presigned upload URL for S3
 * @access  Private
 */
router.post('/presigned-upload-url', authenticateToken, validatePresignedUpload, async (req, res) => {
  try {
    const { originalName, mimeType, category = 'general' } = req.body;
    const userId = req.user.id;

    const result = await fileUploadService.generatePresignedUploadUrl({
      originalName,
      mimeType,
      userId,
      category
    });

    res.json({
      success: true,
      message: 'Presigned upload URL generated successfully',
      data: result
    });
  } catch (error) {
    const formattedError = formatErrorResponse(error);
    res.status(formattedError.error.statusCode).json({
      success: false,
      error: formattedError
    });
  }
});

/**
 * @route   POST /api/v1/uploads/store-metadata
 * @desc    Store file metadata after successful S3 upload
 * @access  Private
 */
router.post('/store-metadata', authenticateToken, validateStoreMetadata, async (req, res) => {
  try {
    const metadata = {
      ...req.body,
      userId: req.user.id
    };

    const fileRecord = await fileUploadService.storeFileMetadata(metadata);

    res.status(201).json({
      success: true,
      message: 'File metadata stored successfully',
      data: fileRecord
    });
  } catch (error) {
    const formattedError = formatErrorResponse(error);
    res.status(formattedError.error.statusCode).json({
      success: false,
      error: formattedError
    });
  }
});

/**
 * @route   GET /api/v1/uploads/presigned-download/:id
 * @desc    Get presigned download URL for a file
 * @access  Private
 */
router.get('/presigned-download/:id', authenticateToken, async (req, res) => {
  try {
    const fileId = parseInt(req.params.id);
    const userId = req.user.id;

    if (isNaN(fileId)) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Invalid file ID',
          statusCode: 400
        }
      });
    }

    const downloadUrl = await fileUploadService.getFileDownloadUrl(fileId, userId);

    res.json({
      success: true,
      message: 'Download URL generated successfully',
      data: { downloadUrl }
    });
  } catch (error) {
    const formattedError = formatErrorResponse(error);
    res.status(formattedError.error.statusCode).json({
      success: false,
      error: formattedError
    });
  }
});

/**
 * @route   POST /api/v1/uploads/local/single
 * @desc    Upload single file to local storage
 * @access  Private
 */
router.post('/local/single', authenticateToken, localStorage.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'No file uploaded',
          statusCode: 400
        }
      });
    }

    const { title, description, category = 'general', tags = [], isPublic = false } = req.body;
    const userId = req.user.id;

    // For local uploads, we'll store the file locally and create metadata
    const fileData = {
      user_id: userId,
      original_name: req.file.originalname,
      file_size: req.file.size,
      mime_type: req.file.mimetype,
      category,
      title: title || req.file.originalname,
      description: description || '',
      tags: Array.isArray(tags) ? tags : [],
      is_public: isPublic,
      storage_type: 'local',
      cloud_key: req.file.filename
    };

    // Store metadata in database
    const fileRecord = await fileUploadService.storeFileMetadata({
      ...fileData,
      s3Key: req.file.filename, // Use filename as key for local storage
      originalName: req.file.originalname,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      userId
    });

    res.status(201).json({
      success: true,
      message: 'File uploaded successfully',
      data: fileRecord
    });
  } catch (error) {
    const formattedError = formatErrorResponse(error);
    res.status(formattedError.error.statusCode).json({
      success: false,
      error: formattedError
    });
  }
});

/**
 * @route   POST /api/v1/uploads/local/multiple
 * @desc    Upload multiple files to local storage
 * @access  Private
 */
router.post('/local/multiple', authenticateToken, localStorage.array('files', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'No files uploaded',
          statusCode: 400
        }
      });
    }

    const { category = 'general', tags = [], isPublic = false } = req.body;
    const userId = req.user.id;
    const uploadedFiles = [];

    for (const file of req.files) {
      try {
        const fileData = {
          user_id: userId,
          original_name: file.originalname,
          file_size: file.size,
          mime_type: file.mimetype,
          category,
          title: file.originalname,
          description: '',
          tags: Array.isArray(tags) ? tags : [],
          is_public: isPublic,
          storage_type: 'local',
          cloud_key: file.filename
        };

        const fileRecord = await fileUploadService.storeFileMetadata({
          ...fileData,
          s3Key: file.filename,
          originalName: file.originalname,
          fileSize: file.size,
          mimeType: file.mimetype,
          userId
        });

        uploadedFiles.push(fileRecord);
      } catch (fileError) {
        console.error(`Error processing file ${file.originalname}:`, fileError);
        // Continue with other files
      }
    }

    res.status(201).json({
      success: true,
      message: `${uploadedFiles.length} files uploaded successfully`,
      data: uploadedFiles
    });
  } catch (error) {
    const formattedError = formatErrorResponse(error);
    res.status(formattedError.error.statusCode).json({
      success: false,
      error: formattedError
    });
  }
});

/**
 * @route   POST /api/v1/uploads/cloud-proxy
 * @desc    Upload file through server to cloud storage
 * @access  Private
 */
router.post('/cloud-proxy', authenticateToken, memory.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'No file uploaded',
          statusCode: 400
        }
      });
    }

    const { title, description, category = 'general', tags = [], isPublic = false } = req.body;
    const userId = req.user.id;

    // Upload to S3 through service
    const uploadResult = await fileUploadService.uploadFileDirectly(req.file.buffer, {
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      userId,
      category,
      metadata: {
        title: title || req.file.originalname,
        description: description || '',
        tags: Array.isArray(tags) ? tags : [],
        isPublic: isPublic || false
      }
    });

    // Store metadata
    const fileRecord = await fileUploadService.storeFileMetadata({
      s3Key: uploadResult.key,
      originalName: req.file.originalname,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      category,
      title: title || req.file.originalname,
      description: description || '',
      tags: Array.isArray(tags) ? tags : [],
      isPublic: isPublic || false,
      userId
    });

    res.status(201).json({
      success: true,
      message: 'File uploaded to cloud storage successfully',
      data: {
        file: fileRecord,
        upload: uploadResult
      }
    });
  } catch (error) {
    const formattedError = formatErrorResponse(error);
    res.status(formattedError.error.statusCode).json({
      success: false,
      error: formattedError
    });
  }
});

/**
 * @route   GET /api/v1/uploads/my-files
 * @desc    Get user's files with pagination and filtering
 * @access  Private
 */
router.get('/my-files', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { 
      page = 1, 
      limit = 20, 
      category, 
      search, 
      orderBy = 'created_at', 
      order = 'DESC' 
    } = req.query;

    const offset = (page - 1) * limit;
    const options = { limit: parseInt(limit), offset, orderBy, order };

    let files;
    if (search) {
      files = await fileUploadService.searchFiles(search, { ...options, userId });
    } else if (category) {
      files = await fileUploadService.getUserFiles(userId, { ...options, category });
    } else {
      files = await fileUploadService.getUserFiles(userId, options);
    }

    // Generate presigned URLs for each file
    const filesWithUrls = await Promise.all(
      files.map(async (file) => {
        try {
          const downloadUrl = await fileUploadService.getFileDownloadUrl(file.id, userId);
          
          return {
            ...file,
            presignedUrl: downloadUrl.downloadUrl,
            expiresAt: new Date(Date.now() + 3600 * 1000).toISOString() // 1 hour from now
          };
        } catch (error) {
          // If presigned URL generation fails, return file without URL
          console.warn(`Failed to generate presigned URL for file ${file.id}:`, error.message);
          return {
            ...file,
            presignedUrl: null,
            expiresAt: null
          };
        }
      })
    );

    // Get total count for pagination
    const totalCount = await fileUploadService.getUserFileStats(userId);
    const totalPages = Math.ceil(totalCount.total_files / limit);

    res.json({
      success: true,
      data: {
        files: filesWithUrls,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalFiles: totalCount.total_files,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      }
    });
  } catch (error) {
    const formattedError = formatErrorResponse(error);
    res.status(formattedError.error.statusCode).json({
      success: false,
      error: formattedError
    });
  }
});

/**
 * @route   GET /api/v1/uploads/files
 * @desc    Get user's files (alias for my-files)
 * @access  Private
 */
router.get('/files', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { 
      page = 1, 
      limit = 20, 
      category, 
      search, 
      orderBy = 'created_at', 
      order = 'DESC' 
    } = req.query;

    const offset = (page - 1) * limit;
    const options = { limit: parseInt(limit), offset, orderBy, order };

    let files;
    if (search) {
      files = await fileUploadService.searchFiles(search, { ...options, userId });
    } else if (category) {
      files = await fileUploadService.getUserFiles(userId, { ...options, category });
    } else {
      files = await fileUploadService.getUserFiles(userId, options);
    }

    // Generate presigned URLs for each file
    const filesWithUrls = await Promise.all(
      files.map(async (file) => {
        try {
          const downloadUrl = await fileUploadService.getFileDownloadUrl(file.id, userId);
          return {
            ...file,
            presignedUrl: downloadUrl.downloadUrl,
            expiresAt: new Date(Date.now() + 3600 * 1000).toISOString() // 1 hour from now
          };
        } catch (error) {
          // If presigned URL generation fails, return file without URL
          console.warn(`Failed to generate presigned URL for file ${file.id}:`, error.message);
          return {
            ...file,
            presignedUrl: null,
            expiresAt: null
          };
        }
      })
    );

    // Get total count for pagination
    const totalCount = await fileUploadService.getUserFileStats(userId);
    const totalPages = Math.ceil(totalCount.total_files / limit);

    res.json({
      success: true,
      data: {
        files: filesWithUrls,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalFiles: totalCount.total_files,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      }
    });
  } catch (error) {
    const formattedError = formatErrorResponse(error);
    res.status(formattedError.error.statusCode).json({
      success: false,
      error: formattedError
    });
  }
});

/**
 * @route   GET /api/v1/uploads/files/:id
 * @desc    Get specific file by ID
 * @access  Private
 */
router.get('/files/:id', authenticateToken, async (req, res) => {
  try {
    const fileId = parseInt(req.params.id);
    const userId = req.user.id;

    if (isNaN(fileId)) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Invalid file ID',
          statusCode: 400
        }
      });
    }

    const file = await fileUploadService.getFileById(fileId, userId);
    
    if (!file) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'File not found',
          statusCode: 404
        }
      });
    }

    // Generate presigned URL for the file
    let fileWithUrl;
    try {
      const downloadUrl = await fileUploadService.getFileDownloadUrl(fileId, userId);
      fileWithUrl = {
        ...file,
        presignedUrl: downloadUrl.downloadUrl,
        expiresAt: new Date(Date.now() + 3600 * 1000).toISOString() // 1 hour from now
      };
    } catch (error) {
      console.warn(`Failed to generate presigned URL for file ${fileId}:`, error.message);
      fileWithUrl = {
        ...file,
        presignedUrl: null,
        expiresAt: null
      };
    }

    res.json({
      success: true,
      data: fileWithUrl
    });
  } catch (error) {
    const formattedError = formatErrorResponse(error);
    res.status(formattedError.error.statusCode).json({
      success: false,
      error: formattedError
    });
  }
});

/**
 * @route   PUT /api/v1/uploads/files/:id
 * @desc    Update file metadata
 * @access  Private
 */
router.put('/files/:id', authenticateToken, validateUpdateMetadata, async (req, res) => {
  try {
    const fileId = parseInt(req.params.id);
    const userId = req.user.id;
    const metadata = req.body;

    if (isNaN(fileId)) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Invalid file ID',
          statusCode: 400
        }
      });
    }

    const updatedFile = await fileUploadService.updateFileMetadata(fileId, userId, metadata);

    res.json({
      success: true,
      message: 'File metadata updated successfully',
      data: updatedFile
    });
  } catch (error) {
    const formattedError = formatErrorResponse(error);
    res.status(formattedError.error.statusCode).json({
      success: false,
      error: formattedError
    });
  }
});

/**
 * @route   DELETE /api/v1/uploads/files/:id
 * @desc    Delete file
 * @access  Private
 */
router.delete('/files/:id', authenticateToken, async (req, res) => {
  try {
    const fileId = parseInt(req.params.id);
    const userId = req.user.id;

    if (isNaN(fileId)) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Invalid file ID',
          statusCode: 400
        }
      });
    }

    await fileUploadService.deleteFile(fileId, userId);

    res.json({
      success: true,
      message: 'File deleted successfully'
    });
  } catch (error) {
    const formattedError = formatErrorResponse(error);
    res.status(formattedError.error.statusCode).json({
      success: false,
      error: formattedError
    });
  }
});

/**
 * @route   GET /api/v1/uploads/stats
 * @desc    Get user's file statistics
 * @access  Private
 */
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const stats = await fileUploadService.getUserFileStats(userId);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    const formattedError = formatErrorResponse(error);
    res.status(formattedError.error.statusCode).json({
      success: false,
      error: formattedError
    });
  }
});


/**
 * @route   GET /api/v1/uploads/search
 * @desc    Search files by term
 * @access  Private
 */
router.get('/search', authenticateToken, async (req, res) => {
  try {
    const { q: searchTerm, category, page = 1, limit = 20 } = req.query;
    const userId = req.user.id;

    if (!searchTerm) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Search term is required',
          statusCode: 400
        }
      });
    }

    const offset = (page - 1) * limit;
    const options = { limit: parseInt(limit), offset, userId, category };

    const files = await fileUploadService.searchFiles(searchTerm, options);

    // Generate presigned URLs for each file
    const filesWithUrls = await Promise.all(
      files.map(async (file) => {
        try {
          const downloadUrl = await fileUploadService.getFileDownloadUrl(file.id, userId);
          return {
            ...file,
            presignedUrl: downloadUrl.downloadUrl,
            expiresAt: new Date(Date.now() + 3600 * 1000).toISOString() // 1 hour from now
          };
        } catch (error) {
          // If presigned URL generation fails, return file without URL
          console.warn(`Failed to generate presigned URL for file ${file.id}:`, error.message);
          return {
            ...file,
            presignedUrl: null,
            expiresAt: null
          };
        }
      })
    );

    res.json({
      success: true,
      data: filesWithUrls
    });
  } catch (error) {
    const formattedError = formatErrorResponse(error);
    res.status(formattedError.error.statusCode).json({
      success: false,
      error: formattedError
    });
  }
});

module.exports = router; 