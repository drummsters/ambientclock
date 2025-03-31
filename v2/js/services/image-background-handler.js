/**
 * Handles loading and displaying image backgrounds.
 * Placeholder implementation.
 */
export class ImageBackgroundHandler {
  /**
   * Creates an ImageBackgroundHandler instance.
   * @param {HTMLElement} container - The DOM element to apply the background image to.
   * @param {object} initialConfig - The initial background configuration from state.
   * @param {Map<string, object>} providers - Map of available image provider instances.
   * @param {ConfigManager} configManager - The application's configuration manager.
   */
  constructor(container, initialConfig, providers, configManager) {
    this.container = container;
    this.config = initialConfig;
    this.providers = providers; // Map of provider instances (e.g., 'unsplash', 'pexels')
    this.configManager = configManager; // To check API keys, etc.
    this.type = 'image';
    this.currentImageUrl = null;
    this.isLoading = false;

    console.log('[ImageBackgroundHandler] Created with config:', initialConfig);
  }

  /**
   * Initializes the handler, loading the first image.
   * @returns {Promise<void>}
   */
  async init() {
    console.log('[ImageBackgroundHandler] Initializing...');
    this.container.style.backgroundColor = '#000'; // Set a fallback color while loading
    await this.loadImage();
  }

  /**
   * Updates the handler based on new configuration.
   * @param {object} newConfig - The updated background configuration.
   * @returns {Promise<void>}
   */
  async update(newConfig) {
    const oldConfig = { ...this.config };
    this.config = { ...this.config, ...newConfig };
    console.log('[ImageBackgroundHandler] Updating config. Old:', oldConfig, 'New:', this.config);

    // Determine if a reload is needed based on specific conditions
    let needsReload = false;

    // 1. Source changed? Always reload.
    if (oldConfig.source !== this.config.source) {
        console.log('[ImageBackgroundHandler] Source changed.');
        needsReload = true;
    }
    // 2. Category changed *to* a predefined value (not 'Other')? Reload.
    else if (oldConfig.category !== this.config.category && this.config.category !== 'Other') {
        console.log('[ImageBackgroundHandler] Predefined category changed.');
        needsReload = true;
    }
    // 3. Category is 'Other' and customCategory changed *to* a non-empty value? Reload.
    else if (this.config.category === 'Other' &&
               oldConfig.customCategory !== this.config.customCategory &&
               this.config.customCategory) { // Check if new customCategory is not empty
        console.log('[ImageBackgroundHandler] Custom category changed to a non-empty value.');
        needsReload = true;
    }
    // 4. Category changed *to* 'Other'? Do NOT reload yet, wait for custom input.
    else if (oldConfig.category !== 'Other' && this.config.category === 'Other') {
         console.log('[ImageBackgroundHandler] Category changed to "Other". Waiting for custom input.');
         needsReload = false; // Explicitly prevent reload here
    }


    if (needsReload) {
      console.log('[ImageBackgroundHandler] Conditions met, loading new image.');
      await this.loadImage();
    } else {
      console.log('[ImageBackgroundHandler] Conditions not met for reload, applying styles only.');
      // Apply other changes like zoom if implemented later
      this.applyStyles();
    }
  }

  /**
   * Loads the next background image based on the current configuration.
   * Placeholder implementation.
   * @returns {Promise<void>}
   */
  async loadImage() {
    if (this.isLoading) {
      console.log('[ImageBackgroundHandler] Already loading an image.');
      return;
    }
    this.isLoading = true;
    this.currentImageUrl = null; // Clear previous image while loading
    this.applyStyles(); // Apply fallback color while loading

    const providerName = this.config.source || 'unsplash'; // Default to unsplash
    const provider = this.providers.get(providerName);

    if (!provider) {
        console.error(`[ImageBackgroundHandler] Provider "${providerName}" not found or not registered.`);
        this.isLoading = false;
        // Optionally display an error message on the background itself
        this.container.style.backgroundImage = `url('https://via.placeholder.com/1920x1080.png/FF0000/FFFFFF?text=Error:+Provider+${providerName}+not+found')`;
        return;
    }

    // Determine the actual query to use
    let query = this.config.category || 'nature'; // Default category
    if (query === 'Other') {
        query = this.config.customCategory || ''; // Use custom category, default to empty string
    }

    // **Prevent API call if category is 'Other' and customCategory is empty**
    if (this.config.category === 'Other' && !query) {
        console.warn('[ImageBackgroundHandler] Category is "Other" but custom category is empty. Skipping image fetch.');
        this.isLoading = false;
        // Keep the fallback color, or maybe show a specific message?
        this.container.style.backgroundImage = `url('https://via.placeholder.com/1920x1080.png/333333/FFFFFF?text=Enter+Custom+Category')`;
        return;
    }

     console.log(`[ImageBackgroundHandler] Using query: "${query}" for provider "${providerName}"`);

    try {
        const imageData = await provider.getImage(query);

        if (imageData && imageData.url) {
            this.currentImageUrl = imageData.url;
            console.log(`[ImageBackgroundHandler] Image loaded from ${providerName}: ${this.currentImageUrl}`);
            // TODO: Store and display author info (imageData.authorName, imageData.authorUrl)
        } else {
            console.error(`[ImageBackgroundHandler] Provider "${providerName}" returned invalid data.`);
            // Use a fallback/error image
             this.currentImageUrl = `https://via.placeholder.com/1920x1080.png/FF0000/FFFFFF?text=Error:+Invalid+data+from+${providerName}`;
        }
    } catch (error) {
        console.error(`[ImageBackgroundHandler] Error loading image from provider "${providerName}":`, error);
         this.currentImageUrl = `https://via.placeholder.com/1920x1080.png/FF0000/FFFFFF?text=Error:+Failed+to+load+from+${providerName}`;
    } finally {
        this.applyStyles(); // Apply the loaded image (or error image)
        this.isLoading = false;
    }
  }

  /**
   * Applies the current image URL and styles to the container.
   */
  applyStyles() {
    if (!this.container) return;

    if (this.currentImageUrl) {
      this.container.style.backgroundImage = `url('${this.currentImageUrl}')`;
      this.container.style.backgroundSize = 'cover'; // Or handle zoom later
      this.container.style.backgroundPosition = 'center center';
      console.log('[ImageBackgroundHandler] Applied background image style.');
    } else {
      this.container.style.backgroundImage = 'none';
      this.container.style.backgroundColor = '#111'; // Fallback color if no image
      console.log('[ImageBackgroundHandler] No image URL, applied fallback background color.');
    }
    
    // Apply zoom effect based on config
    const zoomEnabled = this.config?.zoomEnabled ?? true; // Default to true if missing
    if (zoomEnabled) {
        this.container.classList.add('zoom-effect');
        console.log('[ImageBackgroundHandler] Zoom effect enabled.');
    } else {
        this.container.classList.remove('zoom-effect');
        console.log('[ImageBackgroundHandler] Zoom effect disabled.');
    }
  }

  /**
   * Fetches and applies the next image in the sequence (if supported by provider).
   * Placeholder implementation.
   * @returns {Promise<void>}
   */
  async loadNext() {
    console.log('[ImageBackgroundHandler] loadNext() called.');
    await this.loadImage(); // For now, just reload based on current settings
  }

  /**
   * Cleans up resources used by the handler.
   */
  destroy() {
    console.log('[ImageBackgroundHandler] Destroying...');
    // Reset container styles maybe?
    if (this.container) {
        this.container.style.backgroundImage = 'none';
        this.container.classList.remove('zoom-effect'); // Remove zoom class on destroy
    }
    // Cancel any ongoing fetches if implemented
  }
}
