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
        role: 'admin',
        mobile_number: '+1234567890'
      },
      {
        email: 'john.doe@example.com',
        password: 'password123',
        name: 'John Doe',
        role: 'user',
        mobile_number: '+1234567891'
      },
      {
        email: 'sarah.designs@example.com',
        password: 'password123',
        name: 'Sarah Johnson',
        role: 'user',
        mobile_number: '+1234567892'
      },
      {
        email: 'mike.ops@example.com',
        password: 'password123',
        name: 'Mike Chen',
        role: 'user',
        mobile_number: '+1234567893'
      }
    ];

    console.log('📝 Creating sample users...');

    for (const userData of sampleUsers) {
      // Hash password
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(userData.password, saltRounds);

      // Insert user
      await query(
        'INSERT INTO users (email, mobile_number, password, name, role, created_at) VALUES ($1, $2, $3, $4, $5, NOW())',
        [userData.email, userData.mobile_number, hashedPassword, userData.name, userData.role]
      );

      console.log(`   ✅ Created user: ${userData.name} (${userData.email})`);
    }

    // Check if profiles table exists
    const profilesTableExists = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles'
      )
    `);

    if (profilesTableExists.rows[0].exists) {
      console.log('📝 Creating sample profiles...');
      
      // Sample profile data
      const sampleProfiles = [
        {
          user_id: 1,
          bio: 'Full-stack developer passionate about creating innovative web applications. Love working with Node.js, React, and PostgreSQL.',
          date_of_birth: '1990-05-15',
          gender: 'male',
          location: 'San Francisco, CA',
          website: 'https://johndoe.dev',
          social_links: {
            github: 'https://github.com/johndoe',
            linkedin: 'https://linkedin.com/in/johndoe',
            twitter: 'https://twitter.com/johndoe'
          },
          preferences: {
            theme: 'dark',
            notifications: true,
            privacy: 'public'
          },
          skills: ['JavaScript', 'Node.js', 'React', 'PostgreSQL', 'AWS', 'Docker'],
          interests: ['Web Development', 'Open Source', 'Machine Learning', 'Photography'],
          occupation: 'Senior Software Engineer',
          company: 'TechCorp Inc.',
          education: {
            degree: 'Bachelor of Science in Computer Science',
            institution: 'Stanford University',
            year: 2012
          },
          experience: [
            {
              title: 'Senior Software Engineer',
              company: 'TechCorp Inc.',
              duration: '2020 - Present',
              description: 'Leading development of scalable web applications'
            },
            {
              title: 'Software Engineer',
              company: 'StartupXYZ',
              duration: '2015 - 2020',
              description: 'Built and maintained multiple web applications'
            }
          ],
          achievements: [
            'Led team of 5 developers to deliver project 2 weeks early',
            'Reduced application load time by 40%',
            'Mentored 3 junior developers'
          ],
          contact_info: {
            phone: '+1-555-0123',
            email: 'john.doe@email.com',
            address: '123 Tech Street, San Francisco, CA 94102'
          },
          privacy_settings: {
            profile_visibility: 'public',
            contact_visibility: 'friends',
            location_visibility: 'public'
          }
        },
        {
          user_id: 2,
          bio: 'UX/UI Designer with 8+ years of experience creating beautiful and functional user interfaces. Passionate about user-centered design.',
          date_of_birth: '1988-12-03',
          gender: 'female',
          location: 'New York, NY',
          website: 'https://sarahdesigns.com',
          social_links: {
            behance: 'https://behance.net/sarahdesigns',
            dribbble: 'https://dribbble.com/sarahdesigns',
            linkedin: 'https://linkedin.com/in/sarahdesigns'
          },
          preferences: {
            theme: 'light',
            notifications: false,
            privacy: 'friends'
          },
          skills: ['Figma', 'Sketch', 'Adobe Creative Suite', 'User Research', 'Prototyping', 'Design Systems'],
          interests: ['User Experience', 'Design Systems', 'Accessibility', 'Art', 'Travel'],
          occupation: 'Senior UX Designer',
          company: 'DesignStudio Pro',
          education: {
            degree: 'Master of Fine Arts in Design',
            institution: 'Parsons School of Design',
            year: 2015
          },
          experience: [
            {
              title: 'Senior UX Designer',
              company: 'DesignStudio Pro',
              duration: '2018 - Present',
              description: 'Leading design projects for major clients'
            },
            {
              title: 'UX Designer',
              company: 'Creative Agency',
              duration: '2015 - 2018',
              description: 'Designed user interfaces for web and mobile apps'
            }
          ],
          achievements: [
            'Designed award-winning mobile app with 1M+ downloads',
            'Improved user engagement by 60% through UX improvements',
            'Created comprehensive design system used by 20+ designers'
          ],
          contact_info: {
            phone: '+1-555-0456',
            email: 'sarah.designs@email.com',
            address: '456 Design Avenue, New York, NY 10001'
          },
          privacy_settings: {
            profile_visibility: 'friends',
            contact_visibility: 'friends',
            location_visibility: 'friends'
          }
        },
        {
          user_id: 3,
          bio: 'DevOps engineer specializing in cloud infrastructure and automation. Love working with AWS, Kubernetes, and CI/CD pipelines.',
          date_of_birth: '1992-08-22',
          gender: 'male',
          location: 'Austin, TX',
          website: 'https://mikeops.dev',
          social_links: {
            github: 'https://github.com/mikeops',
            linkedin: 'https://linkedin.com/in/mikeops',
            twitter: 'https://twitter.com/mikeops'
          },
          preferences: {
            theme: 'dark',
            notifications: true,
            privacy: 'public'
          },
          skills: ['AWS', 'Kubernetes', 'Docker', 'Terraform', 'Jenkins', 'Python', 'Bash'],
          interests: ['Cloud Computing', 'Automation', 'Infrastructure as Code', 'Gaming', 'Hiking'],
          occupation: 'DevOps Engineer',
          company: 'CloudTech Solutions',
          education: {
            degree: 'Bachelor of Engineering in Computer Science',
            institution: 'University of Texas',
            year: 2014
          },
          experience: [
            {
              title: 'DevOps Engineer',
              company: 'CloudTech Solutions',
              duration: '2019 - Present',
              description: 'Managing cloud infrastructure and CI/CD pipelines'
            },
            {
              title: 'System Administrator',
              company: 'Tech Startup',
              duration: '2014 - 2019',
              description: 'Managed on-premise infrastructure and deployments'
            }
          ],
          achievements: [
            'Reduced deployment time from 2 hours to 15 minutes',
            'Implemented infrastructure as code reducing manual work by 80%',
            'Achieved 99.9% uptime for critical services'
          ],
          contact_info: {
            phone: '+1-555-0789',
            email: 'mike.ops@email.com',
            address: '789 Cloud Street, Austin, TX 73301'
          },
          privacy_settings: {
            profile_visibility: 'public',
            contact_visibility: 'public',
            location_visibility: 'public'
          }
        }
      ];

      // Insert sample profiles
      for (const profile of sampleProfiles) {
        try {
          // Check if profile already exists
          const existingProfile = await query(
            'SELECT id FROM profiles WHERE user_id = $1',
            [profile.user_id]
          );

          if (existingProfile.rows.length === 0) {
            // Insert profile
            const result = await query(`
              INSERT INTO profiles (
                user_id, bio, date_of_birth, gender, location, website, social_links,
                preferences, skills, interests, occupation, company, education,
                experience, achievements, contact_info, privacy_settings
              ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17
              ) RETURNING id
            `, [
              profile.user_id, profile.bio, profile.date_of_birth, profile.gender,
              profile.location, profile.website, profile.social_links, profile.preferences,
              profile.skills, profile.interests, profile.occupation, profile.company,
              profile.education, profile.experience, profile.achievements,
              profile.contact_info, profile.privacy_settings
            ]);

            console.log(`   ✅ Created profile for user ${profile.user_id} (Profile ID: ${result.rows[0].id})`);
          } else {
            console.log(`   ⏭️  Profile already exists for user ${profile.user_id}`);
          }
        } catch (error) {
          console.error(`   ❌ Error creating profile for user ${profile.user_id}:`, error.message);
        }
      }

      // Show profile stats
      const statsResult = await query('SELECT COUNT(*) as total FROM profiles');
      console.log(`📊 Total profiles created: ${statsResult.rows[0].total}`);
    } else {
      console.log('⚠️  Profiles table does not exist. Run migration first to create profiles table.');
    }

    console.log('✅ Database seeding completed successfully!');
    console.log('');
    console.log('📋 Summary of created data:');
    console.log('👥 Users:');
    sampleUsers.forEach(user => {
      console.log(`   - ${user.name} (${user.email}) - Password: ${user.password}`);
    });
    
    if (profilesTableExists.rows[0].exists) {
      console.log('');
      console.log('📝 Profiles:');
      console.log('   - John Doe: Full-stack Developer (San Francisco)');
      console.log('   - Sarah Johnson: UX/UI Designer (New York)');
      console.log('   - Mike Chen: DevOps Engineer (Austin)');
      console.log('');
      console.log('🔑 Login Credentials:');
      console.log('   - Admin: admin@backforge.com / admin123');
      console.log('   - User 1: john.doe@example.com / password123');
      console.log('   - User 2: sarah.designs@example.com / password123');
      console.log('   - User 3: mike.ops@example.com / password123');
    }

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