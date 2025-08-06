# BackForge Backend API

A comprehensive Node.js backend API with JWT authentication, file upload capabilities, and cloud storage integration.

## 🎯 Current Status: ALL FEATURES COMPLETED ✅

Your BackForge backend is now **fully implemented** with all weekly requirements completed:

### ✅ Week 1: JWT Authentication System (COMPLETED)
- **JWT Token Management**: Access and refresh token system
- **Secure Routes**: Protected routes with authentication middleware
- **Role-Based Authorization**: User and admin roles with permission control
- **Session Management**: View and manage active sessions
- **Token Refresh**: Automatic token refresh mechanism
- **Security**: Password hashing, rate limiting, and CORS protection

### ✅ Week 2: File Upload API (COMPLETED)
- **Local File Upload**: Single and multiple file uploads to local storage
- **File Validation**: Type, size, and format validation
- **Metadata Storage**: File information stored in PostgreSQL database
- **File Serving**: Secure file serving with access control
- **Upload Statistics**: User upload analytics and statistics

### ✅ Week 3: Cloud Storage Integration (COMPLETED)
- **AWS S3 Integration**: Upload files directly to Amazon S3
- **Cloudinary Integration**: Alternative cloud storage with image optimization
- **Hybrid Storage**: Support for both local and cloud storage
- **Automatic Cleanup**: File deletion from cloud storage
- **Public URLs**: Direct access to cloud-stored files

## 🗄️ Local Database Setup

You now have **two separate databases** on your local machine:

### Development Database
- **Name**: `backforge_dev`
- **Port**: 3000
- **Environment**: Development
- **Logging**: Debug level

### Production Database
- **Name**: `backforge_prod`
- **Port**: 8080
- **Environment**: Production
- **Logging**: Error level only

## 📋 Prerequisites

- Node.js >= 18.0.0
- PostgreSQL >= 12.0
- npm or yarn

## 🛠️ Installation & Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd BackForge_BE
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up local databases**
   ```bash
   # Create development database
   createdb backforge_dev
   
   # Create production database
   createdb backforge_prod
   ```

4. **Run database migrations**
   ```bash
   # Migrate development database
   npm run db:migrate:dev
   
   # Migrate production database
   npm run db:migrate:prod
   ```

5. **Start the server**
   ```bash
   # Development mode
   npm run dev
   
   # Production mode
   npm start
   ```

## 🚀 Quick Start Commands

### Environment Management
```bash
# Switch to development environment
npm run env:dev

# Switch to production environment
npm run env:prod

# Or use the script directly
./scripts/switch-env.sh development
./scripts/switch-env.sh production
```

### Database Operations
```bash
# Run migrations for current environment
npm run db:migrate

# Run migrations for specific environment
npm run db:migrate:dev
npm run db:migrate:prod

# Seed database (if you have seed data)
npm run db:seed:dev
npm run db:seed:prod
```

### Server Management
```bash
# Development mode (with auto-reload)
npm run dev

# Production mode
npm start

# Start specific environment
npm run dev:start
npm run prod:start
```

## 🔧 Configuration

### Environment Variables

#### Required Configuration
```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=backforge_dev
DB_USER=your_username
DB_PASSWORD=your_password

# JWT
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=30d

# API
API_PREFIX=/api/v1
CORS_ORIGIN=http://localhost:3000
```

#### Optional Cloud Storage Configuration

**AWS S3:**
```env
STORAGE_TYPE=s3
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_REGION=us-east-1
AWS_S3_BUCKET=your-bucket-name
```

**Cloudinary:**
```env
STORAGE_TYPE=cloudinary
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

### Environment Files

#### `.env.development`
```env
NODE_ENV=development
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=backforge_dev
DB_USER=apple
DB_PASSWORD=
DB_SSL=false
STORAGE_TYPE=local
```

#### `.env.production`
```env
NODE_ENV=production
PORT=8080
DB_HOST=localhost
DB_PORT=5432
DB_NAME=backforge_prod
DB_USER=apple
DB_PASSWORD=
DB_SSL=false
STORAGE_TYPE=local
```

## 🔧 Database Management

### Check Database Status
```bash
# List all databases
psql -l

# Connect to development database
psql -d backforge_dev

# Connect to production database
psql -d backforge_prod

# View tables in current database
\dt

