const { query, testConnection } = require('../config/database');

const addMobileNumberColumn = async () => {
  try {
    console.log('🔄 Adding mobile_number column to users table...');

    // Test connection first
    const connected = await testConnection();
    if (!connected) {
      console.error('❌ Cannot connect to database. Please check your configuration.');
      process.exit(1);
    }

    // Check if mobile_number column already exists
    const columnExists = await query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'mobile_number'
    `);

    if (columnExists.rows.length > 0) {
      console.log('✅ mobile_number column already exists');
      return;
    }

    // Add mobile_number column
    await query(`
      ALTER TABLE users 
      ADD COLUMN mobile_number VARCHAR(20) UNIQUE
    `);

    // Create index on mobile number
    await query(`
      CREATE INDEX IF NOT EXISTS idx_users_mobile_number ON users(mobile_number)
    `);

    console.log('✅ mobile_number column added successfully!');
    console.log('📋 Added:');
    console.log('   - mobile_number VARCHAR(20) UNIQUE column to users table');
    console.log('   - Index on mobile_number for faster lookups');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
};

// Run migration if this file is executed directly
if (require.main === module) {
  addMobileNumberColumn()
    .then(() => {
      console.log('🎉 Migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Migration script failed:', error);
      process.exit(1);
    });
}

module.exports = { addMobileNumberColumn };
