/**
 * Profile Service
 * Handles all profile-related business logic
 */
const BaseService = require('../core/BaseService');

class ProfileService extends BaseService {
  constructor(profileRepository) {
    super();
    
    if (!profileRepository) {
      throw new Error('ProfileRepository is required');
    }
    
    this.profileRepository = profileRepository;
  }

  /**
   * Create a new profile for a user
   * @param {Object} profileData - Profile data
   * @returns {Promise<Object>} Created profile
   */
  async createProfile(profileData) {
    try {
      this.validateRequiredParams(profileData, ['user_id']);
      
      // Check if profile already exists for this user
      const existingProfile = await this.profileRepository.profileExists(profileData.user_id);
      if (existingProfile) {
        throw new Error('Profile already exists for this user');
      }

      // Sanitize and validate profile data
      const sanitizedData = this.sanitizeProfileData(profileData);
      
      // Create profile
      const profile = await this.profileRepository.createProfile(sanitizedData);
      
      return profile;
    } catch (error) {
      this.handleError(error, 'createProfile');
    }
  }

  /**
   * Get profile by user ID
   * @param {number} userId - User ID
   * @returns {Promise<Object|null>} Profile data or null
   */
  async getProfileByUserId(userId) {
    try {
      this.validateRequiredParams({ userId }, ['userId']);
      
      const profile = await this.profileRepository.getProfileByUserId(userId);
      return profile;
    } catch (error) {
      this.handleError(error, 'getProfileByUserId');
    }
  }

  /**
   * Get profile by profile ID
   * @param {number} profileId - Profile ID
   * @returns {Promise<Object|null>} Profile data or null
   */
  async getProfileById(profileId) {
    try {
      this.validateRequiredParams({ profileId }, ['profileId']);
      
      const profile = await this.profileRepository.getProfileById(profileId);
      return profile;
    } catch (error) {
      this.handleError(error, 'getProfileById');
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
      this.validateRequiredParams({ userId }, ['userId']);
      
      // Check if profile exists
      const existingProfile = await this.profileRepository.profileExists(userId);
      if (!existingProfile) {
        throw new Error('Profile not found for this user');
      }

      // Sanitize update data
      const sanitizedData = this.sanitizeProfileData(updateData);
      
      // Update profile
      const profile = await this.profileRepository.updateProfileByUserId(userId, sanitizedData);
      
      return profile;
    } catch (error) {
      this.handleError(error, 'updateProfileByUserId');
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
      this.validateRequiredParams({ profileId }, ['profileId']);
      
      // Sanitize update data
      const sanitizedData = this.sanitizeProfileData(updateData);
      
      // Update profile
      const profile = await this.profileRepository.updateProfileById(profileId, sanitizedData);
      
      return profile;
    } catch (error) {
      this.handleError(error, 'updateProfileById');
    }
  }

  /**
   * Delete profile by user ID
   * @param {number} userId - User ID
   * @returns {Promise<boolean>} Success status
   */
  async deleteProfileByUserId(userId) {
    try {
      this.validateRequiredParams({ userId }, ['userId']);
      
      const deleted = await this.profileRepository.deleteProfileByUserId(userId);
      return deleted;
    } catch (error) {
      this.handleError(error, 'deleteProfileByUserId');
    }
  }

  /**
   * Delete profile by profile ID
   * @param {number} profileId - Profile ID
   * @returns {Promise<boolean>} Success status
   */
  async deleteProfileById(profileId) {
    try {
      this.validateRequiredParams({ profileId }, ['profileId']);
      
      const deleted = await this.profileRepository.deleteProfileById(profileId);
      return deleted;
    } catch (error) {
      this.handleError(error, 'deleteProfileById');
    }
  }

  /**
   * Get all profiles with pagination and filters
   * @param {Object} options - Pagination and filter options
   * @returns {Promise<Object>} Profiles and pagination info
   */
  async getAllProfiles(options = {}) {
    try {
      const result = await this.profileRepository.getAllProfiles(options);
      return result;
    } catch (error) {
      this.handleError(error, 'getAllProfiles');
    }
  }

  /**
   * Search profiles by various criteria
   * @param {Object} criteria - Search criteria
   * @returns {Promise<Array>} Matching profiles
   */
  async searchProfiles(criteria) {
    try {
      const profiles = await this.profileRepository.searchProfiles(criteria);
      return profiles;
    } catch (error) {
      this.handleError(error, 'searchProfiles');
    }
  }

  /**
   * Get profiles by location
   * @param {string} location - Location to search for
   * @returns {Promise<Array>} Profiles in the location
   */
  async getProfilesByLocation(location) {
    try {
      this.validateRequiredParams({ location }, ['location']);
      
      const profiles = await this.profileRepository.getProfilesByLocation(location);
      return profiles;
    } catch (error) {
      this.handleError(error, 'getProfilesByLocation');
    }
  }

  /**
   * Get profiles by occupation
   * @param {string} occupation - Occupation to search for
   * @returns {Promise<Array>} Profiles with the occupation
   */
  async getProfilesByOccupation(occupation) {
    try {
      this.validateRequiredParams({ occupation }, ['occupation']);
      
      const profiles = await this.profileRepository.getProfilesByOccupation(occupation);
      return profiles;
    } catch (error) {
      this.handleError(error, 'getProfilesByOccupation');
    }
  }