# View table structure
\d table_name
```

### Reset Databases (if needed)
```bash
# Drop and recreate development database
dropdb backforge_dev
createdb backforge_dev
npm run db:migrate:dev

# Drop and recreate production database
dropdb backforge_prod
createdb backforge_prod
npm run db:migrate:prod
```

## 📚 API Documentation

### Authentication Endpoints

#### Register User
```http
POST /api/v1/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe",
  "role": "user"
}
```

#### Login
```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

#### Refresh Token
```http
POST /api/v1/auth/refresh
Content-Type: application/json

{
  "refreshToken": "your-refresh-token"
}
```

#### Logout
```http
POST /api/v1/auth/logout
Authorization: Bearer your-access-token
Content-Type: application/json

{
  "refreshToken": "your-refresh-token"
}
```

### File Upload Endpoints

#### Upload Single File (Local)
```http
POST /api/v1/uploads/local/single
Authorization: Bearer your-access-token
Content-Type: multipart/form-data

file: [file]
title: "My Image"
description: "A beautiful image"
category: "image"
tags: ["nature", "landscape"]
isPublic: false
```

#### Upload Multiple Files (Local)
```http
POST /api/v1/uploads/local/multiple
Authorization: Bearer your-access-token
Content-Type: multipart/form-data

files: [file1, file2, file3]
title: "My Images"
description: "Multiple beautiful images"
category: "image"
tags: ["nature", "landscape"]
isPublic: false
```

#### Upload to Cloud Storage
```http
POST /api/v1/uploads/cloud/single
Authorization: Bearer your-access-token
Content-Type: multipart/form-data

file: [file]
title: "Cloud Image"
description: "Image stored in cloud"
category: "image"
folder: "uploads"
isPublic: true
```

#### Get User's Files
```http
GET /api/v1/uploads/my-files?page=1&limit=20&category=image&search=landscape
Authorization: Bearer your-access-token
```

#### Get File by ID
```http
GET /api/v1/uploads/file/123
Authorization: Bearer your-access-token
```

#### Serve Local File
```http
GET /api/v1/uploads/serve/123
Authorization: Bearer your-access-token
```

#### Update File Metadata
```http
PUT /api/v1/uploads/file/123
Authorization: Bearer your-access-token
Content-Type: application/json

{
  "title": "Updated Title",
  "description": "Updated description",
  "tags": ["updated", "tags"],
  "isPublic": true
}
```

#### Delete File
```http
DELETE /api/v1/uploads/file/123
Authorization: Bearer your-access-token
```

#### Get Upload Statistics
```http
GET /api/v1/uploads/stats
Authorization: Bearer your-access-token
```

## 🧪 Testing Your Setup

### 1. Test Development Environment
```bash
# Switch to development
npm run env:dev

# Start development server
npm run dev

# Test endpoints
curl http://localhost:3000/health
curl http://localhost:3000/api/v1
```

### 2. Test Production Environment
```bash
# Switch to production
npm run env:prod

# Start production server
npm run prod:start

# Test endpoints
curl http://localhost:8080/health
curl http://localhost:8080/api/v1
```

## 📊 API Endpoints Available

### Authentication
- `POST /api/v1/auth/register` - Register user
- `POST /api/v1/auth/login` - Login user
- `POST /api/v1/auth/refresh` - Refresh token
- `POST /api/v1/auth/logout` - Logout
- `GET /api/v1/auth/verify` - Verify token

### File Uploads
- `POST /api/v1/uploads/local/single` - Upload single file (local)
- `POST /api/v1/uploads/local/multiple` - Upload multiple files (local)
- `POST /api/v1/uploads/cloud/single` - Upload to cloud storage
- `GET /api/v1/uploads/my-files` - Get user's files
- `GET /api/v1/uploads/file/:id` - Get file by ID
- `GET /api/v1/uploads/serve/:id` - Serve local file
- `PUT /api/v1/uploads/file/:id` - Update file metadata
- `DELETE /api/v1/uploads/file/:id` - Delete file
- `GET /api/v1/uploads/stats` - Get upload statistics

### Users
- `GET /api/v1/users/profile` - Get user profile
- `PUT /api/v1/users/profile` - Update profile
- `GET /api/v1/users` - Get all users (admin)

## 🗄️ Database Schema

### Users Table
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Refresh Tokens Table
```sql
CREATE TABLE refresh_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  is_revoked BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_ip VARCHAR(45),
  user_agent TEXT
);
```

