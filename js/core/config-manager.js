import { EventBus } from './event-bus.js';
import * as logger from '../utils/logger.js'; // Import the logger
// Import SetupWizard later if needed: import { SetupWizard } from '../components/setup-wizard.js';

/**
 * Manages application configuration, including API keys, deployment settings,
 * and feature flags. Handles loading from environment variables and localStorage,
 * and potentially triggers a setup wizard if configuration is missing.
 */
export class ConfigManager {
  constructor() {
    // Add debug log for environment variables
    console.log('[ConfigManager] Constructor starting...');
    // Try both process.env and import.meta.env
    const env = (typeof process !== 'undefined' && process.env) || 
               (typeof import.meta !== 'undefined' && import.meta.env) || 
               {};
    // console.log('[ConfigManager] Constructor env check (process.env only):', { ... }); // Removed log

    // Initialize features with defaults. includeDonate is hardcoded.
    this.config = {
      deployment: {
        platform: 'local', // 'local', 'vercel', 'netlify', 'github-pages', etc.
        publicUrl: window.location.origin,
      },
      apis: {
        // API keys are no longer stored or managed here
        unsplash: {}, // Keep structure for potential future non-key config
        pexels: {}
      },
      features: {
        imageBackground: true,
        videoBackground: false, // Example feature flag
        customElements: true,
        favorites: true,
        includeDonate: true, // Hardcode to true for local dev with vercel dev
        useImageDb: true,   // Reverted default back to false
      },
      performance: {
        reducedQuality: false,
        disableAnimations: false,
        lowResBackgrounds: false,
      },
      donationLinks: { // Initialize with empty/null values
        paypal: null,
        venmo: null,
        cashapp: null
      },
      version: '2.0.0' // App version
    };

    // Set up initial state
    this.setupComplete = false;
    this.CONFIG_STORAGE_KEY = 'ambient-clock-v2-config';
    // SECURE_CONFIG_STORAGE_KEY removed

    // Constructor only sets defaults, environment variables and storage will be handled in init()
    // console.log('[ConfigManager] Constructor complete. Initial config:', this.config); // Removed log
  }

  /**
   * Initializes the ConfigManager, detects environment, loads env vars,
   * and checks if setup is required.
   * @returns {Promise<boolean>} True if configuration is complete, false if setup is needed.
   */
  async init() {
    try {
        // console.log('[ConfigManager][init] Starting initialization...'); // Removed log
        this.detectEnvironment();
        // console.log('[ConfigManager][init] Environment detected:', this.config.deployment.platform); // Removed log
    } catch (error) {
         logger.error('[ConfigManager][init] Error in environment detection:', error); // Keep error log
    }

    try {
        // Load from storage first to get any saved user preferences
        // console.log('[ConfigManager][init] Loading from storage first...'); // Removed log
        this.loadConfig(); // This logs internally if needed
        // console.log('[ConfigManager][init] Config after loading from storage:', this.config); // Removed log
    } catch (error) {
        logger.error('[ConfigManager][init] Error loading from storage:', error); // Keep error log
    }

    try {
        // Environment variable reading logic removed.
        
        // Now read non-client-exposed donation links from environment variables if available
        // Use the 'env' variable which attempts to handle both process.env and import.meta.env
        // Environment variables should override localStorage for these specific values
        const env = (typeof process !== 'undefined' && process.env) ||
                   (typeof import.meta !== 'undefined' && import.meta.env) ||
                   {};
        this.config.donationLinks.paypal = env.VITE_DONATE_PAYPAL || this.config.donationLinks.paypal || 'drummster'; // Keep fallback
        this.config.donationLinks.venmo = env.VITE_DONATE_VENMO || this.config.donationLinks.venmo || '@Jerry-Drumm';
        this.config.donationLinks.cashapp = env.VITE_DONATE_CASHAPP || this.config.donationLinks.cashapp || '$drummster';
        
        // console.log('[ConfigManager][init] Config features (using hardcoded includeDonate):', this.config.features); // Removed log
        // console.log('[ConfigManager][init] Config donationLinks (reading from env):', this.config.donationLinks); // Removed log

    } catch (error) {
         logger.error('[ConfigManager][init] Error reading environment variables:', error); // Keep error log
    }

    try {
        // No need to load from storage again
        // console.log('[ConfigManager][init] Final config after env vars:', this.config); // Removed log
    } catch (error) {
        logger.error('[ConfigManager][init] Error in final config check:', error); // Keep error log
    }

    try {
        const setupRequired = !this.validateRequiredConfig(); // Validation logic will be simplified

        if (setupRequired && this.config.deployment.platform === 'local') {
            // Only show setup wizard automatically in local development
            // In deployed environments, rely on environment variables
            logger.log('Required configuration missing, attempting to show setup wizard...'); // Keep as log
            logger.warn("Setup Wizard not implemented yet. Configuration might be incomplete."); // Use logger.warn
            this.setupComplete = false; // Mark as incomplete if wizard didn't run/succeed
        } else if (setupRequired) {
            logger.warn(`Configuration incomplete, but running in deployed environment (${this.config.deployment.platform}). Relying on environment variables or defaults.`); // Use logger.warn
            this.setupComplete = false; // Still mark as incomplete
        } else {
            this.setupComplete = true;
        }

        logger.debug('ConfigManager initialized. Setup complete:', this.setupComplete); // Changed to debug
        EventBus.publish('config:loaded', this.getPublicConfig());
    } catch (error) {
        console.error('[ConfigManager][init] Error in setup validation:', error);
        this.setupComplete = false;
    }

    return this.setupComplete;
  }