  /**
   * Get profile statistics
   * @returns {Promise<Object>} Profile statistics
   */
  async getProfileStats() {
    try {
      const stats = await this.profileRepository.getProfileStats();
      return stats;
    } catch (error) {
      this.handleError(error, 'getProfileStats');
    }
  }

  /**
   * Create or update profile (upsert)
   * @param {number} userId - User ID
   * @param {Object} profileData - Profile data
   * @returns {Promise<Object>} Profile data
   */
  async upsertProfile(userId, profileData) {
    try {
      this.validateRequiredParams({ userId }, ['userId']);
      
      // Check if profile exists
      const existingProfile = await this.profileRepository.profileExists(userId);
      
      if (existingProfile) {
        // Update existing profile
        return await this.updateProfileByUserId(userId, profileData);
      } else {
        // Create new profile
        return await this.createProfile({ user_id: userId, ...profileData });
      }
    } catch (error) {
      this.handleError(error, 'upsertProfile');
    }
  }

  /**
   * Sanitize profile data
   * @param {Object} data - Raw profile data
   * @returns {Object} Sanitized profile data
   */
  sanitizeProfileData(data) {
    const sanitized = {};
    
    // Basic fields
    if (data.bio !== undefined) {
      sanitized.bio = this.sanitizeString(data.bio, 1000); // Max 1000 characters
    }
    
    if (data.date_of_birth !== undefined) {
      sanitized.date_of_birth = this.validateDate(data.date_of_birth);
    }
    
    if (data.gender !== undefined) {
      sanitized.gender = this.validateGender(data.gender);
    }
    
    if (data.location !== undefined) {
      sanitized.location = this.sanitizeString(data.location, 255);
    }
    
    if (data.website !== undefined) {
      sanitized.website = this.validateUrl(data.website);
    }
    
    if (data.social_links !== undefined) {
      sanitized.social_links = this.validateJson(data.social_links);
    }
    
    if (data.preferences !== undefined) {
      sanitized.preferences = this.validateJson(data.preferences);
    }
    
    if (data.skills !== undefined) {
      sanitized.skills = this.validateArray(data.skills);
    }
    
    if (data.interests !== undefined) {
      sanitized.interests = this.validateArray(data.interests);
    }
    
    if (data.occupation !== undefined) {
      sanitized.occupation = this.sanitizeString(data.occupation, 255);
    }
    
    if (data.company !== undefined) {
      sanitized.company = this.sanitizeString(data.company, 255);
    }
    
    if (data.education !== undefined) {
      sanitized.education = this.validateJson(data.education);
    }
    
    if (data.experience !== undefined) {
      sanitized.experience = this.validateJson(data.experience);
    }
    
    if (data.achievements !== undefined) {
      sanitized.achievements = this.validateJson(data.achievements);
    }
    
    if (data.contact_info !== undefined) {
      sanitized.contact_info = this.validateJson(data.contact_info);
    }
    
    if (data.privacy_settings !== undefined) {
      sanitized.privacy_settings = this.validateJson(data.privacy_settings);
    }
    
    return sanitized;
  }

  /**
   * Validate gender
   * @param {string} gender - Gender value
   * @returns {string} Validated gender
   */
  validateGender(gender) {
    const validGenders = ['male', 'female', 'other', 'prefer_not_to_say'];
    if (gender && validGenders.includes(gender.toLowerCase())) {
      return gender.toLowerCase();
    }
    return null;
  }

  /**
   * Validate date
   * @param {string} date - Date string
   * @returns {string|null} Validated date or null
   */
  validateDate(date) {
    if (!date) return null;
    
    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) {
      return null;
    }
    
    // Check if date is not in the future
    if (parsedDate > new Date()) {
      return null;
    }
    
    return parsedDate.toISOString().split('T')[0];
  }

  /**
   * Validate URL
   * @param {string} url - URL string
   * @returns {string|null} Validated URL or null
   */
  validateUrl(url) {
    if (!url) return null;
    
    try {
      const urlObj = new URL(url);
      if (urlObj.protocol === 'http:' || urlObj.protocol === 'https:') {
        return url;
      }
    } catch (error) {
      // Invalid URL
    }
    
    return null;
  }

  /**
   * Validate JSON
   * @param {any} data - Data to validate as JSON
   * @returns {Object|null} Validated JSON or null
   */
  validateJson(data) {
    if (!data) return null;
    
    if (typeof data === 'object') {
      return data;
    }
    
    try {
      return JSON.parse(data);
    } catch (error) {
      return null;
    }
  }

  /**
   * Validate array
   * @param {any} data - Data to validate as array
   * @returns {Array|null} Validated array or null
   */
  validateArray(data) {
    if (!data) return null;
    
    if (Array.isArray(data)) {
      return data.filter(item => typeof item === 'string' && item.trim().length > 0);
    }
    
    if (typeof data === 'string') {
      // Try to parse as JSON array
      try {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) {
          return parsed.filter(item => typeof item === 'string' && item.trim().length > 0);
        }
      } catch (error) {
        // Not valid JSON
      }
    }
    
    return null;
  }
}

module.exports = ProfileService;