### File Uploads Table
```sql
CREATE TABLE file_uploads (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  original_name VARCHAR(255) NOT NULL,
  filename VARCHAR(255),
  file_path TEXT,
  file_size BIGINT NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  category VARCHAR(50) DEFAULT 'image' CHECK (category IN ('image', 'document', 'video', 'audio')),
  title VARCHAR(255),
  description TEXT,
  tags JSONB,
  is_public BOOLEAN DEFAULT false,
  storage_type VARCHAR(20) DEFAULT 'local' CHECK (storage_type IN ('local', 's3', 'cloudinary')),
  cloud_url TEXT,
  cloud_key VARCHAR(500),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## 🔒 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: bcryptjs for password security
- **Rate Limiting**: Express rate limiting middleware
- **CORS Protection**: Configurable CORS settings
- **Input Validation**: Express-validator for request validation
- **File Type Validation**: Strict file type and size limits
- **Access Control**: Role-based authorization
- **Session Management**: Secure session handling

## 📁 File Storage Options

### Local Storage
- Files stored in local filesystem
- Organized by category (image, document, video, audio)
- Automatic directory creation
- File serving with access control

### AWS S3
- Direct upload to Amazon S3
- Public URL generation
- Automatic file deletion
- Metadata storage

### Cloudinary
- Image optimization and transformation
- Multiple format support
- CDN delivery
- Automatic file management

## 🔄 Switching Between Environments

### Quick Switch
```bash
# Development
npm run env:dev && npm run dev

# Production
npm run env:prod && npm run prod:start
```

### Manual Switch
```bash
# Set environment variable
export NODE_ENV=development  # or production

# Start server
npm run dev  # or npm start
```

## 🚀 Deployment

### Development
```bash
npm run dev
```

### Production
```bash
npm start
```

### Docker (Optional)
```bash
# Build image
docker build -t backforge-be .

# Run container
docker run -p 3000:3000 backforge-be
```

## 📊 Monitoring & Logging

- **Morgan**: HTTP request logging
- **Error Handling**: Comprehensive error management
- **Health Check**: `/health` endpoint for monitoring
- **Database Connection**: Connection pool management
- **File Upload Tracking**: Upload statistics and analytics

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch
```

## 📝 Scripts

```bash
# Development
npm run dev          # Start development server
npm run dev:start    # Start development without nodemon
npm run lint         # Run ESLint
npm run lint:fix     # Fix ESLint issues

# Production
npm start            # Start production server
npm run prod:start   # Start production explicitly

# Database
npm run db:migrate   # Run database migrations
npm run db:migrate:dev   # Migrate development DB
npm run db:migrate:prod  # Migrate production DB
npm run db:seed      # Seed database with test data
npm run db:seed:dev  # Seed development DB
npm run db:seed:prod # Seed production DB

# Environment
npm run env:dev      # Switch to development
npm run env:prod     # Switch to production
```

## 🚨 Important Notes

1. **Environment Files**: Both `.env.development` and `.env.production` are configured for local databases
2. **Database Separation**: Development and production use separate databases
3. **File Storage**: Currently set to local storage for development
4. **Security**: JWT secrets are different for each environment
5. **Ports**: Development (3000), Production (8080)

## 📈 Next Steps

1. **Test File Uploads**: Try uploading files using the API endpoints
2. **Configure Cloud Storage**: Add AWS S3 or Cloudinary credentials when ready
3. **Add Seed Data**: Create seed data for testing
4. **Frontend Integration**: Connect your frontend to these endpoints
5. **Deployment**: When ready, update production environment for remote deployment

## 🆘 Troubleshooting

### Database Connection Issues
```bash
# Check if PostgreSQL is running
brew services list | grep postgresql

# Start PostgreSQL if needed
brew services start postgresql

# Check database exists
psql -l | grep backforge
```

### Environment Issues
```bash
# Check environment variables
NODE_ENV=development node -e "console.log(process.env.DB_NAME)"

# Verify environment files exist
ls -la .env.*
```

### Port Issues
```bash
# Check if ports are in use
lsof -i :3000
lsof -i :8080

# Kill process if needed
kill -9 <PID>
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions, please open an issue in the repository.

---

**BackForge Backend API** - A robust, scalable backend solution with comprehensive file management capabilities.

**Your BackForge backend is now complete and ready for development! 🎉** 