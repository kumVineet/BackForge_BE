/**
 * Profile Repository
 * Handles all database operations for user profiles
 */
const BaseRepository = require('../core/BaseRepository');

class ProfileRepository extends BaseRepository {
  constructor() {
    super('profiles');
  }

  /**
   * Create a new profile for a user
   * @param {Object} profileData - Profile data
   * @returns {Promise<Object>} Created profile
   */
  async createProfile(profileData) {
    try {
      const { user_id, ...otherData } = profileData;
      
      const text = `
        INSERT INTO ${this.tableName} (user_id, ${Object.keys(otherData).join(', ')})
        VALUES ($1, ${Object.keys(otherData).map((_, i) => `$${i + 2}`).join(', ')})
        RETURNING *
      `;
      
      const values = [user_id, ...Object.values(otherData)];
      const result = await this.executeQuery(text, values);
      
      return result.rows[0];
    } catch (error) {
      throw this.handleDatabaseError(error, 'createProfile');
    }
  }

  /**
   * Get profile by user ID
   * @param {number} userId - User ID
   * @returns {Promise<Object|null>} Profile data or null
   */
  async getProfileByUserId(userId) {
    try {
      const text = `
        SELECT p.*, u.name, u.email, u.role
        FROM ${this.tableName} p
        JOIN users u ON p.user_id = u.id
        WHERE p.user_id = $1
      `;
      
      const result = await this.executeQuery(text, [userId]);
      return result.rows[0] || null;
    } catch (error) {
      throw this.handleDatabaseError(error, 'getProfileByUserId');
    }
  }

  /**
   * Get profile by profile ID
   * @param {number} profileId - Profile ID
   * @returns {Promise<Object|null>} Profile data or null
   */
  async getProfileById(profileId) {
    try {
      const text = `
        SELECT p.*, u.name, u.email, u.role
        FROM ${this.tableName} p
        JOIN users u ON p.user_id = u.id
        WHERE p.id = $1
      `;
      
      const result = await this.executeQuery(text, [profileId]);
      return result.rows[0] || null;
    } catch (error) {
      throw this.handleDatabaseError(error, 'getProfileById');
    }
  }

  /**
   * Update profile by user ID
   * @param {number} userId - User ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} Updated profile
   */
  async updateProfileByUserId(userId, updateData) {
    try {
      const fields = Object.keys(updateData);
      const values = Object.values(updateData);
      
      const text = `
        UPDATE ${this.tableName}
        SET ${fields.map((field, i) => `${field} = $${i + 2}`).join(', ')}, updated_at = NOW()
        WHERE user_id = $1
        RETURNING *
      `;
      
      const result = await this.executeQuery(text, [userId, ...values]);
      
      if (result.rows.length === 0) {
        throw new Error('Profile not found');
      }
      
      return result.rows[0];
    } catch (error) {
      throw this.handleDatabaseError(error, 'updateProfileByUserId');
    }
  }

  /**
   * Update profile by profile ID
   * @param {number} profileId - Profile ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} Updated profile
   */
  async updateProfileById(profileId, updateData) {
    try {
      const fields = Object.keys(updateData);
      const values = Object.values(updateData);
      
      const text = `
        UPDATE ${this.tableName}
        SET ${fields.map((field, i) => `${field} = $${i + 2}`).join(', ')}, updated_at = NOW()
        WHERE id = $1
        RETURNING *
      `;
      
      const result = await this.executeQuery(text, [profileId, ...values]);
      
      if (result.rows.length === 0) {
        throw new Error('Profile not found');
      }
      
      return result.rows[0];
    } catch (error) {
      throw this.handleDatabaseError(error, 'updateProfileById');
    }
  }

  /**
   * Delete profile by user ID
   * @param {number} userId - User ID
   * @returns {Promise<boolean>} Success status
   */
  async deleteProfileByUserId(userId) {
    try {
      const text = `DELETE FROM ${this.tableName} WHERE user_id = $1 RETURNING id`;
      const result = await this.executeQuery(text, [userId]);
      
      return result.rows.length > 0;
    } catch (error) {
      throw this.handleDatabaseError(error, 'deleteProfileByUserId');
    }
  }

  /**
   * Delete profile by profile ID
   * @param {number} profileId - Profile ID
   * @returns {Promise<boolean>} Success status
   */
  async deleteProfileById(profileId) {
    try {
      const text = `DELETE FROM ${this.tableName} WHERE id = $1 RETURNING id`;
      const result = await this.executeQuery(text, [profileId]);
      
      return result.rows.length > 0;
    } catch (error) {
      throw this.handleDatabaseError(error, 'deleteProfileById');
    }
  }