  /**
   * Detects the current deployment environment.
   */
  detectEnvironment() {
    try {
        // console.log('[ConfigManager] Detecting environment...'); // Removed log
        const hostname = window.location.hostname;
        // console.log('[ConfigManager] Hostname:', hostname); // Removed log
        
        if (hostname.includes('vercel.app') || document.querySelector('meta[name="deployed-on"][content="vercel"]')) {
            this.config.deployment.platform = 'vercel';
        } else if (hostname.includes('netlify.app')) {
            this.config.deployment.platform = 'netlify';
        } else if (hostname.includes('github.io')) {
            this.config.deployment.platform = 'github-pages';
        } else {
            this.config.deployment.platform = 'local';
        }
        // console.log(`[ConfigManager] Environment detected: ${this.config.deployment.platform}`); // Removed log
    } catch (error) {
        logger.error('[ConfigManager] Error detecting environment:', error); // Keep error log
        // Set a default in case of error
        this.config.deployment.platform = 'unknown';
    }
  }

  /**
   * Loads configuration values from environment variables (if available).
   * Primarily used for cloud deployments like Vercel where env vars are injected.
   * NOTE: This method is now removed as API keys are handled server-side.
   * Kept as a comment block for reference if other env vars are needed later.
   */
  // loadEnvironmentVariables() { ... }

  /**
   * Validates if the essential configuration (like API keys) is present.
   * @returns {boolean} True if required configuration is valid.
   */
  validateRequiredConfig() {
    // API key validation removed.
    // Add other validation checks here if needed in the future.
    return true; // Assume valid for now
  }

  // --- API Key Methods Removed ---
  // setApiKey(...) removed
  // getApiKey(...) removed
  // isServiceConfigured(...) removed

  /**
   * Gets the value of a feature flag.
   * @param {string} featureName - The name of the feature flag.
   * @returns {boolean} The value of the feature flag (defaults to false).
   */
  isFeatureEnabled(featureName) {
      const value = !!this.config.features[featureName];
      // console.log(`[ConfigManager] Checking feature '${featureName}':`, { ... }); // Removed log
      return value;
  }

  /**
   * Saves the non-sensitive configuration to localStorage.
   * Saves sensitive configuration (API keys) separately.
   */
  saveConfig() {
    try {
      // Save public config
      // Save public config (which no longer contains sensitive info)
      const publicConfig = this.getPublicConfig();
      localStorage.setItem(this.CONFIG_STORAGE_KEY, JSON.stringify(publicConfig));
      // logger.debug('Configuration saved.'); // Use debug if uncommented
    } catch (error) {
      logger.error('ConfigManager: Failed to save configuration:', error); // Use logger.error
    }
  }

  /**
   * Loads configuration from localStorage.
   */
  loadConfig() {
    try {
      // Load public config
      // console.log('[ConfigManager] Loading config from localStorage...'); // Removed log
      const savedConfig = localStorage.getItem(this.CONFIG_STORAGE_KEY);
      if (savedConfig) {
        // console.log('[ConfigManager] Found saved config in localStorage:', savedConfig); // Removed log
        const parsedPublic = JSON.parse(savedConfig);
        // console.log('[ConfigManager] Config features BEFORE merging localStorage:', this.config.features); // Removed log
        // Merge directly, no need to skip 'apis' anymore for secure loading
        this.config = this.deepMerge(this.config, parsedPublic);
        // console.log('[ConfigManager] Config features AFTER merging localStorage:', this.config.features); // Removed log
      } else {
        // console.log('[ConfigManager] No saved config found in localStorage'); // Removed log
      }
      // loadSecureConfig call removed

    } catch (error) {
      logger.error('[ConfigManager] Failed to load configuration:', error); // Keep error log
      // Reset or handle error appropriately
    }
  }

  /**
   * Saves sensitive configuration (like API keys) securely.
  // saveSecureConfig() removed
  // loadSecureConfig() removed

  /**
   * Returns a configuration object suitable for public exposure (e.g., logging),
   * masking sensitive information like API keys.
   * @returns {object} The public configuration object.
   */
  getPublicConfig() {
    // No need to mask API keys anymore
    return this.deepClone(this.config);
  }

  /**
   * Returns the full configuration object, including sensitive data.
   * Should only be used internally by trusted modules.
   * @returns {object} The complete configuration object.
   */
  getFullConfig() {
    return this.deepClone(this.config);
  }

  // --- Utility Methods --- (Could be moved to a shared utils file)
  deepClone(obj) {
    try {
      return JSON.parse(JSON.stringify(obj));
    } catch (e) { return obj; }
  }

  isObject(item) {
    return (item && typeof item === 'object' && !Array.isArray(item) && item !== null);
  }

  deepMerge(target, source, skipKeys = []) {
      const output = this.deepClone(target);
      if (this.isObject(source)) {
          Object.keys(source).forEach(key => {
              if (skipKeys.includes(key)) return; // Skip specified keys

              const targetValue = output[key];
              const sourceValue = source[key];

              if (this.isObject(sourceValue) && this.isObject(targetValue)) {
                  output[key] = this.deepMerge(targetValue, sourceValue, skipKeys);
              } else {
                  output[key] = this.deepClone(sourceValue);
              }
          });
      }
      return output;
  }
}
