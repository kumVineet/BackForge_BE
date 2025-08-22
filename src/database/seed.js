const bcrypt = require('bcryptjs');
const { query, testConnection } = require('../config/database');

const seedDatabase = async () => {
  try {
    console.log('🌱 Starting database seeding...');

    // Test connection first
    const connected = await testConnection();
    if (!connected) {
      console.error('❌ Cannot connect to database. Please check your configuration.');
      process.exit(1);
    }

    // Check if users table exists
    const tableExists = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
      )
    `);

    if (!tableExists.rows[0].exists) {
      console.error('❌ Users table does not exist. Please run migration first: npm run db:migrate');
      process.exit(1);
    }

    // Check if users already exist
    const existingUsers = await query('SELECT COUNT(*) FROM users');
    if (parseInt(existingUsers.rows[0].count) > 0) {
      console.log('⚠️  Database already contains users. Skipping seeding.');
      return;
    }

    // Sample users data
    const sampleUsers = [
      {
        email: 'admin@backforge.com',
        password: 'admin123',
        name: 'Admin User',
        role: 'admin'
      },
      {
        email: 'john.doe@example.com',
        password: 'password123',
        name: 'John Doe',
        role: 'user'
      },
    ];

    console.log('📝 Creating sample users...');

    for (const userData of sampleUsers) {
      // Hash password
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(userData.password, saltRounds);

      // Insert user
      await query(
        'INSERT INTO users (email, password, name, role, created_at) VALUES ($1, $2, $3, $4, NOW())',
        [userData.email, hashedPassword, userData.name, userData.role]
      );

      console.log(`   ✅ Created user: ${userData.name} (${userData.email})`);
    }

    console.log('✅ Database seeding completed successfully!');
    console.log('📋 Created users:');
    sampleUsers.forEach(user => {
      console.log(`   - ${user.name} (${user.email}) - Password: ${user.password}`);
    });

  } catch (error) {
    console.error('❌ Seeding failed:', error.message);
    process.exit(1);
  }
};

// Run seeding if this file is executed directly
if (require.main === module) {
  seedDatabase()
    .then(() => {
      console.log('🎉 Seeding script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Seeding script failed:', error);
      process.exit(1);
    });
}

module.exports = { seedDatabase }; 