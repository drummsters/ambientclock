import { StateManager } from '../core/state-manager.js';
import { EventBus } from '../core/event-bus.js';
import { ImageBackgroundHandler } from './image-background-handler.js';
import { UnsplashProvider } from './image-providers/unsplash-provider.js';
import { PexelsProvider } from './image-providers/pexels-provider.js';
import { PeapixProvider } from './image-providers/peapix-provider.js'; // Added Peapix
import { PixabayProvider } from './image-providers/pixabay-provider.js'; // Added Pixabay
import { determineImageQueryKey } from './utils/background-helpers.js';

/**
 * Manages the application's background (color or image) and overlay,
 * supporting cross-fade transitions between images.
 */
export class BackgroundService {
  /**
   * Creates a BackgroundService instance.
   * @param {HTMLElement} backgroundContainerA - The first DOM element for the background layer.
   * @param {HTMLElement} backgroundContainerB - The second DOM element for the background layer.
   * @param {HTMLElement} overlayContainer - The DOM element for the overlay layer.
   * @param {ConfigManager} configManager - The application's configuration manager.
   */
  constructor(backgroundContainerA, backgroundContainerB, overlayContainer, configManager, favoritesService) {
    if (!backgroundContainerA || !backgroundContainerB || !overlayContainer) {
      throw new Error('BackgroundService requires valid background (A & B) and overlay container elements.');
    }
    if (!configManager) {
      throw new Error('BackgroundService requires a ConfigManager instance.');
    }
    if (!favoritesService) {
      throw new Error('BackgroundService requires a FavoritesService instance.');
    }

    this.backgroundContainerA = backgroundContainerA; // Store ref to first element
    this.backgroundContainerB = backgroundContainerB; // Store ref to second element
    this.overlayContainer = overlayContainer;
    this.configManager = configManager; // To check API keys later
    this.favoritesService = favoritesService; // Store ref to favorites service
    this.currentBackgroundHandler = null; // Instance to handle current background type (ColorBackground, ImageBackground)
    this.imageProviders = new Map(); // Stores instances of image providers
    this.unsubscribeState = null;
    this.unsubscribeRefresh = null;
    this.unsubscribeSetFromFavorite = null; // Add for favorite listener
    this.backgroundIntervalId = null; // ID for the background cycling timer

    console.log('BackgroundService created.');
  }

  /**
   * Initializes the BackgroundService.
   * Registers image providers and sets the initial background based on state.
   * @returns {Promise<void>}
   */
  async init() {
    console.log('BackgroundService initializing...');

    // Register image providers. API keys are handled by backend proxies.
    // We register them regardless of local key config now.
    // The providers themselves will use the /api/... endpoints.
    this.registerProvider('unsplash', new UnsplashProvider());
    this.registerProvider('pexels', new PexelsProvider());
    this.registerProvider('peapix', new PeapixProvider()); // Added Peapix
    this.registerProvider('pixabay', new PixabayProvider());
    // Note: The check if the provider is *selected* in state still happens in applyBackground

    // Subscribe to the 'state:initialized' event to apply the initial background
    EventBus.subscribe('state:initialized', (fullState) => {
      console.log('[BackgroundService] state:initialized event received. Full state:', fullState);
      const backgroundState = fullState.settings?.background;
      console.log('[BackgroundService] Received initial state from state:initialized', backgroundState);
      this.applyBackground(backgroundState || {});
    });

    // Subscribe to background state changes for future updates via EventBus
    const backgroundSubscription = EventBus.subscribe('state:settings.background:changed', (backgroundState) => {
      console.log('[BackgroundService] EventBus state:settings.background:changed triggered. Received state:', backgroundState);
      this.applyBackground(backgroundState || {}); // Handle null/undefined state
    });
    // Store the unsubscribe function correctly
    this.unsubscribeState = backgroundSubscription.unsubscribe;

    // Subscribe to the manual refresh command event
    const refreshSubscription = EventBus.subscribe('background:refresh', () => {
        console.log('[BackgroundService] Received background:refresh command.');
        this.loadNextImage(); // Call the existing method to load a new image
    });
    this.unsubscribeRefresh = refreshSubscription.unsubscribe;

    // Subscribe to the set background from favorite event
    const setFromFavoriteSubscription = EventBus.subscribe('background:setFromFavorite', (favoriteData) => {
        console.log('[BackgroundService] Received background:setFromFavorite event:', favoriteData);
        this.loadImageFromFavorite(favoriteData);
    });
    this.unsubscribeSetFromFavorite = setFromFavoriteSubscription.unsubscribe;

    console.log('BackgroundService initialized.');
  }

