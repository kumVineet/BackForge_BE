const express = require('express');
const { body, validationResult } = require('express-validator');
const { 
  authenticateToken, 
  authorizeRoles 
} = require('../middleware/auth');
const { 
  workerManager, 
  WORKER_TYPES,
  createWorker,
  getStats 
} = require('../workers');
const { 
  ValidationError, 
  DatabaseError 
} = require('../utils/errors');

const router = express.Router();

// Validation middleware
const validateWorkerJob = [
  body('type').isIn(Object.values(WORKER_TYPES)).withMessage('Invalid worker type'),
  body('data').isObject().withMessage('Data must be an object'),
  body('priority').optional().isInt({ min: 1, max: 10 }).withMessage('Priority must be between 1 and 10')
];

// Get worker statistics
router.get('/stats', authenticateToken, authorizeRoles('admin'), async (req, res, next) => {
  try {
    const stats = getStats();
    
    res.json({
      stats,
      workerTypes: WORKER_TYPES,
      capabilities: {
        fileProcessor: ['compress', 'convert', 'extract_metadata', 'generate_thumbnail', 'validate'],
        imageOptimizer: ['optimize', 'responsive', 'effects'],
        backgroundJob: ['cleanup_temp_files', 'process_batch_uploads', 'generate_reports', 'sync_database', 'backup_data', 'send_notifications']
      }
    });
  } catch (error) {
    next(error);
  }
});

// Start a file processing job
router.post('/file-processor', 
  authenticateToken, 
  validateWorkerJob,
  async (req, res, next) => {
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new ValidationError('Validation failed', errors.array());
      }

      const { filePath, operation, options = {} } = req.body.data;
      const userId = req.user.id;

      if (!filePath || !operation) {
        throw new ValidationError('filePath and operation are required');
      }

      const result = await createWorker(WORKER_TYPES.FILE_PROCESSOR, {
        filePath,
        operation,
        options,
        userId
      });

      res.status(201).json({
        message: 'File processing job started',
        jobId: result.workerId,
        operation,
        status: 'processing'
      });
    } catch (error) {
      next(error);
    }
  }
);

// Start an image optimization job
router.post('/image-optimizer',
  authenticateToken,
  validateWorkerJob,
  async (req, res, next) => {
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new ValidationError('Validation failed', errors.array());
      }

      const { imagePath, operation = 'optimize', options = {} } = req.body.data;
      const userId = req.user.id;

      if (!imagePath) {
        throw new ValidationError('imagePath is required');
      }

      const result = await createWorker(WORKER_TYPES.IMAGE_OPTIMIZER, {
        imagePath,
        operation,
        options,
        userId
      });

      res.status(201).json({
        message: 'Image optimization job started',
        jobId: result.workerId,
        operation,
        status: 'processing'
      });
    } catch (error) {
      next(error);
    }
  }
);

// Start a background job
router.post('/background-job',
  authenticateToken,
  authorizeRoles('admin'),
  validateWorkerJob,
  async (req, res, next) => {
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new ValidationError('Validation failed', errors.array());
      }

      const { jobType, jobData = {} } = req.body.data;
      const userId = req.user.id;

      if (!jobType) {
        throw new ValidationError('jobType is required');
      }

      const result = await createWorker(WORKER_TYPES.BACKGROUND_JOB, {
        jobType,
        jobData,
        userId
      });

      res.status(201).json({
        message: 'Background job started',
        jobId: result.workerId,
        jobType,
        status: 'processing'
      });
    } catch (error) {
      next(error);
    }
  }
);

// Batch file processing
router.post('/batch-process',
  authenticateToken,
  async (req, res, next) => {
    try {
      const { files, operations = ['validate'] } = req.body;
      const userId = req.user.id;

      if (!files || !Array.isArray(files) || files.length === 0) {
        throw new ValidationError('files array is required');
      }

      const batchId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const jobs = [];

      for (const file of files) {
        try {
          const result = await createWorker(WORKER_TYPES.FILE_PROCESSOR, {
            filePath: file.path,
            operation: 'validate',
            options: { operations },
            userId,
            batchId
          });
          
          jobs.push({
            fileId: file.id,
            jobId: result.workerId,
            status: 'started'
          });
        } catch (error) {
          jobs.push({
            fileId: file.id,
            error: error.message,
            status: 'failed'
          });
        }
      }

      res.status(201).json({
        message: 'Batch processing started',
        batchId,
        totalFiles: files.length,
        jobs
      });
    } catch (error) {
      next(error);
    }
  }
);

