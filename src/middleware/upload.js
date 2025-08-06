const multer = require('multer');
const path = require('path');
const fs = require('fs-extra');
const { config } = require('../config/app');
const { ValidationError } = require('../utils/errors');

// File validation configuration
const fileConfig = {
  // Allowed file types
  allowedTypes: {
    image: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
    document: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    video: ['video/mp4', 'video/avi', 'video/mov', 'video/wmv', 'video/flv'],
    audio: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp3']
  },
  
  // File size limits (in bytes)
  maxSizes: {
    image: 5 * 1024 * 1024, // 5MB
    document: 10 * 1024 * 1024, // 10MB
    video: 100 * 1024 * 1024, // 100MB
    audio: 20 * 1024 * 1024 // 20MB
  },
  
  // Maximum number of files
  maxFiles: 10
};

// Configure local storage
const configureLocalStorage = (uploadPath) => {
  return multer.diskStorage({
    destination: async (req, file, cb) => {
      try {
        // Ensure upload directory exists
        await fs.ensureDir(uploadPath);
        cb(null, uploadPath);
      } catch (error) {
        cb(error);
      }
    },
    filename: (req, file, cb) => {
      // Generate unique filename with timestamp
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const extension = path.extname(file.originalname);
      const filename = `${file.fieldname}-${uniqueSuffix}${extension}`;
      cb(null, filename);
    }
  });
};

// File filter function
const fileFilter = (req, file, cb) => {
  try {
    // Get file category from request or default to 'image'
    const category = req.body.category || 'image';
    
    if (!fileConfig.allowedTypes[category]) {
      return cb(new ValidationError(`Invalid file category: ${category}`), false);
    }
    
    if (!fileConfig.allowedTypes[category].includes(file.mimetype)) {
      return cb(new ValidationError(`File type ${file.mimetype} not allowed for category ${category}`), false);
    }
    
    // Check file size
    if (file.size > fileConfig.maxSizes[category]) {
      return cb(new ValidationError(`File size exceeds limit for ${category} (${fileConfig.maxSizes[category] / (1024 * 1024)}MB)`), false);
    }
    
    cb(null, true);
  } catch (error) {
    cb(error, false);
  }
};

// Create multer instance for local storage
const createLocalUpload = (uploadPath) => {
  return multer({
    storage: configureLocalStorage(uploadPath),
    fileFilter: fileFilter,
    limits: {
      fileSize: Math.max(...Object.values(fileConfig.maxSizes)),
      files: fileConfig.maxFiles
    }
  });
};

// Create multer instance for memory storage (for cloud uploads)
const createMemoryUpload = () => {
  return multer({
    storage: multer.memoryStorage(),
    fileFilter: fileFilter,
    limits: {
      fileSize: Math.max(...Object.values(fileConfig.maxSizes)),
      files: fileConfig.maxFiles
    }
  });
};

// Middleware for single file upload
const uploadSingle = (fieldName, category = 'image') => {
  return (req, res, next) => {
    const uploadPath = path.join(process.cwd(), config.uploadDir, category);
    const upload = createLocalUpload(uploadPath);
    
    // Add category to request body for file filter
    req.body.category = category;
    
    upload.single(fieldName)(req, res, (err) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            return next(new ValidationError(`File too large. Maximum size: ${fileConfig.maxSizes[category] / (1024 * 1024)}MB`));
          }
          if (err.code === 'LIMIT_FILE_COUNT') {
            return next(new ValidationError(`Too many files. Maximum: ${fileConfig.maxFiles}`));
          }
          if (err.code === 'LIMIT_UNEXPECTED_FILE') {
            return next(new ValidationError(`Unexpected file field: ${err.field}`));
          }
        }
        return next(err);
      }
      
      if (!req.file) {
        return next(new ValidationError(`No file uploaded for field: ${fieldName}`));
      }
      
      // Add file metadata to request
      req.uploadedFile = {
        originalname: req.file.originalname,
        filename: req.file.filename,
        path: req.file.path,
        size: req.file.size,
        mimetype: req.file.mimetype,
        category: category
      };
      
      next();
    });
  };
};

// Middleware for multiple files upload
const uploadMultiple = (fieldName, category = 'image') => {
  return (req, res, next) => {
    const uploadPath = path.join(process.cwd(), config.uploadDir, category);
    const upload = createLocalUpload(uploadPath);
    
    // Add category to request body for file filter
    req.body.category = category;
    
    upload.array(fieldName, fileConfig.maxFiles)(req, res, (err) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            return next(new ValidationError(`File too large. Maximum size: ${fileConfig.maxSizes[category] / (1024 * 1024)}MB`));
          }
          if (err.code === 'LIMIT_FILE_COUNT') {
            return next(new ValidationError(`Too many files. Maximum: ${fileConfig.maxFiles}`));
          }
          if (err.code === 'LIMIT_UNEXPECTED_FILE') {
            return next(new ValidationError(`Unexpected file field: ${err.field}`));
          }
        }
        return next(err);
      }
      
      if (!req.files || req.files.length === 0) {
        return next(new ValidationError(`No files uploaded for field: ${fieldName}`));
      }
      
      // Add file metadata to request
      req.uploadedFiles = req.files.map(file => ({
        originalname: file.originalname,
        filename: file.filename,
        path: file.path,
        size: file.size,
        mimetype: file.mimetype,
        category: category
      }));
      
      next();
    });
  };
};

// Middleware for memory upload (for cloud storage)
const uploadToMemory = (fieldName, category = 'image') => {
  return (req, res, next) => {
    const upload = createMemoryUpload();
    
    // Add category to request body for file filter
    req.body.category = category;
    
    upload.single(fieldName)(req, res, (err) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            return next(new ValidationError(`File too large. Maximum size: ${fileConfig.maxSizes[category] / (1024 * 1024)}MB`));
          }
          if (err.code === 'LIMIT_FILE_COUNT') {
            return next(new ValidationError(`Too many files. Maximum: ${fileConfig.maxFiles}`));
          }
          if (err.code === 'LIMIT_UNEXPECTED_FILE') {
            return next(new ValidationError(`Unexpected file field: ${err.field}`));
          }
        }
        return next(err);
      }
      
      if (!req.file) {
        return next(new ValidationError(`No file uploaded for field: ${fieldName}`));
      }
      
      // Add file metadata to request
      req.uploadedFile = {
        originalname: req.file.originalname,
        buffer: req.file.buffer,
        size: req.file.size,
        mimetype: req.file.mimetype,
        category: category
      };
      
      next();
    });
  };
};

module.exports = {
  uploadSingle,
  uploadMultiple,
  uploadToMemory,
  fileConfig,
  createLocalUpload,
  createMemoryUpload
}; 