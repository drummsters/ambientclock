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
    logger.debug('[ConfigManager] Raw env check:', { // Changed to debug
      importMetaEnv: typeof import.meta !== 'undefined' ? 'exists' : 'undefined',
      vitePaypal: typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_DONATE_PAYPAL : 'not found'
    });

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
      },
      performance: {
        reducedQuality: false,
        disableAnimations: false,
        lowResBackgrounds: false,
      },
      donationLinks: { // Initialize with empty/null values
        paypal: null,
        venmo: null,
        cashapp: null,
        googlepay: null
      },
      version: '2.0.0' // App version
    };

    // Attempt to read build-time environment variables (Vite example)
    // Check existence before accessing to avoid warnings in non-Vite environments
    if (typeof import.meta !== 'undefined' && import.meta.env) {
        // Read variables if they exist, otherwise keep the default null/empty value
        this.config.donationLinks.paypal = import.meta.env.VITE_DONATE_PAYPAL || 'drummster'; // Keep fallback for testing
        this.config.donationLinks.venmo = import.meta.env.VITE_DONATE_VENMO || this.config.donationLinks.venmo;
        this.config.donationLinks.cashapp = import.meta.env.VITE_DONATE_CASHAPP || this.config.donationLinks.cashapp;
        this.config.donationLinks.googlepay = import.meta.env.VITE_DONATE_GOOGLEPAY || this.config.donationLinks.googlepay;
        logger.debug('[ConfigManager] Donation links after attempting env var read:', JSON.stringify(this.config.donationLinks)); // Changed to debug
    } else {
        // Log that env vars weren't found (optional, less noisy than the warning)
        // logger.debug('[ConfigManager] Build-time environment variables (import.meta.env) not found.'); // Keep commented or use debug
    }
    // Removed the try...catch block as explicit checks handle potential errors.


    this.setupComplete = false;
    this.CONFIG_STORAGE_KEY = 'ambient-clock-v2-config';
    // SECURE_CONFIG_STORAGE_KEY removed

    // Load initial configuration
    this.loadConfig();
  }

  /**
   * Initializes the ConfigManager, detects environment, loads env vars,
   * and checks if setup is required.
   * @returns {Promise<boolean>} True if configuration is complete, false if setup is needed.
   */
  async init() {
    this.detectEnvironment();
    // loadEnvironmentVariables removed as it only handled keys

    // Load config from storage
    this.loadConfig();

    const setupRequired = !this.validateRequiredConfig(); // Validation logic will be simplified

    if (setupRequired && this.config.deployment.platform === 'local') {
      // Only show setup wizard automatically in local development
      // In deployed environments, rely on environment variables
      logger.log('Required configuration missing, attempting to show setup wizard...'); // Keep as log
      // TODO: Implement and call SetupWizard if needed
      // const setupWizard = new SetupWizard(this);
      // const setupResult = await setupWizard.show();
      // if (setupResult.success) {
      //   this.setupComplete = true;
      //   this.saveConfig(); // Save config after wizard completion
      // } else {
      //   logger.warn('Setup wizard was cancelled or failed.'); // Use logger.warn
      //   // App might still run with limited functionality (e.g., color backgrounds only)
      // }
      logger.warn("Setup Wizard not implemented yet. Configuration might be incomplete."); // Use logger.warn
      this.setupComplete = false; // Mark as incomplete if wizard didn't run/succeed
    } else if (setupRequired) {
        logger.warn(`Configuration incomplete, but running in deployed environment (${this.config.deployment.platform}). Relying on environment variables or defaults.`); // Use logger.warn
        this.setupComplete = false; // Still mark as incomplete
    }
     else {
      this.setupComplete = true;
    }

    logger.debug('ConfigManager initialized. Setup complete:', this.setupComplete); // Changed to debug
    EventBus.publish('config:loaded', this.getPublicConfig());

    return this.setupComplete;
  }

  /**
   * Detects the current deployment environment.
   */
  detectEnvironment() {
    const hostname = window.location.hostname;
    if (hostname.includes('vercel.app') || document.querySelector('meta[name="deployed-on"][content="vercel"]')) {
      this.config.deployment.platform = 'vercel';
    } else if (hostname.includes('netlify.app')) {
      this.config.deployment.platform = 'netlify';
    } else if (hostname.includes('github.io')) {
      this.config.deployment.platform = 'github-pages';
    } else {
      this.config.deployment.platform = 'local';
    }
    logger.debug(`Detected environment: ${this.config.deployment.platform}`); // Changed to debug
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
      return !!this.config.features[featureName];
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
      const savedConfig = localStorage.getItem(this.CONFIG_STORAGE_KEY);
      if (savedConfig) {
        const parsedPublic = JSON.parse(savedConfig);
        // Merge directly, no need to skip 'apis' anymore for secure loading
        this.config = this.deepMerge(this.config, parsedPublic);
      }
      // loadSecureConfig call removed

    } catch (error) {
      logger.error('ConfigManager: Failed to load configuration:', error); // Use logger.error
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
