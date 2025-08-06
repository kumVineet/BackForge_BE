const { query, testConnection } = require('../config/database');

const createTables = async () => {
  try {
    console.log('🔄 Starting database migration...');

    // Test connection first
    const connected = await testConnection();
    if (!connected) {
      console.error('❌ Cannot connect to database. Please check your configuration.');
      process.exit(1);
    }

    // Create users table with roles and refresh token
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'user' CHECK (role IN ('admin', 'user')),
        refresh_token TEXT,
        refresh_token_expires_at TIMESTAMP WITH TIME ZONE,
        is_active BOOLEAN DEFAULT true,
        last_login TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    // Create index on email for faster lookups
    await query(`
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)
    `);

    // Create index on role for role-based queries
    await query(`
      CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)
    `);

    // Create updated_at trigger function
    await query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ language 'plpgsql'
    `);

    // Create trigger for users table
    await query(`
      DROP TRIGGER IF EXISTS update_users_updated_at ON users;
      CREATE TRIGGER update_users_updated_at
        BEFORE UPDATE ON users
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column()
    `);

    // Create refresh tokens table for better token management
    await query(`
      CREATE TABLE IF NOT EXISTS refresh_tokens (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        token TEXT UNIQUE NOT NULL,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        is_revoked BOOLEAN DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        created_ip VARCHAR(45),
        user_agent TEXT
      )
    `);

    // Create index on refresh tokens
    await query(`
      CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id)
    `);

    await query(`
      CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON refresh_tokens(token)
    `);

    // Create notes table
    await query(`
      CREATE TABLE IF NOT EXISTS notes (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        video_id VARCHAR(20) NOT NULL,
        video_title VARCHAR(500) NOT NULL,
        video_url TEXT NOT NULL,
        notes_content TEXT NOT NULL,
        file_path VARCHAR(500),
        file_size INTEGER,
        status VARCHAR(50) DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'failed')),
        processing_time INTEGER,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    // Create indexes for notes table
    await query(`
      CREATE INDEX IF NOT EXISTS idx_notes_user_id ON notes(user_id)
    `);

    await query(`
      CREATE INDEX IF NOT EXISTS idx_notes_video_id ON notes(video_id)
    `);

    await query(`
      CREATE INDEX IF NOT EXISTS idx_notes_status ON notes(status)
    `);

    // Create trigger for notes table
    await query(`
      DROP TRIGGER IF EXISTS update_notes_updated_at ON notes;
      CREATE TRIGGER update_notes_updated_at
        BEFORE UPDATE ON notes
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column()
    `);

    // Create file_uploads table
    await query(`
      CREATE TABLE IF NOT EXISTS file_uploads (
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
      )
    `);

    // Create indexes for file_uploads table
    await query(`
      CREATE INDEX IF NOT EXISTS idx_file_uploads_user_id ON file_uploads(user_id)
    `);

    await query(`
      CREATE INDEX IF NOT EXISTS idx_file_uploads_category ON file_uploads(category)
    `);

    await query(`
      CREATE INDEX IF NOT EXISTS idx_file_uploads_storage_type ON file_uploads(storage_type)
    `);

    await query(`
      CREATE INDEX IF NOT EXISTS idx_file_uploads_is_public ON file_uploads(is_public)
    `);

    await query(`
      CREATE INDEX IF NOT EXISTS idx_file_uploads_created_at ON file_uploads(created_at)
    `);

    // Create trigger for file_uploads table
    await query(`
      DROP TRIGGER IF EXISTS update_file_uploads_updated_at ON file_uploads;
      CREATE TRIGGER update_file_uploads_updated_at
        BEFORE UPDATE ON file_uploads
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column()
    `);

    console.log('✅ Database migration completed successfully!');
    console.log('📋 Created/Updated tables:');
    console.log('   - users (id, email, password, name, role, refresh_token, is_active, last_login, created_at, updated_at)');
    console.log('   - refresh_tokens (id, user_id, token, expires_at, is_revoked, created_at, created_ip, user_agent)');
    console.log('   - notes (id, user_id, video_id, video_title, video_url, notes_content, file_path, file_size, status, processing_time, created_at, updated_at)');
    console.log('   - file_uploads (id, user_id, original_name, filename, file_path, file_size, mime_type, category, title, description, tags, is_public, storage_type, cloud_url, cloud_key, created_at, updated_at)');
    console.log('   - Indexes on email, role, refresh tokens, notes, and file uploads');
    console.log('   - Automatic updated_at triggers');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
};

// Run migration if this file is executed directly
if (require.main === module) {
  createTables()
    .then(() => {
      console.log('🎉 Migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Migration script failed:', error);
      process.exit(1);
    });
}

module.exports = { createTables }; 