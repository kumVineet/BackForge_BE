# BackForge Worker Threads Implementation

## 🚀 Overview

BackForge now includes a comprehensive worker thread system to handle CPU-intensive tasks without blocking the main event loop. This improves performance and responsiveness for file processing, image optimization, and background jobs.

## 🏗️ Architecture

### Worker Manager
- **Location**: `src/workers/index.js`
- **Purpose**: Manages worker thread lifecycle, limits, and communication
- **Features**:
  - Automatic worker cleanup
  - Timeout handling
  - Error management
  - Statistics tracking

### Worker Types

#### 1. File Processor (`fileProcessor.js`)
- **Purpose**: Handle file operations and processing
- **Operations**:
  - `compress` - Compress files
  - `convert` - Convert file formats
  - `extract_metadata` - Extract file metadata
  - `generate_thumbnail` - Generate thumbnails
  - `validate` - Validate files

#### 2. Image Optimizer (`imageOptimizer.js`)
- **Purpose**: Optimize and process images
- **Operations**:
  - `optimize` - Optimize image quality and size
  - `responsive` - Generate responsive image sizes
  - `effects` - Apply image effects and filters

#### 3. Background Job (`backgroundJob.js`)
- **Purpose**: Handle long-running background tasks
- **Operations**:
  - `cleanup_temp_files` - Clean up temporary files
  - `process_batch_uploads` - Process batch file uploads
  - `generate_reports` - Generate system reports
  - `sync_database` - Database synchronization
  - `backup_data` - Data backup operations
  - `send_notifications` - Send notifications

## ⚙️ Configuration

### Environment Variables
```env
# Worker Threads Configuration
MAX_WORKERS=4              # Maximum number of concurrent workers
WORKER_TIMEOUT=30000       # Worker timeout in milliseconds (30 seconds)
```

### App Configuration
```javascript
// src/config/app.js
const config = {
  // ... other config
  maxWorkers: parseInt(process.env.MAX_WORKERS) || 4,
  workerTimeout: parseInt(process.env.WORKER_TIMEOUT) || 30000,
};
```

## 📡 API Endpoints

### Worker Management

#### Get Worker Statistics
```http
GET /api/v1/workers/stats
Authorization: Bearer <token>
```
**Response:**
```json
{
  "stats": {
    "activeWorkers": 2,
    "maxWorkers": 4,
    "availableWorkers": 2
  },
  "workerTypes": {
    "FILE_PROCESSOR": "fileProcessor",
    "IMAGE_OPTIMIZER": "imageOptimizer",
    "BACKGROUND_JOB": "backgroundJob"
  },
  "capabilities": {
    "fileProcessor": ["compress", "convert", "extract_metadata", "generate_thumbnail", "validate"],
    "imageOptimizer": ["optimize", "responsive", "effects"],
    "backgroundJob": ["cleanup_temp_files", "process_batch_uploads", "generate_reports", "sync_database", "backup_data", "send_notifications"]
  }
}
```

#### Get Worker Capabilities
```http
GET /api/v1/workers/capabilities
Authorization: Bearer <token>
```

### File Processing

#### Start File Processing Job
```http
POST /api/v1/workers/file-processor
Authorization: Bearer <token>
Content-Type: application/json

{
  "data": {
    "filePath": "/path/to/file.jpg",
    "operation": "compress",
    "options": {
      "quality": 0.8,
      "format": "auto"
    }
  }
}
```

#### Batch File Processing
```http
POST /api/v1/workers/batch-process
Authorization: Bearer <token>
Content-Type: application/json

{
  "files": [
    { "id": 1, "path": "/path/to/file1.jpg" },
    { "id": 2, "path": "/path/to/file2.png" }
  ],
  "operations": ["validate", "compress"]
}
```

### Image Optimization

#### Start Image Optimization
```http
POST /api/v1/workers/image-optimizer
Authorization: Bearer <token>
Content-Type: application/json

{
  "data": {
    "imagePath": "/path/to/image.jpg",
    "operation": "optimize",
    "options": {
      "quality": 0.8,
      "width": 1920,
      "height": 1080,
      "format": "webp"
    }
  }
}
```

#### Generate Responsive Images
```http
POST /api/v1/workers/image-optimizer
Authorization: Bearer <token>
Content-Type: application/json

{
  "data": {
    "imagePath": "/path/to/image.jpg",
    "operation": "responsive",
    "options": {
      "sizes": [320, 640, 1024, 1920],
      "quality": 0.8
    }
  }
}
```