  /**
   * Registers an image provider service.
   * @param {string} name - The name of the provider (e.g., 'unsplash').
   * @param {object} providerInstance - An instance of the image provider class.
   */
  registerProvider(name, providerInstance) {
    this.imageProviders.set(name, providerInstance);
    console.log(`Image provider "${name}" registered.`);
  }

  /**
   * Applies the background based on the provided configuration.
   * Determines whether to show a color or an image background.
   * @param {object} config - The background configuration from `state.settings.background`.
   * @returns {Promise<void>}
   */
  async applyBackground(config) {
    console.log('[BackgroundService] applyBackground called with config:', config);

    // Clear previous background handler if type changes
    const newType = config.type || 'color'; // Default to color if type is missing
    if (this.currentBackgroundHandler && this.currentBackgroundHandler.type !== newType) {
      this.currentBackgroundHandler.destroy();
      this.currentBackgroundHandler = null;
    }

    // Apply overlay opacity and color first
    this.applyOverlay(config.overlayOpacity, config.color); // Pass color here

    // Determine the correct handler based on type
    if (newType === 'image') { // && this.configManager.isFeatureEnabled('imageBackground')) { // Add feature flag check later
        // Check if the handler needs to be switched or created
        if (!this.currentBackgroundHandler || this.currentBackgroundHandler.type !== 'image') {
            console.log('[BackgroundService] Switching to ImageBackgroundHandler.');
            this.currentBackgroundHandler?.destroy(); // Destroy previous handler if exists
            // TODO: Check if any image providers are actually configured before creating
            // const isAnyProviderConfigured = Array.from(this.imageProviders.keys()).some(p => this.configManager.isServiceConfigured(p));
            // if (!isAnyProviderConfigured) {
            //     console.warn('Image background selected, but no providers configured. Falling back to color.');
            //     await this.applyColorBackground(config); // Fallback
            //     return;
            // }

            // Check if the selected provider is actually registered/configured
            const selectedProviderName = config.provider || config.source || 'unsplash'; // Use provider field first
            if (!this.imageProviders.has(selectedProviderName)) {
                 console.warn(`[BackgroundService] Selected image provider "${selectedProviderName}" is not configured or registered. Falling back to color.`);
                 // Destroy the potentially half-created image handler if it exists
                 this.currentBackgroundHandler?.destroy();
                 this.currentBackgroundHandler = null;
                 // Explicitly call applyBackground again with type 'color' to force switch
                 await this.applyBackground({ ...config, type: 'color' });
                 return; // Stop further processing for image type
            }

            // Process config to preserve query and ensure provider is set
            const processedConfig = { 
                ...config,
                source: selectedProviderName,
                provider: selectedProviderName
            };
            // Determine query key using the helper
            const queryKey = determineImageQueryKey(processedConfig);
            if (queryKey) {
                // If the provider is Peapix, the key is the country code, not the query
                if (processedConfig.source === 'peapix') {
                    processedConfig.peapixCountry = queryKey;
                    delete processedConfig.query; // Ensure query is not set for Peapix
                } else {
                    processedConfig.query = queryKey;
                }
            } else {
                // If queryKey is null (e.g., 'Other' category with no input), clear the query
                delete processedConfig.query;
            }
            
            this.currentBackgroundHandler = new ImageBackgroundHandler(
                this.backgroundContainerA,
                this.backgroundContainerB,
                processedConfig,
                this.imageProviders,
                this.configManager,
                this.favoritesService
            );
            await this.currentBackgroundHandler.init(); // Initialize (loads first image)
            // Start cycling if enabled
            this.updateCycling(config);
        } else {
            // If already using ImageBackgroundHandler, update it with processed config
            console.log('[BackgroundService] Updating existing ImageBackgroundHandler.');
            const selectedProviderName = config.provider || config.source || 'unsplash';
            const processedConfig = { 
                ...config,
                source: selectedProviderName,
                provider: selectedProviderName
            };
            // Determine query key using the helper
            const queryKey = determineImageQueryKey(processedConfig);
             if (queryKey) {
                // If the provider is Peapix, the key is the country code, not the query
                if (processedConfig.source === 'peapix') {
                    processedConfig.peapixCountry = queryKey;
                    delete processedConfig.query; // Ensure query is not set for Peapix
                } else {
                    processedConfig.query = queryKey;
                }
            } else {
                // If queryKey is null (e.g., 'Other' category with no input), clear the query
                delete processedConfig.query;
            }
            await this.currentBackgroundHandler.update(processedConfig);
            // Update cycling based on potentially changed config
            this.updateCycling(config);
        }
    } else { // Default to color background
        // Stop cycling if switching away from image type
        this.stopBackgroundCycling();
        // Check if the handler needs to be switched or created
        if (!this.currentBackgroundHandler || this.currentBackgroundHandler.type !== 'color') {
             console.log('[BackgroundService] Switching to ColorBackgroundHandler.');
            this.currentBackgroundHandler?.destroy(); // Destroy previous handler
            // Pass both background elements to the color handler as well
            this.currentBackgroundHandler = new ColorBackgroundHandler(
                this.backgroundContainerA,
                this.backgroundContainerB
            );
            await this.currentBackgroundHandler.init(); // Initialize color handler
        }
        // Update the color handler
        console.log('[BackgroundService] Updating existing ColorBackgroundHandler.');
        await this.currentBackgroundHandler.update(config); // Use await if update becomes async
    }
  }

