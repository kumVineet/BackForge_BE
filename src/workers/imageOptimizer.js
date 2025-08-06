const { parentPort, workerData } = require('worker_threads');
const fs = require('fs-extra');
const path = require('path');

// Image optimizer worker
class ImageOptimizer {
  constructor(data) {
    this.data = data;
    this.workerId = data.workerId;
  }

  // Optimize image
  async optimizeImage() {
    try {
      const { imagePath, options = {} } = this.data;
      
      console.log(`Worker ${this.workerId}: Optimizing image ${imagePath}`);

      // Check if image exists
      if (!await fs.pathExists(imagePath)) {
        throw new Error(`Image not found: ${imagePath}`);
      }

      const stats = await fs.stat(imagePath);
      const originalSize = stats.size;
      const mimeType = this.getMimeType(imagePath);

      // Validate that it's an image
      if (!mimeType.startsWith('image/')) {
        throw new Error(`File is not an image: ${mimeType}`);
      }

      const {
        quality = 0.8,
        width,
        height,
        format = 'auto',
        progressive = true,
        stripMetadata = true
      } = options;

      // Generate output path
      const outputPath = this.generateOutputPath(imagePath, format, options);

      // Simulate image optimization (in real implementation, use sharp or jimp)
      await this.simulateOptimization(2000);

      // For now, copy the file as "optimized"
      // In real implementation, actual image optimization would happen here
      await fs.copy(imagePath, outputPath);

      const optimizedStats = await fs.stat(outputPath);
      const optimizedSize = optimizedStats.size;

      const result = {
        originalPath: imagePath,
        optimizedPath: outputPath,
        originalSize: originalSize,
        optimizedSize: optimizedSize,
        compressionRatio: ((originalSize - optimizedSize) / originalSize * 100).toFixed(2),
        mimeType: mimeType,
        format: format,
        quality: quality,
        dimensions: {
          original: await this.getImageDimensions(imagePath),
          optimized: width && height ? { width, height } : await this.getImageDimensions(imagePath)
        },
        options: {
          quality,
          width,
          height,
          format,
          progressive,
          stripMetadata
        },
        processingTime: Date.now() - this.startTime
      };

      console.log(`Worker ${this.workerId}: Image optimization completed`);
      return result;

    } catch (error) {
      console.error(`Worker ${this.workerId}: Image optimization error:`, error.message);
      return {
        error: error.message,
        processingTime: Date.now() - this.startTime
      };
    }
  }

  // Generate multiple sizes for responsive images
  async generateResponsiveSizes() {
    try {
      const { imagePath, sizes = [320, 640, 1024, 1920], quality = 0.8 } = this.data;
      
      console.log(`Worker ${this.workerId}: Generating responsive sizes for ${imagePath}`);

      if (!await fs.pathExists(imagePath)) {
        throw new Error(`Image not found: ${imagePath}`);
      }

      const results = [];
      const baseName = path.basename(imagePath, path.extname(imagePath));
      const dir = path.dirname(imagePath);

      for (const size of sizes) {
        const outputPath = path.join(dir, `${baseName}_${size}w.jpg`);
        
        // Simulate resizing
        await this.simulateOptimization(1000);
        
        // Copy file as "resized" (in real implementation, actual resizing would happen)
        await fs.copy(imagePath, outputPath);
        
        const stats = await fs.stat(outputPath);
        
        results.push({
          size: size,
          path: outputPath,
          fileSize: stats.size,
          quality: quality
        });
      }

      return {
        originalPath: imagePath,
        responsiveSizes: results,
        processingTime: Date.now() - this.startTime
      };

    } catch (error) {
      console.error(`Worker ${this.workerId}: Responsive sizes generation error:`, error.message);
      return {
        error: error.message,
        processingTime: Date.now() - this.startTime
      };
    }
  }

  // Apply filters and effects
  async applyEffects() {
    try {
      const { imagePath, effects = [] } = this.data;
      
      console.log(`Worker ${this.workerId}: Applying effects to ${imagePath}`);

      if (!await fs.pathExists(imagePath)) {
        throw new Error(`Image not found: ${imagePath}`);
      }

      const outputPath = this.generateOutputPath(imagePath, 'jpg', { suffix: '_effects' });
      
      // Simulate effects processing
      await this.simulateOptimization(1500);
      
      // Copy file as "processed" (in real implementation, actual effects would be applied)
      await fs.copy(imagePath, outputPath);

      const result = {
        originalPath: imagePath,
        processedPath: outputPath,
        effects: effects,
        processingTime: Date.now() - this.startTime
      };

      console.log(`Worker ${this.workerId}: Effects applied successfully`);
      return result;

    } catch (error) {
      console.error(`Worker ${this.workerId}: Effects application error:`, error.message);
      return {
        error: error.message,
        processingTime: Date.now() - this.startTime
      };
    }
  }

  // Generate output path
  generateOutputPath(originalPath, format, options = {}) {
    const { suffix = '_optimized' } = options;
    const dir = path.dirname(originalPath);
    const baseName = path.basename(originalPath, path.extname(originalPath));
    
    if (format === 'auto') {
      const ext = path.extname(originalPath);
      return path.join(dir, `${baseName}${suffix}${ext}`);
    } else {
      return path.join(dir, `${baseName}${suffix}.${format}`);
    }
  }

  // Get MIME type
  getMimeType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.bmp': 'image/bmp',
      '.tiff': 'image/tiff',
      '.svg': 'image/svg+xml'
    };
    
    return mimeTypes[ext] || 'application/octet-stream';
  }

  // Get image dimensions (simplified)
  async getImageDimensions(imagePath) {
    // In a real implementation, you'd use sharp or jimp to get actual dimensions
    // For now, return simulated dimensions
    return {
      width: 1920,
      height: 1080
    };
  }

  // Simulate optimization work
  async simulateOptimization(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Worker thread execution
if (parentPort) {
  const optimizer = new ImageOptimizer(workerData);
  optimizer.startTime = Date.now();
  
  const { operation = 'optimize' } = workerData;
  
  let result;
  switch (operation) {
    case 'optimize':
      result = await optimizer.optimizeImage();
      break;
    case 'responsive':
      result = await optimizer.generateResponsiveSizes();
      break;
    case 'effects':
      result = await optimizer.applyEffects();
      break;
    default:
      result = await optimizer.optimizeImage();
  }
  
  parentPort.postMessage(result);
} 