// Cleanup temporary files
router.post('/cleanup',
  authenticateToken,
  authorizeRoles('admin'),
  async (req, res, next) => {
    try {
      const { tempDir, maxAge, dryRun = false } = req.body;

      const result = await createWorker(WORKER_TYPES.BACKGROUND_JOB, {
        jobType: 'cleanup_temp_files',
        jobData: {
          tempDir,
          maxAge,
          dryRun
        },
        userId: req.user.id
      });

      res.status(201).json({
        message: 'Cleanup job started',
        jobId: result.workerId,
        dryRun,
        status: 'processing'
      });
    } catch (error) {
      next(error);
    }
  }
);

// Generate system report
router.post('/generate-report',
  authenticateToken,
  authorizeRoles('admin'),
  async (req, res, next) => {
    try {
      const { reportType, dateRange, format = 'json' } = req.body;

      const result = await createWorker(WORKER_TYPES.BACKGROUND_JOB, {
        jobType: 'generate_reports',
        jobData: {
          reportType,
          dateRange,
          format
        },
        userId: req.user.id
      });

      res.status(201).json({
        message: 'Report generation started',
        jobId: result.workerId,
        reportType,
        format,
        status: 'processing'
      });
    } catch (error) {
      next(error);
    }
  }
);

// Optimize uploaded images
router.post('/optimize-images',
  authenticateToken,
  async (req, res, next) => {
    try {
      const { imageIds, options = {} } = req.body;
      const userId = req.user.id;

      if (!imageIds || !Array.isArray(imageIds) || imageIds.length === 0) {
        throw new ValidationError('imageIds array is required');
      }

      const jobs = [];

      for (const imageId of imageIds) {
        try {
          // In a real implementation, you'd get the image path from the database
          const imagePath = `/uploads/images/${imageId}.jpg`; // Simulated path
          
          const result = await createWorker(WORKER_TYPES.IMAGE_OPTIMIZER, {
            imagePath,
            operation: 'optimize',
            options,
            userId,
            imageId
          });
          
          jobs.push({
            imageId,
            jobId: result.workerId,
            status: 'started'
          });
        } catch (error) {
          jobs.push({
            imageId,
            error: error.message,
            status: 'failed'
          });
        }
      }

      res.status(201).json({
        message: 'Image optimization started',
        totalImages: imageIds.length,
        jobs
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get worker capabilities
router.get('/capabilities', authenticateToken, async (req, res, next) => {
  try {
    const capabilities = {
      fileProcessor: {
        operations: ['compress', 'convert', 'extract_metadata', 'generate_thumbnail', 'validate'],
        description: 'Process files for compression, conversion, metadata extraction, and validation'
      },
      imageOptimizer: {
        operations: ['optimize', 'responsive', 'effects'],
        description: 'Optimize images, generate responsive sizes, and apply effects'
      },
      backgroundJob: {
        operations: ['cleanup_temp_files', 'process_batch_uploads', 'generate_reports', 'sync_database', 'backup_data', 'send_notifications'],
        description: 'Execute background tasks like cleanup, batch processing, and system maintenance'
      }
    };

    res.json({
      capabilities,
      workerTypes: WORKER_TYPES,
      maxWorkers: workerManager.maxWorkers
    });
  } catch (error) {
    next(error);
  }
});

// Terminate all workers (admin only)
router.delete('/terminate-all',
  authenticateToken,
  authorizeRoles('admin'),
  async (req, res, next) => {
    try {
      await workerManager.terminateAll();
      
      res.json({
        message: 'All workers terminated successfully'
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router; 