  /**
   * @deprecated Use applyBackground which handles type switching.
   */
  // async applyColorBackground(config) {
  //   console.log('[BackgroundService] Applying color background.');
  //   if (!this.currentBackgroundHandler || this.currentBackgroundHandler.type !== 'color') {
  //     console.log('[BackgroundService] Creating new ColorBackgroundHandler.');
  //     if (this.currentBackgroundHandler) this.currentBackgroundHandler.destroy();
  //     // Use a simple handler for color
  //     this.currentBackgroundHandler = new ColorBackgroundHandler(this.backgroundContainer);
  //     await this.currentBackgroundHandler.init(); // Await init if it becomes async
  //   }
  //   this.currentBackgroundHandler.update(config); // Update color
  // }

  /**
   * Applies the overlay opacity and color.
   * @param {number} opacity - The opacity value (0 to 1).
   * @param {string} color - The base color for the overlay (hex string, e.g., '#000000').
   */
  applyOverlay(opacity = 0.5, color = '#000000') { // Add color parameter with default
    const validOpacity = Math.max(0, Math.min(1, opacity)); // Clamp between 0 and 1
    const validColor = color || '#000000'; // Ensure color is not null/undefined

    // Convert hex color to RGB components to apply opacity correctly
    const hex = validColor.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);

    // Check if parsing was successful (basic check)
    if (isNaN(r) || isNaN(g) || isNaN(b)) {
        console.error(`[BackgroundService] Invalid color format received: ${validColor}. Falling back to black.`);
        this.overlayContainer.style.backgroundColor = `rgba(0, 0, 0, ${validOpacity})`;
        return;
    }