#### Optimize Multiple Images
```http
POST /api/v1/workers/optimize-images
Authorization: Bearer <token>
Content-Type: application/json

{
  "imageIds": [1, 2, 3, 4],
  "options": {
    "quality": 0.8,
    "format": "webp"
  }
}
```

### Background Jobs

#### Start Background Job
```http
POST /api/v1/workers/background-job
Authorization: Bearer <token>
Content-Type: application/json

{
  "data": {
    "jobType": "cleanup_temp_files",
    "jobData": {
      "tempDir": "temp",
      "maxAge": 86400000,
      "dryRun": false
    }
  }
}
```

#### Cleanup Temporary Files
```http
POST /api/v1/workers/cleanup
Authorization: Bearer <token>
Content-Type: application/json

{
  "tempDir": "temp",
  "maxAge": 86400000,
  "dryRun": true
}
```

#### Generate System Report
```http
POST /api/v1/workers/generate-report
Authorization: Bearer <token>
Content-Type: application/json

{
  "reportType": "usage",
  "dateRange": {
    "start": "2024-01-01",
    "end": "2024-01-31"
  },
  "format": "json"
}
```

#### Terminate All Workers
```http
DELETE /api/v1/workers/terminate-all
Authorization: Bearer <token>
```

## 💻 Usage Examples

### JavaScript/Node.js

#### Using the Worker Manager Directly
```javascript
const { createWorker, WORKER_TYPES, getStats } = require('./src/workers');

// Start a file processing job
const result = await createWorker(WORKER_TYPES.FILE_PROCESSOR, {
  filePath: '/path/to/file.jpg',
  operation: 'compress',
  options: { quality: 0.8 }
});

// Get worker statistics
const stats = getStats();
console.log('Active workers:', stats.activeWorkers);
```

#### File Processing Example
```javascript
// Compress a file
const compressResult = await createWorker(WORKER_TYPES.FILE_PROCESSOR, {
  filePath: '/uploads/large-image.jpg',
  operation: 'compress',
  options: {
    quality: 0.7,
    format: 'webp'
  }
});

// Extract metadata
const metadataResult = await createWorker(WORKER_TYPES.FILE_PROCESSOR, {
  filePath: '/uploads/document.pdf',
  operation: 'extract_metadata',
  options: { includeHash: true }
});
```

#### Image Optimization Example
```javascript
// Optimize an image
const optimizeResult = await createWorker(WORKER_TYPES.IMAGE_OPTIMIZER, {
  imagePath: '/uploads/photo.jpg',
  operation: 'optimize',
  options: {
    quality: 0.8,
    width: 1920,
    height: 1080,
    format: 'webp'
  }
});

// Generate responsive sizes
const responsiveResult = await createWorker(WORKER_TYPES.IMAGE_OPTIMIZER, {
  imagePath: '/uploads/hero-image.jpg',
  operation: 'responsive',
  options: {
    sizes: [320, 640, 1024, 1920],
    quality: 0.8
  }
});
```

#### Background Job Example
```javascript
// Cleanup temporary files
const cleanupResult = await createWorker(WORKER_TYPES.BACKGROUND_JOB, {
  jobType: 'cleanup_temp_files',
  jobData: {
    tempDir: 'temp',
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    dryRun: false
  }
});

// Generate a report
const reportResult = await createWorker(WORKER_TYPES.BACKGROUND_JOB, {
  jobType: 'generate_reports',
  jobData: {
    reportType: 'usage',
    dateRange: {
      start: new Date('2024-01-01'),
      end: new Date('2024-01-31')
    },
    format: 'json'
  }
});
```

### cURL Examples

#### File Processing
```bash
# Compress a file
curl -X POST http://localhost:3000/api/v1/workers/file-processor \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "filePath": "/uploads/large-file.jpg",
      "operation": "compress",
      "options": {
        "quality": 0.8
      }
    }
  }'

# Extract metadata
curl -X POST http://localhost:3000/api/v1/workers/file-processor \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "filePath": "/uploads/document.pdf",
      "operation": "extract_metadata"
    }
  }'
```

#### Image Optimization
```bash
# Optimize image
curl -X POST http://localhost:3000/api/v1/workers/image-optimizer \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "imagePath": "/uploads/photo.jpg",
      "operation": "optimize",
      "options": {
        "quality": 0.8,
        "width": 1920,
        "height": 1080
      }
    }
  }'
```

