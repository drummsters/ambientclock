/**
 * Handles loading and displaying image backgrounds with cross-fade.
 */
export class ImageBackgroundHandler {
  /**
   * Creates an ImageBackgroundHandler instance.
   * @param {HTMLElement} containerA - The first DOM element for background layer.
   * @param {HTMLElement} containerB - The second DOM element for background layer.
   * @param {object} initialConfig - The initial background configuration from state.
   * @param {Map<string, object>} providers - Map of available image provider instances.
   * @param {ConfigManager} configManager - The application's configuration manager.
   */
  constructor(containerA, containerB, initialConfig, providers, configManager) {
    this.containerA = containerA;
    this.containerB = containerB;
    this.activeContainer = containerA; // Start with A as active
    this.inactiveContainer = containerB;
    this.config = initialConfig;
    this.providers = providers; // Map of provider instances
    this.configManager = configManager;
    this.type = 'image';
    this.currentImageUrl = null; // URL of the image in the *active* container
    this.isLoading = false;

    console.log('[ImageBackgroundHandler] Created with config:', initialConfig, 'Container A:', containerA, 'Container B:', containerB);
  }

  /**
   * Initializes the handler, loading the first image.
   * @returns {Promise<void>}
   */
  async init() {
    console.log('[ImageBackgroundHandler] Initializing...');
    // Ensure initial state: A visible, B hidden, fallback color set
    this.containerA.style.opacity = '1';
    this.containerB.style.opacity = '0';
    this.containerA.style.backgroundColor = '#000';
    this.containerB.style.backgroundColor = '#000';
    // Load the first image into the initially active container (A)
    await this.loadImage(true); // Pass flag to indicate initial load
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
    // 2. Peapix country changed? Reload. (Only if source is peapix)
    else if (this.config.source === 'peapix' && oldConfig.peapixCountry !== this.config.peapixCountry) {
        console.log('[ImageBackgroundHandler] Peapix country changed.');
        needsReload = true;
    }
    // 3. Category changed *to* a predefined value (not 'Other')? Reload. (Only if source is NOT peapix)
    else if (this.config.source !== 'peapix' && oldConfig.category !== this.config.category && this.config.category !== 'Other') {
        console.log('[ImageBackgroundHandler] Predefined category changed.');
        needsReload = true;
    }
    // 4. Category is 'Other' and customCategory changed *to* a non-empty value? Reload. (Only if source is NOT peapix)
    else if (this.config.source !== 'peapix' && this.config.category === 'Other' &&
               oldConfig.customCategory !== this.config.customCategory &&
               this.config.customCategory) { // Check if new customCategory is not empty
        console.log('[ImageBackgroundHandler] Custom category changed to a non-empty value.');
        needsReload = true;
    }
    // 5. Category changed *to* 'Other'? Do NOT reload yet, wait for custom input. (Only if source is NOT peapix)
    else if (this.config.source !== 'peapix' && oldConfig.category !== 'Other' && this.config.category === 'Other') {
         console.log('[ImageBackgroundHandler] Category changed to "Other". Waiting for custom input.');
         needsReload = false; // Explicitly prevent reload here
    }

    if (needsReload) {
      console.log('[ImageBackgroundHandler] Conditions met, loading new image.');
      await this.loadImage(); // Load into inactive container and fade
    } else {
      console.log('[ImageBackgroundHandler] Conditions not met for reload, applying styles only.');
      // Apply other changes like zoom if implemented later to the *active* container
      this.applyStyles(this.activeContainer);
    }
  }