    console.log(`[BackgroundService] Applying overlay opacity: ${validOpacity}, color: ${validColor} (rgb(${r},${g},${b}))`);
    this.overlayContainer.style.backgroundColor = `rgba(${r}, ${g}, ${b}, ${validOpacity})`; // Use RGB components
  }

  /**
   * Starts or stops the background image cycling based on config.
   * @param {object} config - The background configuration.
   */
  updateCycling(config) {
    if (config.type === 'image' && config.cycleEnabled && config.cycleInterval > 0) {
      this.startBackgroundCycling(config.cycleInterval);
    } else {
      this.stopBackgroundCycling();
    }
  }

  /**
   * Starts the background cycling interval.
   * @param {number} interval - The interval in milliseconds.
   */
  startBackgroundCycling(interval) {
    this.stopBackgroundCycling(); // Clear any existing interval first
    if (interval > 0) {
      console.log(`[BackgroundService] Starting background cycling with interval: ${interval}ms`);
      this.backgroundIntervalId = setInterval(() => {
        console.log('[BackgroundService] Interval triggered: Loading next image.');
        this.loadNextImage();
      }, interval);
    } else {
      console.log('[BackgroundService] Background cycling interval is zero or negative, not starting.');
    }
  }

  /**
   * Stops the background cycling interval.
   */
  stopBackgroundCycling() {
    if (this.backgroundIntervalId) {
      console.log('[BackgroundService] Stopping background cycling.');
      clearInterval(this.backgroundIntervalId);
      this.backgroundIntervalId = null;
    }
  }

  /**
   * Fetches the next background image (if applicable).
   * @returns {Promise<void>}
   */
  async loadNextImage() {
    if (this.currentBackgroundHandler && typeof this.currentBackgroundHandler.loadNext === 'function') {
      console.log('Loading next background image...');
      await this.currentBackgroundHandler.loadNext();
    } else {
      console.log('Cannot load next image: Current background type does not support it or handler not implemented.');
    }
  }

  /**
   * Loads a specific image URL provided by favorite data.
   * @param {object} favoriteData - The favorite object containing image details.
   * @returns {Promise<void>}
   */
  async loadImageFromFavorite(favoriteData) {
    // Ensure we are currently using the ImageBackgroundHandler
    if (this.currentBackgroundHandler && typeof this.currentBackgroundHandler.loadImageFromUrl === 'function') {
      console.log('[BackgroundService] Calling loadImageFromUrl on handler.');
      await this.currentBackgroundHandler.loadImageFromUrl(favoriteData);
    } else {
      // If not currently in image mode, switch to it first, then load
      console.warn('[BackgroundService] Not in image mode or handler missing loadImageFromUrl. Switching mode first.');
      // Update state to switch to image mode (this might trigger applyBackground)
      // We need to pass enough info for it to potentially load the favorite image after switching.
      // This might be complex; simpler approach is to assume user is already in image mode
      // when clicking a favorite. For now, log a warning.
      console.error('[BackgroundService] Cannot load favorite image when not in image background mode.');
      // Optionally, publish a UI message? EventBus.publish('ui:showToast', { message: 'Switch to image background type first.' });
    }
  }

  /**
   * Cleans up the service, unsubscribing from state changes.
   */
  destroy() {
    console.log('Destroying BackgroundService...');
    if (this.unsubscribeState) {
      this.unsubscribeState();
      this.unsubscribeState = null;
    }
    // Unsubscribe from refresh command
    if (this.unsubscribeRefresh) {
        this.unsubscribeRefresh();
        this.unsubscribeRefresh = null;
    }
    if (this.unsubscribeSetFromFavorite) { // Unsubscribe from favorite listener
        this.unsubscribeSetFromFavorite();
        this.unsubscribeSetFromFavorite = null;
    }
    if (this.currentBackgroundHandler) {
      this.currentBackgroundHandler.destroy();
      this.currentBackgroundHandler = null;
    }
    this.stopBackgroundCycling(); // Ensure timer is stopped on destroy
    console.log('BackgroundService destroyed.');
  }
}


// --- Simple Handler for Color Background (Updated for two elements) ---
class ColorBackgroundHandler {
  constructor(containerA, containerB) {
    this.containerA = containerA;
    this.containerB = containerB;
    this.type = 'color';
  }

  async init() {
    // No async init needed for simple color
    // Ensure no images are lingering and set initial opacity
    this.containerA.style.backgroundImage = 'none';
    this.containerB.style.backgroundImage = 'none';
    this.containerA.style.opacity = '1';
    this.containerB.style.opacity = '0';
  }

  update(config) {
    const color = config.color || '#000000'; // Default to black
    console.log(`[ColorBackgroundHandler] Updating background color to: ${color}`);
    // Apply color to both containers
    this.containerA.style.backgroundColor = color;
    this.containerB.style.backgroundColor = color; // Keep B's color consistent even if hidden

    // Ensure A is visible and B is hidden when in color mode
    this.containerA.style.opacity = '1';
    this.containerB.style.opacity = '0';

    // Force a repaint (optional, might not be needed for color)
    // this.containerA.style.display = 'none';
    // this.containerA.offsetHeight; // Trigger a reflow
    // this.containerA.style.display = 'block';

    // Log the computed style to verify
    const computedStyle = window.getComputedStyle(this.containerA);
    console.log(`[ColorBackgroundHandler] Computed background color (A): ${computedStyle.backgroundColor}`);
  }

  destroy() {
    // Reset background color or leave as is? Resetting might cause flicker.
    // this.containerA.style.backgroundColor = '';
    // this.containerB.style.backgroundColor = '';
    console.log('ColorBackgroundHandler destroyed.');
  }
}

// ImageBackgroundHandler is now imported from its own file
