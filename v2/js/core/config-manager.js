import { EventBus } from './event-bus.js';
// Import SetupWizard later if needed: import { SetupWizard } from '../components/setup-wizard.js';

/**
 * Manages application configuration, including API keys, deployment settings,
 * and feature flags. Handles loading from environment variables and localStorage,
 * and potentially triggers a setup wizard if configuration is missing.
 */
export class ConfigManager {
  constructor() {
    this.config = {
      deployment: {
        platform: 'local', // 'local', 'vercel', 'netlify', 'github-pages', etc.
        publicUrl: window.location.origin,
      },
      apis: {
        unsplash: {
          apiKey: '',
          configured: false
        },
        pexels: {
          apiKey: '',
          configured: false
        }
        // Add other potential APIs here
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
      version: '2.0.0' // App version
    };

    this.setupComplete = false;
    this.CONFIG_STORAGE_KEY = 'ambient-clock-v2-config';
    this.SECURE_CONFIG_STORAGE_KEY = 'ambient-clock-v2-secure-config';

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
    this.loadEnvironmentVariables(); // Load from build-time env vars first

    // Re-load from storage to potentially override env vars if user configured manually
    this.loadConfig();

    const setupRequired = !this.validateRequiredConfig();

    if (setupRequired && this.config.deployment.platform === 'local') {
      // Only show setup wizard automatically in local development
      // In deployed environments, rely on environment variables
      console.log('Required configuration missing, attempting to show setup wizard...');
      // TODO: Implement and call SetupWizard if needed
      // const setupWizard = new SetupWizard(this);
      // const setupResult = await setupWizard.show();
      // if (setupResult.success) {
      //   this.setupComplete = true;
      //   this.saveConfig(); // Save config after wizard completion
      // } else {
      //   console.warn('Setup wizard was cancelled or failed.');
      //   // App might still run with limited functionality (e.g., color backgrounds only)
      // }
      console.warn("Setup Wizard not implemented yet. Configuration might be incomplete.");
      this.setupComplete = false; // Mark as incomplete if wizard didn't run/succeed
    } else if (setupRequired) {
        console.warn(`Configuration incomplete, but running in deployed environment (${this.config.deployment.platform}). Relying on environment variables or defaults.`);
        this.setupComplete = false; // Still mark as incomplete
    }
     else {
      this.setupComplete = true;
    }

    console.log('ConfigManager initialized. Setup complete:', this.setupComplete);
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
    console.log(`Detected environment: ${this.config.deployment.platform}`);
  }

  /**
   * Loads configuration values from environment variables (if available).
   * Primarily used for cloud deployments like Vercel where env vars are injected.
   */
  loadEnvironmentVariables() {
    // Vercel injects env vars into window.__ENV during build
    if (window.__ENV) {
      console.log('Loading configuration from injected environment variables...');
      if (window.__ENV.UNSPLASH_API_KEY) {
        this.setApiKey('unsplash', window.__ENV.UNSPLASH_API_KEY, false); // Don't save immediately
      }
      if (window.__ENV.PEXELS_API_KEY) {
        this.setApiKey('pexels', window.__ENV.PEXELS_API_KEY, false); // Don't save immediately
      }
      // Load other potential env vars here
    }
  }

  /**
   * Validates if the essential configuration (like API keys) is present.
   * @returns {boolean} True if required configuration is valid.
   */
  validateRequiredConfig() {
    // Example: Require at least one image service API key if image backgrounds are enabled
    if (this.config.features.imageBackground) {
      const unsplashOk = this.config.apis.unsplash.configured;
      const pexelsOk = this.config.apis.pexels.configured;
      if (!unsplashOk && !pexelsOk) {
        console.warn('Validation failed: Image backgrounds enabled, but no API keys configured.');
        return false; // Require at least one key if feature is on
      }
    }
    return true; // Assume valid otherwise
  }

  /**
   * Sets the API key for a specific service.
   * @param {string} service - The name of the service (e.g., 'unsplash').
   * @param {string} key - The API key.
   * @param {boolean} [save=true] - Whether to save the configuration immediately.
   * @returns {boolean} True if the key was set successfully.
   */
  setApiKey(service, key, save = true) {
    if (!this.config.apis[service]) {
      console.error(`ConfigManager: Unknown API service "${service}".`);
      return false;
    }
    const trimmedKey = key ? key.trim() : '';
    this.config.apis[service].apiKey = trimmedKey;
    this.config.apis[service].configured = !!trimmedKey;

    console.log(`API key for ${service} ${trimmedKey ? 'set' : 'cleared'}. Configured: ${this.config.apis[service].configured}`);

    EventBus.publish('config:api:updated', { service });

    if (save) {
      this.saveConfig();
    }
    return true;
  }

  /**
   * Gets the API key for a specific service.
   * @param {string} service - The name of the service.
   * @returns {string|null} The API key or null if service not found.
   */
  getApiKey(service) {
    return this.config.apis[service]?.apiKey || null;
  }

  /**
   * Checks if a specific service is configured (e.g., has an API key).
   * @param {string} service - The name of the service.
   * @returns {boolean} True if the service is configured.
   */
  isServiceConfigured(service) {
    return !!this.config.apis[service]?.configured;
  }

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
      const publicConfig = this.getPublicConfig();
      localStorage.setItem(this.CONFIG_STORAGE_KEY, JSON.stringify(publicConfig));

      // Save secure config
      this.saveSecureConfig();
      // console.log('Configuration saved.');
    } catch (error) {
      console.error('ConfigManager: Failed to save configuration:', error);
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
        // Merge carefully, avoiding overwriting sensitive parts handled by secure load
        this.config = this.deepMerge(this.config, parsedPublic, ['apis']);
      }

