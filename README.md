# BackForge Backend API 🚀

A robust, enterprise-grade Node.js backend API built with modern architecture principles, featuring JWT authentication, secure file management, cloud storage integration, and comprehensive database management.

## 🎯 Project Overview

**BackForge** is a full-featured backend API designed for modern web applications. It provides a solid foundation for building scalable applications with enterprise-grade security, file management, and user authentication.

### ✨ Key Features

- **🔐 JWT Authentication System** - Secure token-based authentication with refresh tokens
- **📁 Advanced File Management** - Local and cloud storage with presigned URLs
- **🗄️ PostgreSQL Database** - Robust data persistence with migrations
- **☁️ Cloud Storage Integration** - AWS S3 and Cloudinary support
- **🛡️ Security First** - Rate limiting, CORS, input validation, and role-based access
- **🏗️ OOP Architecture** - Clean, maintainable code with dependency injection
- **📊 File Analytics** - Upload statistics and user management
- **🔄 Environment Management** - Separate development and production configurations

### 🏗️ Architecture

```
BackForge Backend
├── 📁 Core Layer
│   ├── BaseService & BaseRepository
│   ├── Interface definitions
│   └── Dependency injection container
├── 🔐 Authentication Layer
│   ├── JWT token management
│   ├── Role-based authorization
│   └── Session management
├── 📁 File Management Layer
│   ├── Local storage
│   ├── Cloud storage (S3/Cloudinary)
│   └── Presigned URL generation
├── 🗄️ Data Layer
│   ├── PostgreSQL database
│   ├── Repository pattern
│   └── Migration system
└── 🚀 API Layer
    ├── RESTful endpoints
    ├── Middleware stack
    └── Error handling
```

## 🚀 Quick Start for New Users (Mac)

### Prerequisites

Before you begin, ensure you have the following installed on your Mac:

- **Node.js** (v18.0.0 or higher)
- **PostgreSQL** (v12.0 or higher)
- **Git** (for cloning the repository)
- **Homebrew** (for easy installation)

### Step 1: Install Required Software

#### Install Node.js
```bash
# Using Homebrew (recommended)
brew install node

# Verify installation
node --version
npm --version
```

#### Install PostgreSQL
```bash
# Using Homebrew
brew install postgresql

# Start PostgreSQL service
brew services start postgresql

# Verify installation
psql --version
```

#### Install Git (if not already installed)
```bash
# Using Homebrew
brew install git

# Verify installation
git --version
```

### Step 2: Clone and Setup Project

```bash
# Clone the repository
git clone <your-repository-url>
cd BackForge_BE

# Install project dependencies
npm install

# Verify setup
npm run env:dev
```

### Step 3: Database Setup

```bash
# Create development database
createdb backforge_dev

# Create production database
createdb backforge_prod

# Run database migrations
npm run db:migrate:dev
npm run db:migrate:prod

# Verify databases
psql -l | grep backforge
```

### Step 4: Environment Configuration

#### Create Environment Files

**`.env.development`** (for development):
```env
NODE_ENV=development
PORT=4041
API_PREFIX=/api/v1
CORS_ORIGIN=http://localhost:3000

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=backforge_dev
DB_USER=your_mac_username
DB_PASSWORD=
DB_SSL=false

# JWT Configuration
JWT_SECRET=your-super-secret-dev-jwt-key-here
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d
JWT_REFRESH_THRESHOLD=5

# File Storage
STORAGE_TYPE=local
UPLOAD_DIR=uploads

# AWS S3 (Optional - for cloud storage)
DEV_AWS_ACCESS_KEY_ID=your_aws_access_key
DEV_AWS_SECRET_ACCESS_KEY=your_aws_secret_key
DEV_AWS_REGION=eu-north-1
DEV_S3_BUCKET=your_bucket_name

# Logging
LOG_LEVEL=debug
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

**`.env.production`** (for production):
```env
NODE_ENV=production
PORT=4040
API_PREFIX=/api/v1
CORS_ORIGIN=http://localhost:3000

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=backforge_prod
DB_USER=your_mac_username
DB_PASSWORD=
DB_SSL=false

# JWT Configuration
JWT_SECRET=your-super-secret-prod-jwt-key-here
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d
JWT_REFRESH_THRESHOLD=5