  /**
   * Get all profiles with pagination
   * @param {Object} options - Pagination and filter options
   * @returns {Promise<Object>} Profiles and pagination info
   */
  async getAllProfiles(options = {}) {
    try {
      const {
        page = 1,
        limit = 10,
        search = '',
        location = '',
        occupation = '',
        skills = []
      } = options;

      const offset = (page - 1) * limit;
      let whereConditions = [];
      let values = [];
      let valueIndex = 1;

      // Build search conditions
      if (search) {
        whereConditions.push(`(u.name ILIKE $${valueIndex} OR p.bio ILIKE $${valueIndex})`);
        values.push(`%${search}%`);
        valueIndex++;
      }

      if (location) {
        whereConditions.push(`p.location ILIKE $${valueIndex}`);
        values.push(`%${location}%`);
        valueIndex++;
      }

      if (occupation) {
        whereConditions.push(`p.occupation ILIKE $${valueIndex}`);
        values.push(`%${occupation}%`);
        valueIndex++;
      }

      if (skills.length > 0) {
        const skillConditions = skills.map((_, i) => `$${valueIndex + i} = ANY(p.skills)`);
        whereConditions.push(`(${skillConditions.join(' OR ')})`);
        values.push(...skills);
        valueIndex += skills.length;
      }

      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

      // Get total count
      const countText = `
        SELECT COUNT(*) as total
        FROM ${this.tableName} p
        JOIN users u ON p.user_id = u.id
        ${whereClause}
      `;
      
      const countResult = await this.executeQuery(countText, values);
      const total = parseInt(countResult.rows[0].total);

      // Get profiles
      const profilesText = `
        SELECT p.*, u.name, u.email, u.role
        FROM ${this.tableName} p
        JOIN users u ON p.user_id = u.id
        ${whereClause}
        ORDER BY p.updated_at DESC
        LIMIT $${valueIndex} OFFSET $${valueIndex + 1}
      `;
      
      const profilesResult = await this.executeQuery(profilesText, [...values, limit, offset]);
      
      return {
        profiles: profilesResult.rows,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      };
    } catch (error) {
      throw this.handleDatabaseError(error, 'getAllProfiles');
    }
  }

  /**
   * Search profiles by various criteria
   * @param {Object} criteria - Search criteria
   * @returns {Promise<Array>} Matching profiles
   */
  async searchProfiles(criteria) {
    try {
      const { query, location, occupation, skills, interests } = criteria;
      let whereConditions = [];
      let values = [];
      let valueIndex = 1;

      if (query) {
        whereConditions.push(`(u.name ILIKE $${valueIndex} OR p.bio ILIKE $${valueIndex} OR p.occupation ILIKE $${valueIndex})`);
        values.push(`%${query}%`);
        valueIndex++;
      }

      if (location) {
        whereConditions.push(`p.location ILIKE $${valueIndex}`);
        values.push(`%${location}%`);
        valueIndex++;
      }

      if (occupation) {
        whereConditions.push(`p.occupation ILIKE $${valueIndex}`);
        values.push(`%${occupation}%`);
        valueIndex++;
      }

      if (skills && skills.length > 0) {
        const skillConditions = skills.map((_, i) => `$${valueIndex + i} = ANY(p.skills)`);
        whereConditions.push(`(${skillConditions.join(' OR ')})`);
        values.push(...skills);
        valueIndex += skills.length;
      }

      if (interests && interests.length > 0) {
        const interestConditions = interests.map((_, i) => `$${valueIndex + i} = ANY(p.interests)`);
        whereConditions.push(`(${interestConditions.join(' OR ')})`);
        values.push(...interests);
        valueIndex += interests.length;
      }

      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

      const text = `
        SELECT p.*, u.name, u.email, u.role
        FROM ${this.tableName} p
        JOIN users u ON p.user_id = u.id
        ${whereClause}
        ORDER BY p.updated_at DESC
      `;

      const result = await this.executeQuery(text, values);
      return result.rows;
    } catch (error) {
      throw this.handleDatabaseError(error, 'searchProfiles');
    }
  }

  /**
   * Get profiles by location
   * @param {string} location - Location to search for
   * @returns {Promise<Array>} Profiles in the location
   */
  async getProfilesByLocation(location) {
    try {
      const text = `
        SELECT p.*, u.name, u.email, u.role
        FROM ${this.tableName} p
        JOIN users u ON p.user_id = u.id
        WHERE p.location ILIKE $1
        ORDER BY p.updated_at DESC
      `;
      
      const result = await this.executeQuery(text, [`%${location}%`]);
      return result.rows;
    } catch (error) {
      throw this.handleDatabaseError(error, 'getProfilesByLocation');
    }
  }

  /**
   * Get profiles by occupation
   * @param {string} occupation - Occupation to search for
   * @returns {Promise<Array>} Profiles with the occupation
   */
  async getProfilesByOccupation(occupation) {
    try {
      const text = `
        SELECT p.*, u.name, u.email, u.role
        FROM ${this.tableName} p
        JOIN users u ON p.user_id = u.id
        WHERE p.occupation ILIKE $1
        ORDER BY p.updated_at DESC
      `;
      
      const result = await this.executeQuery(text, [`%${occupation}%`]);
      return result.rows;
    } catch (error) {
      throw this.handleDatabaseError(error, 'getProfilesByOccupation');
    }
  }

  /**
   * Check if profile exists for user
   * @param {number} userId - User ID
   * @returns {Promise<boolean>} Profile exists
   */
  async profileExists(userId) {
    try {
      const text = `SELECT id FROM ${this.tableName} WHERE user_id = $1`;
      const result = await this.executeQuery(text, [userId]);
      return result.rows.length > 0;
    } catch (error) {
      throw this.handleDatabaseError(error, 'profileExists');
    }
  }

  /**
   * Get profile statistics
   * @returns {Promise<Object>} Profile statistics
   */
  async getProfileStats() {
    try {
      const text = `
        SELECT 
          COUNT(*) as total_profiles,
          COUNT(CASE WHEN p.avatar_url IS NOT NULL THEN 1 END) as profiles_with_avatar,
          COUNT(CASE WHEN p.bio IS NOT NULL THEN 1 END) as profiles_with_bio,
          COUNT(CASE WHEN p.location IS NOT NULL THEN 1 END) as profiles_with_location,
          COUNT(CASE WHEN p.occupation IS NOT NULL THEN 1 END) as profiles_with_occupation
        FROM ${this.tableName} p
      `;
      
      const result = await this.executeQuery(text);
      return result.rows[0];
    } catch (error) {
      throw this.handleDatabaseError(error, 'getProfileStats');
    }
  }
}

module.exports = ProfileRepository;
