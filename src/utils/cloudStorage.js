const AWS = require('aws-sdk');
const cloudinary = require('cloudinary').v2;
const { Readable } = require('stream');
const { config } = require('../config/app');
const { ValidationError, DatabaseError } = require('./errors');

// AWS S3 Configuration
const configureS3 = () => {
  if (!config.aws) {
    throw new ValidationError('AWS configuration not found');
  }

  return new AWS.S3({
    accessKeyId: config.aws.accessKeyId,
    secretAccessKey: config.aws.secretAccessKey,
    region: config.aws.region,
    signatureVersion: 'v4'
  });
};

// Cloudinary Configuration
const configureCloudinary = () => {
  if (!config.cloudinary) {
    throw new ValidationError('Cloudinary configuration not found');
  }

  cloudinary.config({
    cloud_name: config.cloudinary.cloudName,
    api_key: config.cloudinary.apiKey,
    api_secret: config.cloudinary.apiSecret
  });

  return cloudinary;
};

// AWS S3 Upload
const uploadToS3 = async (file, folder = 'uploads', options = {}) => {
  try {
    const s3 = configureS3();
    
    const {
      originalname,
      buffer,
      mimetype,
      size
    } = file;

    // Generate unique filename
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const extension = originalname.split('.').pop();
    const filename = `${folder}/${timestamp}-${randomString}.${extension}`;

    const uploadParams = {
      Bucket: config.aws.bucketName,
      Key: filename,
      Body: buffer,
      ContentType: mimetype,
      ACL: 'public-read',
      Metadata: {
        originalName: originalname,
        fileSize: size.toString(),
        uploadedAt: new Date().toISOString()
      },
      ...options
    };

    const result = await s3.upload(uploadParams).promise();

    return {
      url: result.Location,
      key: result.Key,
      bucket: result.Bucket,
      etag: result.ETag,
      size: size,
      mimetype: mimetype,
      originalname: originalname,
      storage: 's3'
    };
  } catch (error) {
    console.error('S3 upload error:', error);
    throw new DatabaseError(`Failed to upload file to S3: ${error.message}`);
  }
};

// AWS S3 Delete
const deleteFromS3 = async (key) => {
  try {
    const s3 = configureS3();
    
    const deleteParams = {
      Bucket: config.aws.bucketName,
      Key: key
    };

    await s3.deleteObject(deleteParams).promise();
    
    return { success: true, message: 'File deleted from S3 successfully' };
  } catch (error) {
    console.error('S3 delete error:', error);
    throw new DatabaseError(`Failed to delete file from S3: ${error.message}`);
  }
};

// Cloudinary Upload
const uploadToCloudinary = async (file, folder = 'uploads', options = {}) => {
  try {
    const cloudinaryInstance = configureCloudinary();
    
    const {
      originalname,
      buffer,
      mimetype,
      size
    } = file;

    // Generate unique filename
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const extension = originalname.split('.').pop();
    const filename = `${folder}/${timestamp}-${randomString}`;

    // Convert buffer to stream
    const stream = Readable.from(buffer);

    const uploadOptions = {
      resource_type: 'auto',
      folder: folder,
      public_id: filename,
      overwrite: false,
      invalidate: true,
      ...options
    };

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinaryInstance.uploader.upload_stream(
        uploadOptions,
        (error, result) => {
          if (error) {
            console.error('Cloudinary upload error:', error);
            reject(new DatabaseError(`Failed to upload file to Cloudinary: ${error.message}`));
          } else {
            resolve({
              url: result.secure_url,
              publicId: result.public_id,
              assetId: result.asset_id,
              size: size,
              mimetype: mimetype,
              originalname: originalname,
              storage: 'cloudinary',
              format: result.format,
              width: result.width,
              height: result.height
            });
          }
        }
      );

      stream.pipe(uploadStream);
    });
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw new DatabaseError(`Failed to upload file to Cloudinary: ${error.message}`);
  }
};

// Cloudinary Delete
const deleteFromCloudinary = async (publicId) => {
  try {
    const cloudinaryInstance = configureCloudinary();
    
    const result = await cloudinaryInstance.uploader.destroy(publicId);
    
    if (result.result === 'ok') {
      return { success: true, message: 'File deleted from Cloudinary successfully' };
    } else {
      throw new DatabaseError(`Failed to delete file from Cloudinary: ${result.result}`);
    }
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    throw new DatabaseError(`Failed to delete file from Cloudinary: ${error.message}`);
  }
};

// Get file info from URL
const getFileInfo = (url) => {
  try {
    const urlObj = new URL(url);
    
    if (urlObj.hostname.includes('amazonaws.com')) {
      // S3 URL
      const pathParts = urlObj.pathname.split('/');
      const key = pathParts.slice(1).join('/');
      return {
        storage: 's3',
        key: key,
        bucket: urlObj.hostname.split('.')[0]
      };
    } else if (urlObj.hostname.includes('cloudinary.com')) {
      // Cloudinary URL
      const pathParts = urlObj.pathname.split('/');
      const publicId = pathParts.slice(-1)[0].split('.')[0];
      return {
        storage: 'cloudinary',
        publicId: publicId
      };
    } else {
      return {
        storage: 'local',
        path: urlObj.pathname
      };
    }
  } catch (error) {
    throw new ValidationError('Invalid file URL');
  }
};

// Upload to configured cloud storage
const uploadToCloud = async (file, folder = 'uploads', options = {}) => {
  const storageType = config.storageType || 'local';
  
  switch (storageType) {
    case 's3':
      return await uploadToS3(file, folder, options);
    case 'cloudinary':
      return await uploadToCloudinary(file, folder, options);
    default:
      throw new ValidationError(`Unsupported storage type: ${storageType}`);
  }
};

// Delete from configured cloud storage
const deleteFromCloud = async (url) => {
  const fileInfo = getFileInfo(url);
  
  switch (fileInfo.storage) {
    case 's3':
      return await deleteFromS3(fileInfo.key);
    case 'cloudinary':
      return await deleteFromCloudinary(fileInfo.publicId);
    default:
      throw new ValidationError(`Unsupported storage type: ${fileInfo.storage}`);
  }
};

module.exports = {
  uploadToS3,
  deleteFromS3,
  uploadToCloudinary,
  deleteFromCloudinary,
  uploadToCloud,
  deleteFromCloud,
  getFileInfo,
  configureS3,
  configureCloudinary
}; 