  /**
   * Loads the next background image into the inactive container and fades it in.
   * @param {boolean} [isInitialLoad=false] - If true, loads into the active container without fading.
   * @returns {Promise<void>}
   */
  async loadImage(isInitialLoad = false) {
    if (this.isLoading) {
      console.log('[ImageBackgroundHandler] Already loading an image.');
      return;
    }
    this.isLoading = true;

    // Determine target container: active for initial load, inactive otherwise
    const targetContainer = isInitialLoad ? this.activeContainer : this.inactiveContainer;
    console.log(`[ImageBackgroundHandler] Loading image into ${isInitialLoad ? 'active (initial)' : 'inactive'} container:`, targetContainer.id);

    // Apply fallback color to target container while loading
    targetContainer.style.backgroundImage = 'none';
    targetContainer.style.backgroundColor = '#111';

    const providerName = this.config.source || 'unsplash'; // Default to unsplash
    const provider = this.providers.get(providerName);

    if (!provider) {
        console.error(`[ImageBackgroundHandler] Provider "${providerName}" not found or not registered.`);
        targetContainer.style.backgroundImage = `url('https://via.placeholder.com/1920x1080.png/FF0000/FFFFFF?text=Error:+Provider+${providerName}+not+found')`;
        this.isLoading = false;
        return;
    }

    // Determine the actual query to use (only relevant for non-Peapix providers)
    let query = '';
    if (providerName !== 'peapix') {
        query = this.config.category || 'nature'; // Default category
        if (query === 'Other') {
            query = this.config.customCategory || ''; // Use custom category, default to empty string
        }

        // **Prevent API call if category is 'Other' and customCategory is empty**
        if (this.config.category === 'Other' && !query) {
            console.warn('[ImageBackgroundHandler] Category is "Other" but custom category is empty. Skipping image fetch.');
            targetContainer.style.backgroundImage = `url('https://via.placeholder.com/1920x1080.png/333333/FFFFFF?text=Enter+Custom+Category')`;
            this.isLoading = false;
            return;
        }
    }
     console.log(`[ImageBackgroundHandler] Using query: "${query}" for provider "${providerName}"`);

    let newImageUrl = null;
    let authorInfo = {}; // Store author info

    try {
        let imageData = null;
        // Check if the provider is Peapix and pass the country code
        if (providerName === 'peapix') {
            const countryCode = this.config.peapixCountry || 'us'; // Get country from config, default 'us'
            console.log(`[ImageBackgroundHandler] Peapix selected, using country code: ${countryCode}`);
            // Peapix doesn't use query, but pass countryCode
            imageData = await provider.getImage('', countryCode);
        } else {
            // For other providers, just pass the query
            imageData = await provider.getImage(query);
        }

        if (imageData && imageData.url) {
            newImageUrl = imageData.url;
            authorInfo = { name: imageData.authorName, url: imageData.authorUrl }; // Store author info
            console.log(`[ImageBackgroundHandler] Image URL received from ${providerName}: ${newImageUrl}`);
            // TODO: Display author info using EventBus or another mechanism
        } else {
            console.error(`[ImageBackgroundHandler] Provider "${providerName}" returned invalid data.`);
            newImageUrl = `https://via.placeholder.com/1920x1080.png/FF0000/FFFFFF?text=Error:+Invalid+data+from+${providerName}`;
        }
    } catch (error) {
        console.error(`[ImageBackgroundHandler] Error loading image from provider "${providerName}":`, error);
        newImageUrl = `https://via.placeholder.com/1920x1080.png/FF0000/FFFFFF?text=Error:+Failed+to+load+from+${providerName}`;
    }

    // Preload the image before applying and fading
    if (newImageUrl) {
        try {
            await this.preloadImage(newImageUrl);
            console.log(`[ImageBackgroundHandler] Image preloaded: ${newImageUrl}`);
            targetContainer.style.backgroundImage = `url('${newImageUrl}')`;
            this.applyStyles(targetContainer); // Apply size/position to the target

            if (!isInitialLoad) {
                // Perform the cross-fade
                console.log(`[ImageBackgroundHandler] Cross-fading: ${this.inactiveContainer.id} opacity -> 1, ${this.activeContainer.id} opacity -> 0`);
                this.inactiveContainer.style.opacity = '1';
                this.activeContainer.style.opacity = '0';

                // Swap active/inactive references
                const temp = this.activeContainer;
                this.activeContainer = this.inactiveContainer;
                this.inactiveContainer = temp;
                this.currentImageUrl = newImageUrl; // Update current URL to the new active one
            } else {
                 this.currentImageUrl = newImageUrl; // Set initial URL
            }

        } catch (preloadError) {
            console.error(`[ImageBackgroundHandler] Error preloading image ${newImageUrl}:`, preloadError);
            targetContainer.style.backgroundImage = `url('https://via.placeholder.com/1920x1080.png/FF0000/FFFFFF?text=Error:+Failed+to+preload')`;
            this.applyStyles(targetContainer);
        }
    }

    this.isLoading = false;
  }

  /**
   * Preloads an image URL.
   * @param {string} url - The image URL to preload.
   * @returns {Promise<void>} Resolves when the image is loaded, rejects on error.
   */
  preloadImage(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve();
      img.onerror = (err) => reject(err);
      img.src = url;
    });
  }


  /**
   * Applies common background styles (size, position) to a specific container.
   * @param {HTMLElement} container - The container element to apply styles to.
   */
  applyStyles(container) {
    if (!container) return;

    // Apply common styles
    container.style.backgroundSize = 'cover'; // Or handle zoom later
    container.style.backgroundPosition = 'center center';
    container.style.backgroundRepeat = 'no-repeat';

    // Apply zoom effect based on config
    const zoomEnabled = this.config?.zoomEnabled ?? true; // Default to true if missing
    if (zoomEnabled) {
        container.classList.add('zoom-effect');
        // console.log(`[ImageBackgroundHandler] Zoom effect enabled for ${container.id}`);
    } else {
        container.classList.remove('zoom-effect');
        // console.log(`[ImageBackgroundHandler] Zoom effect disabled for ${container.id}`);
    }
  }
  /**
   * Fetches and applies the next image, triggering the cross-fade.
   * @returns {Promise<void>}
   */
  async loadNext() {
    console.log('[ImageBackgroundHandler] loadNext() called.');
    await this.loadImage(false); // Load into inactive and fade
  }

  /**
   * Cleans up resources used by the handler.
   */
  destroy() {
    console.log('[ImageBackgroundHandler] Destroying...');
    // Reset styles on both containers
    if (this.containerA) {
        this.containerA.style.backgroundImage = 'none';
        this.containerA.style.opacity = '1'; // Reset opacity
        // this.containerA.classList.remove('zoom-effect');
    }
     if (this.containerB) {
        this.containerB.style.backgroundImage = 'none';
        this.containerB.style.opacity = '0'; // Reset opacity
        // this.containerB.classList.remove('zoom-effect');
    }
    // Cancel any ongoing fetches if implemented
  }
}
