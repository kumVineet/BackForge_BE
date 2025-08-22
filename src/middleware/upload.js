/**
 * Upload Middleware (Simplified)
 * Basic file upload configurations for local storage
 * Note: Most upload functionality is now handled by FileUploadService
 */
const multer = require('multer');
const path = require('path');
const fs = require('fs-extra');
const { config } = require('../config/app');

// File validation configuration
const fileConfig = {
  // File size limits (in bytes)
  maxFileSize: 100 * 1024 * 1024, // 100MB
  maxFiles: 10,
  
  // Allowed file types (basic validation)
  allowedTypes: [
    'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf', 'text/plain', 'text/csv',
    'video/mp4', 'video/avi', 'video/mov',
    'audio/mpeg', 'audio/wav', 'audio/ogg'
  ]
};

// Configure local storage for disk uploads
const localStorage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      const uploadPath = path.join(process.cwd(), config.uploadDir || 'uploads');
      await fs.ensureDir(uploadPath);
      cb(null, uploadPath);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + extension);
  }
});

// Basic file filter
const fileFilter = (req, file, cb) => {
  if (fileConfig.allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${file.mimetype} not allowed`), false);
  }
};

// Create multer instances
const localStorage_upload = multer({
  storage: localStorage,
  fileFilter: fileFilter,
  limits: {
    fileSize: fileConfig.maxFileSize,
    files: fileConfig.maxFiles
  }
});

const memoryUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter: fileFilter,
  limits: {
    fileSize: fileConfig.maxFileSize,
    files: fileConfig.maxFiles
  }
});

module.exports = {
  localStorage: localStorage_upload,
  memory: memoryUpload,
  fileConfig
}; 