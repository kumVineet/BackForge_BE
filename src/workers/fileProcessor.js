const { parentPort, workerData } = require('worker_threads');
const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');

// File processor worker
class FileProcessor {
  constructor(data) {
    this.data = data;
    this.workerId = data.workerId;
  }

  // Process file based on type
  async processFile() {
    try {
      const { filePath, operation, options = {} } = this.data;
      
      console.log(`Worker ${this.workerId}: Processing file ${filePath}`);

      // Check if file exists
      if (!await fs.pathExists(filePath)) {
        throw new Error(`File not found: ${filePath}`);
      }

      // Get file stats
      const stats = await fs.stat(filePath);
      const fileSize = stats.size;
      const mimeType = this.getMimeType(filePath);

      let result = {
        originalPath: filePath,
        originalSize: fileSize,
        mimeType: mimeType,
        operation: operation,
        processed: false,
        metadata: {}
      };

      // Perform operation based on type
      switch (operation) {
        case 'compress':
          result = await this.compressFile(filePath, options);
          break;
        case 'convert':
          result = await this.convertFile(filePath, options);
          break;
        case 'extract_metadata':
          result = await this.extractMetadata(filePath, options);
          break;
        case 'generate_thumbnail':
          result = await this.generateThumbnail(filePath, options);
          break;
        case 'validate':
          result = await this.validateFile(filePath, options);
          break;
        default:
          throw new Error(`Unknown operation: ${operation}`);
      }

      result.processed = true;
      result.processingTime = Date.now() - this.startTime;

      console.log(`Worker ${this.workerId}: File processing completed`);
      return result;

    } catch (error) {
      console.error(`Worker ${this.workerId}: File processing error:`, error.message);
      return {
        error: error.message,
        processed: false,
        processingTime: Date.now() - this.startTime
      };
    }
  }

  // Compress file
  async compressFile(filePath, options) {
    const { quality = 0.8, format = 'auto' } = options;
    
    // For now, we'll simulate compression
    // In a real implementation, you'd use libraries like sharp for images
    const compressedPath = filePath.replace(/\.[^/.]+$/, '_compressed.$&');
    
    // Simulate compression delay
    await this.simulateWork(1000);
    
    // Copy file as "compressed" (in real implementation, actual compression would happen)
    await fs.copy(filePath, compressedPath);
    
    const compressedStats = await fs.stat(compressedPath);
    
    return {
      originalPath: filePath,
      compressedPath: compressedPath,
      originalSize: this.data.fileSize || 0,
      compressedSize: compressedStats.size,
      compressionRatio: ((this.data.fileSize - compressedStats.size) / this.data.fileSize * 100).toFixed(2),
      quality: quality,
      format: format
    };
  }

  // Convert file format
  async convertFile(filePath, options) {
    const { targetFormat, quality = 0.8 } = options;
    
    const fileName = path.basename(filePath, path.extname(filePath));
    const convertedPath = path.join(path.dirname(filePath), `${fileName}.${targetFormat}`);
    
    // Simulate conversion delay
    await this.simulateWork(2000);
    
    // Copy file as "converted" (in real implementation, actual conversion would happen)
    await fs.copy(filePath, convertedPath);
    
    const convertedStats = await fs.stat(convertedPath);
    
    return {
      originalPath: filePath,
      convertedPath: convertedPath,
      originalFormat: path.extname(filePath).slice(1),
      targetFormat: targetFormat,
      originalSize: this.data.fileSize || 0,
      convertedSize: convertedStats.size,
      quality: quality
    };
  }