      // Load secure config (potentially overwriting API keys from public load)
      this.loadSecureConfig();

    } catch (error) {
      console.error('ConfigManager: Failed to load configuration:', error);
      // Reset or handle error appropriately
    }
  }

  /**
   * Saves sensitive configuration (like API keys) securely.
   * Currently uses localStorage, but could be enhanced (e.g., session storage, httpOnly cookies if server involved).
   */
  saveSecureConfig() {
    const secureData = {
      apis: {}
    };
    // Only store actual keys in secure config
    Object.keys(this.config.apis).forEach(api => {
      secureData.apis[api] = {
        apiKey: this.config.apis[api].apiKey,
        configured: this.config.apis[api].configured
      };
    });

    try {
      localStorage.setItem(this.SECURE_CONFIG_STORAGE_KEY, JSON.stringify(secureData));
    } catch (error) {
      console.error('ConfigManager: Failed to save secure configuration:', error);
    }
  }

  /**
   * Loads sensitive configuration.
   */
  loadSecureConfig() {
    try {
      const secureData = localStorage.getItem(this.SECURE_CONFIG_STORAGE_KEY);
      if (secureData) {
        const parsedSecure = JSON.parse(secureData);
        if (parsedSecure.apis) {
          Object.keys(parsedSecure.apis).forEach(api => {
            if (this.config.apis[api]) {
              // Merge secure data into the main config's API section
              this.config.apis[api] = {
                ...this.config.apis[api], // Keep existing structure
                apiKey: parsedSecure.apis[api].apiKey || '',
                configured: !!parsedSecure.apis[api].apiKey
              };
            }
          });
        }
      }
    } catch (error) {
      console.error('ConfigManager: Failed to load secure configuration:', error);
    }
  }

  /**
   * Returns a configuration object suitable for public exposure (e.g., logging),
   * masking sensitive information like API keys.
   * @returns {object} The public configuration object.
   */
  getPublicConfig() {
    const publicConfig = this.deepClone(this.config);
    // Mask API keys
    Object.keys(publicConfig.apis).forEach(api => {
      if (publicConfig.apis[api]) {
        publicConfig.apis[api].apiKey = publicConfig.apis[api].configured ? '[CONFIGURED]' : '[NOT SET]';
      }
    });
    return publicConfig;
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