# File Storage
STORAGE_TYPE=local
UPLOAD_DIR=uploads

# AWS S3 (Optional - for cloud storage)
PRODUCTION_AWS_ACCESS_KEY_ID=your_aws_access_key
PRODUCTION_AWS_SECRET_ACCESS_KEY=your_aws_secret_key
PRODUCTION_AWS_REGION=eu-north-1
PRODUCTION_S3_BUCKET=your_bucket_name

# Logging
LOG_LEVEL=error
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### Step 5: Start the Application

```bash
# Switch to development environment
npm run env:dev

# Start development server
npm run dev

# Your API will be available at:
# http://localhost:4041
```

### Step 6: Test Your Setup

```bash
# Test health endpoint
curl http://localhost:4041/health

# Test API base endpoint
curl http://localhost:4041/api/v1

# Check server logs for any errors
```

## 🔧 Environment Management

### Switching Between Environments

```bash
# Development
npm run env:dev

# Production
npm run env:prod

# Or use the script directly
./scripts/switch-env.sh development
./scripts/switch-env.sh production
```

### Environment Variables Explained

| Variable | Description | Example |
|----------|-------------|---------|
| `NODE_ENV` | Application environment | `development` or `production` |
| `PORT` | Server port | `4041` (dev) or `4040` (prod) |
| `DB_HOST` | Database host | `localhost` |
| `DB_NAME` | Database name | `backforge_dev` or `backforge_prod` |
| `JWT_SECRET` | JWT signing secret | `your-secret-key` |
| `STORAGE_TYPE` | File storage type | `local`, `s3`, or `cloudinary` |

## 🗄️ Database Management

### Database Operations

```bash
# Connect to development database
psql -d backforge_dev

# Connect to production database
psql -d backforge_prod

# List all databases
psql -l

# View tables in current database
\dt

# View table structure
\d table_name

# View table data
SELECT * FROM users LIMIT 5;
```

### Database Schema

#### Users Table
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  mobile_number VARCHAR(20) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  refresh_token TEXT,
  refresh_token_expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### File Uploads Table
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
  cloud_key VARCHAR(500),
  file_hash VARCHAR(64),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Database Commands

```bash
# Run migrations
npm run db:migrate:dev    # Development database
npm run db:migrate:prod   # Production database

# Reset databases (if needed)
dropdb backforge_dev && createdb backforge_dev
npm run db:migrate:dev

dropdb backforge_prod && createdb backforge_prod
npm run db:migrate:prod
```

## 📁 File Management System

### Storage Types

#### Local Storage
- Files stored in local filesystem
- Organized by category and user
- Automatic directory creation
- Secure file serving

#### Cloud Storage (AWS S3)
- Direct upload to Amazon S3
- Presigned URLs for secure access
- Automatic file deletion
- Metadata storage

#### Cloud Storage (Cloudinary)
- Image optimization and transformation
- Multiple format support
- CDN delivery
- Automatic file management

### File Upload Flow

```
1. User uploads file → 2. File validation → 3. Storage (local/cloud) → 4. Metadata storage → 5. Return file info
```

### Presigned URLs

The system generates secure, temporary URLs for file access:
- **Security**: URLs expire after 1 hour
- **Access Control**: Only authenticated users can generate URLs
- **Preview & Download**: Same URL works for both purposes

## 🔐 Authentication System

### JWT Token Flow

```
Login → Access Token (15min) + Refresh Token (7 days) → Use Access Token → Refresh when needed
```

### User Roles

- **User**: Can upload, manage own files, view public files
- **Admin**: Full access to all files and user management

### Security Features

- Password hashing with bcrypt
- Rate limiting (100 requests per 15 minutes)
- CORS protection
- Input validation
- Role-based access control

## 🚀 API Endpoints

### Authentication
```http
POST /api/v1/auth/register    # Register new user
POST /api/v1/auth/login       # User login
POST /api/v1/auth/refresh     # Refresh access token
POST /api/v1/auth/logout      # User logout
GET  /api/v1/auth/verify      # Verify token validity
```

### File Management
```http
GET  /api/v1/uploads/my-files           # Get user's files with presigned URLs
GET  /api/v1/uploads/files/:id          # Get specific file with presigned URL
GET  /api/v1/uploads/search             # Search files with presigned URLs
POST /api/v1/uploads/store-metadata     # Store file metadata after S3 upload
```