  // Extract file metadata
  async extractMetadata(filePath, options) {
    const stats = await fs.stat(filePath);
    const buffer = await fs.readFile(filePath);
    const hash = crypto.createHash('md5').update(buffer).digest('hex');
    
    const metadata = {
      filename: path.basename(filePath),
      extension: path.extname(filePath).slice(1),
      size: stats.size,
      created: stats.birthtime,
      modified: stats.mtime,
      accessed: stats.atime,
      md5: hash,
      permissions: stats.mode.toString(8),
      isFile: stats.isFile(),
      isDirectory: stats.isDirectory()
    };

    // Add specific metadata based on file type
    const mimeType = this.getMimeType(filePath);
    if (mimeType.startsWith('image/')) {
      metadata.imageInfo = await this.extractImageMetadata(buffer);
    } else if (mimeType.startsWith('video/')) {
      metadata.videoInfo = await this.extractVideoMetadata(buffer);
    }

    return {
      originalPath: filePath,
      metadata: metadata,
      mimeType: mimeType
    };
  }

  // Generate thumbnail
  async generateThumbnail(filePath, options) {
    const { width = 150, height = 150, quality = 0.8 } = options;
    
    const fileName = path.basename(filePath, path.extname(filePath));
    const thumbnailPath = path.join(path.dirname(filePath), `${fileName}_thumb.jpg`);
    
    // Simulate thumbnail generation
    await this.simulateWork(1500);
    
    // Create a small file as "thumbnail" (in real implementation, actual thumbnail generation would happen)
    await fs.writeFile(thumbnailPath, 'thumbnail data');
    
    const thumbnailStats = await fs.stat(thumbnailPath);
    
    return {
      originalPath: filePath,
      thumbnailPath: thumbnailPath,
      dimensions: { width, height },
      thumbnailSize: thumbnailStats.size,
      quality: quality
    };
  }

  // Validate file
  async validateFile(filePath, options) {
    const { maxSize, allowedTypes, checkIntegrity = true } = options;
    
    const stats = await fs.stat(filePath);
    const mimeType = this.getMimeType(filePath);
    
    const validation = {
      exists: true,
      readable: true,
      size: stats.size,
      mimeType: mimeType,
      isValid: true,
      errors: []
    };

    // Check file size
    if (maxSize && stats.size > maxSize) {
      validation.isValid = false;
      validation.errors.push(`File size ${stats.size} exceeds maximum ${maxSize}`);
    }

    // Check file type
    if (allowedTypes && !allowedTypes.includes(mimeType)) {
      validation.isValid = false;
      validation.errors.push(`File type ${mimeType} not allowed`);
    }

    // Check file integrity
    if (checkIntegrity) {
      try {
        const buffer = await fs.readFile(filePath);
        validation.md5 = crypto.createHash('md5').update(buffer).digest('hex');
      } catch (error) {
        validation.isValid = false;
        validation.errors.push('File integrity check failed');
      }
    }

    return {
      originalPath: filePath,
      validation: validation
    };
  }

  // Get MIME type from file extension
  getMimeType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.mp4': 'video/mp4',
      '.avi': 'video/avi',
      '.mov': 'video/quicktime',
      '.mp3': 'audio/mpeg',
      '.wav': 'audio/wav',
      '.txt': 'text/plain',
      '.json': 'application/json'
    };
    
    return mimeTypes[ext] || 'application/octet-stream';
  }

  // Extract image metadata (simplified)
  async extractImageMetadata(buffer) {
    // In a real implementation, you'd use a library like sharp or jimp
    return {
      width: 1920, // Simulated
      height: 1080, // Simulated
      colorSpace: 'RGB',
      hasAlpha: false
    };
  }

  // Extract video metadata (simplified)
  async extractVideoMetadata(buffer) {
    // In a real implementation, you'd use a library like ffmpeg
    return {
      duration: 120, // Simulated seconds
      width: 1920, // Simulated
      height: 1080, // Simulated
      fps: 30, // Simulated
      codec: 'H.264' // Simulated
    };
  }

  // Simulate work (for testing)
  async simulateWork(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Worker thread execution
if (parentPort) {
  const processor = new FileProcessor(workerData);
  processor.startTime = Date.now();
  
  processor.processFile()
    .then(result => {
      parentPort.postMessage(result);
    })
    .catch(error => {
      parentPort.postMessage({
        error: error.message,
        processed: false
      });
    });
} 