#### Background Jobs
```bash
# Cleanup temporary files
curl -X POST http://localhost:3000/api/v1/workers/cleanup \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "tempDir": "temp",
    "maxAge": 86400000,
    "dryRun": true
  }'

# Generate report
curl -X POST http://localhost:3000/api/v1/workers/generate-report \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reportType": "usage",
    "dateRange": {
      "start": "2024-01-01",
      "end": "2024-01-31"
    },
    "format": "json"
  }'
```

## 🔧 Integration with File Upload

### Enhanced Upload Process
```javascript
// After file upload, automatically process with workers
router.post('/uploads/local/single', 
  authenticateToken,
  uploadSingle('file', 'image'),
  async (req, res, next) => {
    try {
      // ... existing upload logic ...

      // Start background processing
      const processJob = await createWorker(WORKER_TYPES.FILE_PROCESSOR, {
        filePath: req.uploadedFile.path,
        operation: 'extract_metadata',
        options: { includeHash: true },
        userId: req.user.id
      });

      // If it's an image, also optimize it
      if (req.uploadedFile.mimetype.startsWith('image/')) {
        const optimizeJob = await createWorker(WORKER_TYPES.IMAGE_OPTIMIZER, {
          imagePath: req.uploadedFile.path,
          operation: 'optimize',
          options: { quality: 0.8 },
          userId: req.user.id
        });
      }

      res.status(201).json({
        message: 'File uploaded and processing started',
        file: { /* file info */ },
        processingJobs: [processJob.workerId]
      });
    } catch (error) {
      next(error);
    }
  }
);
```

## 📊 Monitoring and Debugging

### Worker Statistics
```javascript
// Get real-time worker statistics
const stats = getStats();
console.log('Worker Stats:', {
  active: stats.activeWorkers,
  max: stats.maxWorkers,
  available: stats.availableWorkers
});
```

### Error Handling
```javascript
try {
  const result = await createWorker(WORKER_TYPES.FILE_PROCESSOR, {
    filePath: '/path/to/file.jpg',
    operation: 'compress'
  });
} catch (error) {
  if (error.message === 'Maximum number of workers reached') {
    // Handle worker limit reached
    console.log('All workers busy, try again later');
  } else if (error.message === 'Worker timeout') {
    // Handle worker timeout
    console.log('Worker timed out, check system resources');
  } else {
    // Handle other errors
    console.error('Worker error:', error.message);
  }
}
```

### Logging
Workers automatically log their activities:
```
Worker 1234567890.123: Processing file /uploads/image.jpg
Worker 1234567890.123: File processing completed
Worker 1234567890.124: Optimizing image /uploads/photo.jpg
Worker 1234567890.124: Image optimization completed
```

## 🚨 Best Practices

### 1. Worker Limits
- Set appropriate `MAX_WORKERS` based on your server's CPU cores
- Monitor worker usage and adjust as needed
- Consider using a queue system for high-volume processing

### 2. Timeout Management
- Set reasonable `WORKER_TIMEOUT` values
- Implement retry logic for failed jobs
- Monitor worker completion times

### 3. Error Handling
- Always handle worker errors gracefully
- Implement fallback mechanisms
- Log worker errors for debugging

### 4. Resource Management
- Clean up temporary files regularly
- Monitor disk space usage
- Implement worker cleanup on application shutdown

### 5. Security
- Validate all worker inputs
- Limit worker access to necessary resources
- Implement proper authentication for worker endpoints

## 🔄 Future Enhancements

### Planned Features
1. **Job Queue System**: Persistent job queue with Redis
2. **Priority Queues**: Job prioritization
3. **Worker Pools**: Specialized worker pools for different tasks
4. **Progress Tracking**: Real-time job progress updates
5. **Scheduled Jobs**: Cron-like job scheduling
6. **Distributed Workers**: Multi-server worker distribution

### Integration Ideas
1. **Real-time Updates**: WebSocket integration for job status
2. **File Processing Pipeline**: Multi-step file processing workflows
3. **Image Processing**: Advanced image manipulation with Sharp
4. **Video Processing**: Video compression and format conversion
5. **Document Processing**: PDF processing and text extraction

---

**Worker threads are now fully integrated into BackForge! 🎉**

This implementation provides a robust foundation for handling CPU-intensive tasks while maintaining excellent application responsiveness. 