/**
 * Dependency Injection Container
 * Manages service instances and their dependencies
 */
const UserRepository = require('../repositories/UserRepository');
const FileUploadRepository = require('../repositories/FileUploadRepository');
const ProfileRepository = require('../repositories/ProfileRepository');
const ConversationRepository = require('../repositories/ConversationRepository');
const MessageRepository = require('../repositories/MessageRepository');
const TokenService = require('../services/TokenService');
const AuthService = require('../services/AuthService');
const UserService = require('../services/UserService');
const ProfileService = require('../services/ProfileService');
const S3StorageService = require('../services/S3StorageService');
const FileUploadService = require('../services/FileUploadService');
const ConversationService = require('../services/ConversationService');
const MessageService = require('../services/MessageService');

class Container {
  constructor() {
    this.services = new Map();
    this.singletons = new Map();
    this.registerServices();
  }

  /**
   * Register all services and their dependencies
   */
  registerServices() {
    try {
      // Register repositories
      this.register('userRepository', () => new UserRepository());
      this.register('fileUploadRepository', () => new FileUploadRepository());
      this.register('profileRepository', () => new ProfileRepository());
      this.register('conversationRepository', () => new ConversationRepository());
      this.register('messageRepository', () => new MessageRepository());

      // Register core services
      this.register('tokenService', () => new TokenService());
      this.register('s3StorageService', () => new S3StorageService());

      // Register business services with dependencies
      this.register('authService', () => {
        const userRepository = this.get('userRepository');
        const tokenService = this.get('tokenService');
        return new AuthService(userRepository, tokenService);
      });

      this.register('userService', () => {
        const userRepository = this.get('userRepository');
        return new UserService(userRepository);
      });

      this.register('profileService', () => {
        const profileRepository = this.get('profileRepository');
        return new ProfileService(profileRepository);
      });

      this.register('fileUploadService', () => {
        const fileUploadRepository = this.get('fileUploadRepository');
        const s3StorageService = this.get('s3StorageService');
        return new FileUploadService(fileUploadRepository, s3StorageService);
      });

      this.register('conversationService', () => {
        const conversationRepository = this.get('conversationRepository');
        const messageRepository = this.get('messageRepository');
        return new ConversationService(conversationRepository, messageRepository);
      });

      this.register('messageService', () => {
        const messageRepository = this.get('messageRepository');
        const conversationRepository = this.get('conversationRepository');
        return new MessageService(messageRepository, conversationRepository);
      });

      console.log('✅ All services registered successfully');
    } catch (error) {
      console.error('❌ Error registering services:', error);
      throw error;
    }
  }

  /**
   * Register a service factory
   * @param {string} name - Service name
   * @param {Function} factory - Service factory function
   */
  register(name, factory) {
    if (this.services.has(name)) {
      throw new Error(`Service '${name}' is already registered`);
    }
    
    this.services.set(name, factory);
  }

  /**
   * Get a service instance (creates singleton if not exists)
   * @param {string} name - Service name
   * @returns {Object} Service instance
   */
  get(name) {
    if (!this.services.has(name)) {
      throw new Error(`Service '${name}' is not registered`);
    }

    // Return singleton if exists
    if (this.singletons.has(name)) {
      return this.singletons.get(name);
    }

    // Create new instance
    const factory = this.services.get(name);
    const instance = factory();
    
    // Store as singleton
    this.singletons.set(name, instance);
    
    return instance;
  }

  /**
   * Get a service instance without singleton caching
   * @param {string} name - Service name
   * @returns {Object} Service instance
   */
  getNew(name) {
    if (!this.services.has(name)) {
      throw new Error(`Service '${name}' is not registered`);
    }

    const factory = this.services.get(name);
    return factory();
  }

  /**
   * Check if a service is registered
   * @param {string} name - Service name
   * @returns {boolean} True if registered
   */
  has(name) {
    return this.services.has(name);
  }

  /**
   * Get all registered service names
   * @returns {Array} Array of service names
   */
  getRegisteredServices() {
    return Array.from(this.services.keys());
  }

  /**
   * Get all singleton instances
   * @returns {Array} Array of service instances
   */
  getSingletonInstances() {
    return Array.from(this.singletons.keys());
  }

  /**
   * Clear all singleton instances (useful for testing)
   */
  clearSingletons() {
    this.singletons.clear();
  }

  /**
   * Reset container (clear all services and singletons)
   */
  reset() {
    this.services.clear();
    this.singletons.clear();
  }

  /**
   * Get service statistics
   * @returns {Object} Container statistics
   */
  getStats() {
    return {
      registeredServices: this.services.size,
      singletonInstances: this.singletons.size,
      registeredServiceNames: this.getRegisteredServices(),
      singletonInstanceNames: this.getSingletonInstances()
    };
  }

  /**
   * Validate all service dependencies
   * @returns {Object} Validation result
   */
  validateDependencies() {
    const results = {};
    const errors = [];

    for (const [serviceName, factory] of this.services) {
      try {
        const instance = factory();
        results[serviceName] = {
          status: 'success',
          instance: instance.constructor.name,
          dependencies: this.getServiceDependencies(instance)
        };
      } catch (error) {
        results[serviceName] = {
          status: 'error',
          error: error.message
        };
        errors.push(`${serviceName}: ${error.message}`);
      }
    }

    return {
      results,
      errors,
      isValid: errors.length === 0
    };
  }

  /**
   * Get service dependencies (basic implementation)
   * @param {Object} instance - Service instance
   * @returns {Array} Array of dependency names
   */
  getServiceDependencies(instance) {
    const dependencies = [];
    
    // Check for common dependency properties
    if (instance.userRepository) dependencies.push('userRepository');
    if (instance.fileUploadRepository) dependencies.push('fileUploadRepository');
    if (instance.profileRepository) dependencies.push('profileRepository');
    if (instance.conversationRepository) dependencies.push('conversationRepository');
    if (instance.messageRepository) dependencies.push('messageRepository');
    if (instance.tokenService) dependencies.push('tokenService');
    if (instance.s3StorageService) dependencies.push('s3StorageService');
    if (instance.fileUploadService) dependencies.push('fileUploadService');
    if (instance.conversationService) dependencies.push('conversationService');
    if (instance.messageService) dependencies.push('messageService');
    
    return dependencies;
  }

  /**
   * Health check for all services
   * @returns {Promise<Object>} Health check results
   */
  async healthCheck() {
    const results = {};
    const errors = [];

    for (const [serviceName, factory] of this.services) {
      try {
        const instance = factory();
        
        // Check if service has health check method
        if (typeof instance.healthCheck === 'function') {
          const health = await instance.healthCheck();
          results[serviceName] = {
            status: 'healthy',
            health
          };
        } else {
          results[serviceName] = {
            status: 'healthy',
            message: 'No health check method available'
          };
        }
      } catch (error) {
        results[serviceName] = {
          status: 'unhealthy',
          error: error.message
        };
        errors.push(`${serviceName}: ${error.message}`);
      }
    }

    return {
      results,
      errors,
      overallStatus: errors.length === 0 ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString()
    };
  }
}

// Create and export singleton instance
const container = new Container();

module.exports = container;
