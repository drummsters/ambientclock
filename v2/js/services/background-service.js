import { StateManager } from '../core/state-manager.js';
import { EventBus } from '../core/event-bus.js';
import { ImageBackgroundHandler } from './image-background-handler.js';
import { UnsplashProvider } from './image-providers/unsplash-provider.js';
import { PexelsProvider } from './image-providers/pexels-provider.js';
import { PeapixProvider } from './image-providers/peapix-provider.js'; // Added Peapix

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
  constructor(backgroundContainerA, backgroundContainerB, overlayContainer, configManager) {
    if (!backgroundContainerA || !backgroundContainerB || !overlayContainer) {
      throw new Error('BackgroundService requires valid background (A & B) and overlay container elements.');
    }
    if (!configManager) {
      throw new Error('BackgroundService requires a ConfigManager instance.');
    }

    this.backgroundContainerA = backgroundContainerA; // Store ref to first element
    this.backgroundContainerB = backgroundContainerB; // Store ref to second element
    this.overlayContainer = overlayContainer;
    this.configManager = configManager; // To check API keys later
    this.currentBackgroundHandler = null; // Instance to handle current background type (ColorBackground, ImageBackground)
    this.imageProviders = new Map(); // Stores instances of image providers
    this.unsubscribeState = null;
    this.unsubscribeRefresh = null; // Add for refresh listener

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

    // Apply overlay opacity first
    this.applyOverlay(config.overlayOpacity);

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
            const selectedProviderName = config.source || 'unsplash'; // Default if not set
            if (!this.imageProviders.has(selectedProviderName)) {
                 console.warn(`[BackgroundService] Selected image provider "${selectedProviderName}" is not configured or registered. Falling back to color.`);
                 // Destroy the potentially half-created image handler if it exists
                 this.currentBackgroundHandler?.destroy();
                 this.currentBackgroundHandler = null;
                 // Explicitly call applyBackground again with type 'color' to force switch
                 await this.applyBackground({ ...config, type: 'color' });
                 return; // Stop further processing for image type
            }

            // Create and initialize the handler, passing both background elements
            this.currentBackgroundHandler = new ImageBackgroundHandler(
                this.backgroundContainerA,
                this.backgroundContainerB,
                config,
                this.imageProviders, // Pass registered providers map
                this.configManager
            );
            await this.currentBackgroundHandler.init(); // Initialize (loads first image)
        } else {
            // If already using ImageBackgroundHandler, just update it
            console.log('[BackgroundService] Updating existing ImageBackgroundHandler.');
            await this.currentBackgroundHandler.update(config);
        }
    } else { // Default to color background
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
   * Applies the overlay opacity.
   * @param {number} opacity - The opacity value (0 to 1).
   */
  applyOverlay(opacity = 0.5) {
    const validOpacity = Math.max(0, Math.min(1, opacity)); // Clamp between 0 and 1
    console.log(`[BackgroundService] Applying overlay opacity: ${validOpacity}`);
    this.overlayContainer.style.backgroundColor = `rgba(0, 0, 0, ${validOpacity})`;
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
    if (this.currentBackgroundHandler) {
      this.currentBackgroundHandler.destroy();
      this.currentBackgroundHandler = null;
    }
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