### User Management
```http
GET  /api/v1/users/profile              # Get user profile
PUT  /api/v1/users/profile              # Update user profile
GET  /api/v1/users                      # Get all users (admin only)
```

## 🛠️ Development Workflow

### Starting Development

```bash
# 1. Switch to development environment
npm run env:dev

# 2. Start development server
npm run dev

# 3. Server runs on http://localhost:4041
# 4. Auto-reload on file changes
```

### Code Structure

```
src/
├── config/           # Configuration files
├── core/            # Base classes and interfaces
├── database/        # Database migrations and seeds
├── middleware/      # Express middleware
├── repositories/    # Data access layer
├── routes/          # API route definitions
├── services/        # Business logic layer
├── utils/           # Utility functions
└── server.js        # Main application entry point
```

### Adding New Features

1. **Create Service**: Extend `BaseService` class
2. **Create Repository**: Extend `BaseRepository` class
3. **Register in Container**: Add to dependency injection
4. **Create Routes**: Define API endpoints
5. **Add Validation**: Input validation middleware

## 🧪 Testing

### Manual Testing

```bash
# Test authentication
curl -X POST http://localhost:4041/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","name":"Test User"}'

# Test file upload (after authentication)
curl -X GET http://localhost:4041/api/v1/uploads/my-files \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Automated Testing

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm test -- --grep "auth"
```

## 📊 Monitoring & Logging

### Log Levels

- **Development**: `debug` - Detailed logging for development
- **Production**: `error` - Only error logging for performance

### Health Checks

```bash
# Health endpoint
GET /health

# API status
GET /api/v1
```

### Performance Monitoring

- Database connection pooling
- File upload progress tracking
- Request/response logging
- Error tracking and reporting

## 🚨 Troubleshooting

### Common Issues

#### Database Connection Failed
```bash
# Check if PostgreSQL is running
brew services list | grep postgresql

# Start PostgreSQL if needed
brew services start postgresql

# Check database exists
psql -l | grep backforge
```

#### Port Already in Use
```bash
# Check what's using the port
lsof -i :4041

# Kill the process if needed
kill -9 <PID>
```

#### Environment Variables Not Loading
```bash
# Check environment files exist
ls -la .env.*

# Verify environment is set
echo $NODE_ENV

# Check specific variables
node -e "console.log(process.env.DB_NAME)"
```

#### File Upload Issues
```bash
# Check upload directory permissions
ls -la uploads/

# Create upload directory if missing
mkdir -p uploads

# Check file permissions
chmod 755 uploads/
```

### Getting Help

1. **Check Logs**: Look at console output for error messages
2. **Verify Environment**: Ensure `.env.development` exists and is correct
3. **Database Status**: Verify PostgreSQL is running and databases exist
4. **Dependencies**: Ensure all npm packages are installed
5. **File Permissions**: Check directory and file permissions

## 🔄 Deployment

### Local Production Testing

```bash
# Switch to production environment
npm run env:prod

# Start production server
npm start

# Server runs on http://localhost:4040
```

### Production Deployment

1. **Environment Setup**: Configure production environment variables
2. **Database**: Set up production PostgreSQL instance
3. **File Storage**: Configure S3 or Cloudinary for production
4. **Security**: Update JWT secrets and CORS origins
5. **Process Management**: Use PM2 or similar for process management

## 📚 Additional Resources

### Documentation
- [Node.js Documentation](https://nodejs.org/docs/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Express.js Documentation](https://expressjs.com/)
- [JWT.io](https://jwt.io/) - JWT token debugging

### Tools
- [Postman](https://www.postman.com/) - API testing
- [pgAdmin](https://www.pgadmin.org/) - PostgreSQL GUI
- [DBeaver](https://dbeaver.io/) - Universal database tool

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Issues**: Open an issue in the repository
- **Documentation**: Check this README and code comments
- **Community**: Reach out to the development team

---

## 🎉 Welcome to BackForge!

You're now ready to build amazing applications with a robust, secure, and scalable backend API. The system is designed to grow with your needs, from simple file uploads to complex enterprise applications.

**Happy coding! 🚀**

---

**BackForge Backend API** - Built with ❤️ for modern web development 