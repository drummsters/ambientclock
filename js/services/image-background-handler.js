import { StateManager } from '../core/state-manager.js';
import { EventBus } from '../core/event-bus.js';
import * as logger from '../utils/logger.js'; // Import the logger

// Define RateLimitError locally for this module's use
// Assumes providers throw this specific error type upon hitting limits.
class RateLimitError extends Error {
  constructor(message, resetTimestamp = null) {
    super(message);
    this.name = 'RateLimitError';
    this.resetTimestamp = resetTimestamp;
  }
}

const PROACTIVE_FETCH_THRESHOLD = 2; // Fetch next batch when cache size is <= this value
const BATCH_SIZE = 10; // Default number of images to fetch in a batch

/**
 * Handles loading and displaying image backgrounds with cross-fade,
 * including batch fetching, caching, and rate limit handling.
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
    this.isLoading = false; // Tracks if currently processing loadImage/loadNext
    this.imageCache = []; // Holds the current batch of image data objects
    this.currentBatchQuery = null; // Query used for the current cache
    this.currentBatchCountry = null; // Country code used for the current cache (Peapix)
    this.isFetchingBatch = false;

    logger.debug('[ImageBackgroundHandler] Created with config:', initialConfig);
  }

  /**
   * Initializes the handler, loading the first image.
   * @returns {Promise<void>}
   */
  async init() {
    logger.debug('[ImageBackgroundHandler] Initializing...');
    // Ensure initial state: A visible, B hidden, fallback color set
    this.containerA.style.opacity = '1';
    this.containerB.style.opacity = '0';
    this.containerA.style.backgroundColor = '#000';
    this.containerB.style.backgroundColor = '#000';
    // Load the first image into the initially active container (A)
    await this.loadImage(true);
  }

  /**
   * Updates the handler based on new configuration.
   * Determines if the cache needs clearing and if a new image load is required.
   * @param {object} newConfig - The updated background configuration.
   * @returns {Promise<void>}
   */
  async update(newConfig) {
    const oldConfig = { ...this.config };
    this.config = { ...this.config, ...newConfig };
    logger.debug('[ImageBackgroundHandler] Updating config. Old:', oldConfig, 'New:', this.config);

    let needsReload = false;
    let needsCacheClear = false; // Flag to clear cache

    // Determine the current query/country key based on the new config
    let newQueryKey = null;
    if (this.config.source === 'peapix') {
        newQueryKey = this.config.peapixCountry || 'us';
    } else {
        newQueryKey = (this.config.category === 'Other')
            ? (this.config.customCategory || '')
            : (this.config.category || 'nature');
    }

    // Determine the previous query/country key based on the old config
    let oldQueryKey = null;
     if (oldConfig.source === 'peapix') {
        oldQueryKey = oldConfig.peapixCountry || 'us';
    } else {
        oldQueryKey = (oldConfig.category === 'Other')
            ? (oldConfig.customCategory || '')
            : (oldConfig.category || 'nature');
    }

    // 1. Source changed? Always reload and clear cache.
    if (oldConfig.source !== this.config.source) {
        logger.debug('[ImageBackgroundHandler] Source changed.');
        needsReload = true;
        needsCacheClear = true;
    }
    // 2. Query/Country key changed? Reload and clear cache.
    // Also handles Peapix country change, category change, custom category change.
    else if (newQueryKey !== oldQueryKey) {
         logger.debug(`[ImageBackgroundHandler] Query/Country key changed from "${oldQueryKey}" to "${newQueryKey}".`);
         // Don't reload immediately if the new key is empty (e.g., switched to 'Other' category with no custom input yet)
         if (this.config.source !== 'peapix' && this.config.category === 'Other' && !newQueryKey) {
             logger.debug('[ImageBackgroundHandler] Category changed to "Other" with empty custom input. Clearing cache, waiting for input.');
             needsReload = false;
             needsCacheClear = true; // Clear cache even if not reloading yet
         } else {
             needsReload = true;
             needsCacheClear = true;
         }
    }

    // Clear cache if needed
    if (needsCacheClear) {
        logger.debug('[ImageBackgroundHandler] Clearing image cache due to config change.');
        this.imageCache = [];
        this.currentBatchQuery = null;
        this.currentBatchCountry = null;
        // If a background fetch was happening for the old query, it will complete but the result will be ignored.
    }

    if (needsReload) {
      logger.debug('[ImageBackgroundHandler] Config change requires reload, loading new image.');
      // Don't load if category is 'Other' and custom is empty
       if (this.config.source !== 'peapix' && this.config.category === 'Other' && !newQueryKey) {
           logger.debug('[ImageBackgroundHandler] Skipping reload because custom category is empty.');
           // Display a placeholder indicating user needs to enter custom category
           await this._displayImage({ error: 'custom_category_empty', message: 'Enter Custom Category' }, false);
       } else {
           await this.loadImage(); // Load into inactive container and fade
       }
    } else {
      logger.debug('[ImageBackgroundHandler] Config change does not require reload, applying styles only.');
      // Apply other changes like zoom if implemented later to the *active* container
      this.applyStyles(this.activeContainer);
    }
  }

  /**
   * Loads the next background image, utilizing the cache and batch fetching.
   * @param {boolean} [isInitialLoad=false] - If true, loads into the active container without fading.
   * @returns {Promise<void>}
   */
  async loadImage(isInitialLoad = false) {
    if (this.isLoading) {
      logger.warn('[ImageBackgroundHandler] loadImage called while already loading.');
      return;
    }
    this.isLoading = true;
    logger.debug(`[ImageBackgroundHandler] loadImage called (isInitialLoad: ${isInitialLoad})`);

    try {
        // Fetch image data using the batch-aware helper
        const imageData = await this._fetchImageData(); // Handles cache check, batch fetch, selection

        // Display the image (or placeholder/error)
        await this._displayImage(imageData, isInitialLoad);

    } catch (error) {
        // Catch unexpected errors during the process (errors during fetch/display are handled internally)
        logger.error('[ImageBackgroundHandler] Unexpected error during loadImage process:', error);
        // Display a generic error placeholder
        await this._displayImage({ error: 'unexpected_error', message: 'Unexpected Error' }, isInitialLoad);
    } finally {
        this.isLoading = false;
        logger.debug(`[ImageBackgroundHandler] loadImage finished (isInitialLoad: ${isInitialLoad})`);
    }
  }

  /**
   * Gets the next image data object, managing the cache and triggering batch fetches.
   * @returns {Promise<object|null>} The image data object or an error object {error: string, message: string}.
   * @private
   */
  async _fetchImageData() {
    const providerName = this.config.source || 'unsplash';
    let query = '';
    let countryCode = null;
    let currentQueryKey = null; // Key to check against cache

    // Determine current query/country key
    if (providerName === 'peapix') {
        countryCode = this.config.peapixCountry || 'us';
        currentQueryKey = countryCode;
    } else {
        query = (this.config.category === 'Other')
            ? (this.config.customCategory || '')
            : (this.config.category || 'nature');
        currentQueryKey = query;

        // Prevent API call if category is 'Other' and customCategory is empty
        if (this.config.category === 'Other' && !query) {
            logger.warn('[ImageBackgroundHandler] Cannot fetch: Category is "Other" but custom category is empty.');
            return { error: 'custom_category_empty', message: 'Enter Custom Category' };
        }
    }

    // --- Batch Cache Logic ---
    const cacheKeyMatches = (providerName === 'peapix')
        ? (this.currentBatchCountry === currentQueryKey)
        : (this.currentBatchQuery === currentQueryKey);
    // Now log, after cacheKeyMatches is defined
    logger.debug(`[ImageBackgroundHandler] _fetchImageData: Checking cache. Current size: ${this.imageCache.length}, Key matches needed key (${currentQueryKey})? ${cacheKeyMatches}`);

    // 1. Check Cache & Fetch Batch if Needed
    if (this.imageCache.length === 0 || !cacheKeyMatches) {
        const reason = this.imageCache.length === 0 ? 'Cache empty' : 'Key mismatch';
        logger.debug(`[ImageBackgroundHandler] ${reason}. Fetching new batch for key: ${currentQueryKey}.`);
        try {
            // Await the initial fetch because we need an image *now*.
            await this._fetchImageBatch();
            if (this.imageCache.length === 0) {
                // If fetch succeeded but returned no images (rare, but possible)
                logger.error('[ImageBackgroundHandler] Batch fetch returned no images.');
                return { error: 'batch_fetch_empty', message: 'No images found' };
            }
        } catch (error) {
            logger.error('[ImageBackgroundHandler] Error awaiting initial batch fetch:', error);
            // Return specific error based on type
            if (error instanceof RateLimitError) {
                logger.warn(`[ImageBackgroundHandler] Rate limit hit during initial fetch for ${providerName}.`);
                return { error: 'rate_limit', message: `API limit reached for ${providerName}. Try again later.` };
            }
            return { error: 'batch_fetch_error', message: `Error loading from ${providerName}` };
        }
    } else {
         logger.debug(`[ImageBackgroundHandler] Cache hit! Using existing cache for key: ${currentQueryKey}`);
    }

    // 2. Select Image from Cache
    if (this.imageCache.length === 0) {
         // This case should ideally be handled by the fetch logic above, but safeguard here.
         logger.error('[ImageBackgroundHandler] Cache is empty after fetch attempt.');
         return { error: 'cache_empty', message: 'No images available' };
    }
    const cacheSizeBefore = this.imageCache.length;
    const randomIndex = Math.floor(Math.random() * this.imageCache.length);
    const selectedImageData = this.imageCache[randomIndex];
    this.imageCache.splice(randomIndex, 1); // Remove selected image
    logger.debug(`[ImageBackgroundHandler] Selected image from cache (Index: ${randomIndex}, URL: ${selectedImageData?.url?.substring(0, 50)}...). Cache size: ${cacheSizeBefore} -> ${this.imageCache.length}.`);

    // 3. Trigger Proactive Fetch if Needed
    if (this.imageCache.length <= PROACTIVE_FETCH_THRESHOLD && !this.isFetchingBatch) {
        logger.debug(`[ImageBackgroundHandler] Cache size (${this.imageCache.length}) <= threshold (${PROACTIVE_FETCH_THRESHOLD}). Triggering proactive background fetch for key: ${currentQueryKey}.`);
        // No await - run in background, catch errors locally
        this._fetchImageBatch().catch(error => {
            // Log proactively fetched errors, but don't disrupt the current image display
            logger.warn('[ImageBackgroundHandler] Error during proactive background batch fetch:', error);
        });
    } else if (this.isFetchingBatch) {
         logger.debug(`[ImageBackgroundHandler] Proactive fetch skipped: Already fetching batch.`);
    } else {
         // logger.debug(`[ImageBackgroundHandler] Proactive fetch skipped: Cache size (${this.imageCache.length}) > threshold (${PROACTIVE_FETCH_THRESHOLD}).`); // Suppressed as requested
    }


    return selectedImageData; // Return the single selected image data
  }


  /**
   * Fetches a batch of images from the provider and populates the cache.
   * Handles the isFetchingBatch flag and errors including RateLimitError.
   * @private
   */
  async _fetchImageBatch() {
    if (this.isFetchingBatch) {
        logger.debug('[ImageBackgroundHandler] _fetchImageBatch called while already fetching.'); // Changed to debug
        return; // Prevent concurrent fetches
    }
    this.isFetchingBatch = true;
    const providerName = this.config.source || 'unsplash'; // Get provider name early for logging
    logger.debug(`[ImageBackgroundHandler] Starting batch fetch for provider: ${providerName}...`);

    const provider = this.providers.get(providerName);
    let query = '';
    let countryCode = null;
    let newCacheKey = null;

    if (!provider || typeof provider.getImageBatch !== 'function') {
        logger.error(`[ImageBackgroundHandler] Provider "${providerName}" not found or doesn't support getImageBatch.`);
        this.isFetchingBatch = false;
        // Throw error to be caught by the awaiting caller (_fetchImageData)
        throw new Error(`Invalid provider or missing getImageBatch for ${providerName}`);
    }

    try {
        // Determine query/country for the fetch
        if (providerName === 'peapix') {
            countryCode = this.config.peapixCountry || 'us';
            newCacheKey = countryCode;
            logger.debug(`[ImageBackgroundHandler] Fetching batch for Peapix, country: ${countryCode}`); // Changed to debug
            // Peapix getImageBatch takes countryCode as 3rd arg in our implementation
            this.imageCache = await provider.getImageBatch(query, BATCH_SIZE, countryCode);
        } else {
            query = (this.config.category === 'Other')
                ? (this.config.customCategory || '')
                : (this.config.category || 'nature');
            newCacheKey = query;

            if (this.config.category === 'Other' && !query) {
                logger.warn('[ImageBackgroundHandler] Cannot fetch batch: Category is "Other" but custom category is empty.');
                this.imageCache = []; // Clear cache if query is invalid
            } else {
                 logger.debug(`[ImageBackgroundHandler] Fetching batch for ${providerName}, query: "${query}"`); // Changed to debug
                 this.imageCache = await provider.getImageBatch(query, BATCH_SIZE);
            }
        }

        // Update cache query/country key *after* successful fetch
        if (providerName === 'peapix') {
            this.currentBatchCountry = newCacheKey;
            this.currentBatchQuery = null; // Clear the other key type
        } else {
            this.currentBatchQuery = newCacheKey;
            this.currentBatchCountry = null; // Clear the other key type
        }
        logger.debug(`[ImageBackgroundHandler] Batch fetch successful for key: ${newCacheKey}. Added ${this.imageCache.length} images to cache.`);

    } catch (error) {
        logger.error(`[ImageBackgroundHandler] Error during batch fetch from ${providerName}:`, error);
        this.imageCache = []; // Clear cache on error
        // Re-throw the error so the awaiting caller (_fetchImageData) can handle it appropriately
        throw error; // This could be RateLimitError or a generic Error
    } finally {
        this.isFetchingBatch = false;
        logger.debug(`[ImageBackgroundHandler] Batch fetch process finished for provider: ${providerName}.`);
    }
  }


  /**
   * Handles displaying a fetched image: preloading, applying styles, cross-fading, and updating state.
   * @param {object | null} imageData - The fetched image data object or an error object {error: string, message: string}.
   * @param {boolean} isInitialLoad - True if this is the first image load.
   * @param {boolean} [isFavorite=false] - Optional flag to indicate if the image is known to be a favorite.
   * @returns {Promise<void>}
   * @private
   */
  async _displayImage(imageData, isInitialLoad, isFavorite = false) {
    const targetContainer = isInitialLoad ? this.activeContainer : this.inactiveContainer;
    let finalImageUrl = null;
    let metadataForState = null;
    let displayPlaceholder = false;
    let placeholderText = 'Error loading image'; // Default error text

    // Reset target container before loading new content or placeholder
    targetContainer.style.backgroundImage = 'none';
    targetContainer.style.backgroundColor = '#111'; // Fallback while loading/error

    // Check if imageData indicates an error or is invalid
    if (!imageData || imageData.error || !imageData.url) {
        displayPlaceholder = true;
        if (imageData && imageData.message) {
            placeholderText = imageData.message; // Use specific message if available
        }
        logger.error(`[ImageBackgroundHandler] Cannot display image. Reason: ${placeholderText}`, imageData || 'imageData is null');
        metadataForState = null; // Ensure state is cleared on error
    } else {
        // Valid image data
        finalImageUrl = imageData.url;
        metadataForState = { ...imageData }; // Prepare metadata for state
        // Set isFavorite flag if provided (e.g., when loading directly from favorites)
        if (isFavorite) {
            metadataForState.isFavorite = true;
        }
        // Note: isFavorite status might be updated later by FavoritesService listener
    }

    if (displayPlaceholder) {
        // Use placeholder.com for visual feedback
        const encodedText = encodeURIComponent(placeholderText);
        targetContainer.style.backgroundImage = `url('https://via.placeholder.com/1920x1080.png/333333/FFFFFF?text=${encodedText}')`;
        this.applyStyles(targetContainer); // Apply styles even to placeholder
        logger.debug(`[ImageBackgroundHandler] Displaying placeholder in ${targetContainer.id}: ${placeholderText}`);
    } else if (finalImageUrl) {
        // Preload and display the actual image
        try {
            await this.preloadImage(finalImageUrl);
            logger.debug(`[ImageBackgroundHandler] Image preloaded: ${finalImageUrl}`); // Changed to debug
            targetContainer.style.backgroundImage = `url('${finalImageUrl}')`;
            this.applyStyles(targetContainer);

            if (!isInitialLoad) {
                // Perform the cross-fade
                logger.debug(`[ImageBackgroundHandler] Cross-fading to ${targetContainer.id}`); // Changed to debug
                this.inactiveContainer.style.opacity = '1';
                this.activeContainer.style.opacity = '0';

                // Swap active/inactive references
                const temp = this.activeContainer;
                this.activeContainer = this.inactiveContainer;
                this.inactiveContainer = temp;
                logger.debug(`[ImageBackgroundHandler] Active container is now ${this.activeContainer.id}`); // Changed to debug
            } else {
                 logger.debug(`[ImageBackgroundHandler] Initial load, setting active container ${this.activeContainer.id}`); // Changed to debug
            }
            this.currentImageUrl = finalImageUrl; // Update current URL

        } catch (preloadError) {
            logger.error(`[ImageBackgroundHandler] Error preloading image ${finalImageUrl}:`, preloadError);
            targetContainer.style.backgroundImage = `url('https://via.placeholder.com/1920x1080.png/FF0000/FFFFFF?text=Error:+Failed+to+preload')`;
            this.applyStyles(targetContainer);
            metadataForState = null; // Clear metadata on preload error
        }
    }

    // Update StateManager regardless of success/failure
    this._updateStateMetadata(metadataForState);
  }


  /**
   * Loads a specific image URL, typically from a favorite. Bypasses batching.
   * @param {object} imageData - The full favorite image data object.
   * @returns {Promise<void>}
   */
  async loadImageFromUrl(imageData) {
    if (!imageData || !imageData.url) {
      logger.error('[ImageBackgroundHandler] loadImageFromUrl called with invalid data:', imageData);
      return;
    }
    if (this.isLoading) {
      logger.warn('[ImageBackgroundHandler] loadImageFromUrl called while already loading.');
      return;
    }
    this.isLoading = true;
    logger.debug('[ImageBackgroundHandler] loadImageFromUrl called:', imageData.url);
    try {
        // Directly call displayImage, passing the favorite data and setting isFavorite flag
        // This loads into the *inactive* container and fades.
        await this._displayImage(imageData, false, true); // isInitialLoad=false, isFavorite=true
    } catch (error) {
        logger.error('[ImageBackgroundHandler] Unexpected error in loadImageFromUrl:', error);
        this._updateStateMetadata(null); // Clear metadata on error
        // Optionally display a generic error placeholder in inactive container
        const targetContainer = this.inactiveContainer;
        if (targetContainer) {
            targetContainer.style.backgroundImage = `url('https://via.placeholder.com/1920x1080.png/FF0000/FFFFFF?text=Error+Loading+Favorite')`;
            this.applyStyles(targetContainer);
        }
    } finally {
        this.isLoading = false;
    }
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
      img.onerror = (err) => reject(err); // Pass the error object
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
        // logger.debug(`[ImageBackgroundHandler] Zoom effect enabled for ${container.id}`); // Keep debug logs commented for now
    } else {
        container.classList.remove('zoom-effect');
        // logger.debug(`[ImageBackgroundHandler] Zoom effect disabled for ${container.id}`); // Keep debug logs commented for now
    }
  }

  /**
   * Updates the StateManager with the current image metadata.
   * @param {object | null} metadata - The metadata object or null to clear it.
   * @private
   */
  _updateStateMetadata(metadata) {
      // Check if metadata is substantially different from current state before updating
      const currentMeta = StateManager.getState().currentImageMetadata;
      // Basic check: compare URLs or if one is null and the other isn't
      if (metadata?.url !== currentMeta?.url || (metadata && !currentMeta) || (!metadata && currentMeta)) {
          logger.debug('[ImageBackgroundHandler] Updating StateManager with image metadata:', metadata); // Keep as log for now
          StateManager.update({ currentImageMetadata: metadata });
      } else {
          logger.debug('[ImageBackgroundHandler] Metadata unchanged, skipping state update.'); // Changed to debug
      }
  }

  /**
   * Fetches and applies the next image from the cache or a new batch.
   * @returns {Promise<void>}
   */
  async loadNext() {
    logger.debug('[ImageBackgroundHandler] loadNext called.');
    // Simply call loadImage with isInitialLoad = false
    await this.loadImage(false);
  }

  /**
   * Cleans up resources used by the handler.
   */
  destroy() {
    logger.debug('[ImageBackgroundHandler] Destroying...');
    // Reset styles on both containers
    if (this.containerA) {
        this.containerA.style.backgroundImage = 'none';
        this.containerA.style.opacity = '1'; // Reset opacity
        this.containerA.classList.remove('zoom-effect');
    }
     if (this.containerB) {
        this.containerB.style.backgroundImage = 'none';
        this.containerB.style.opacity = '0';
        this.containerB.classList.remove('zoom-effect');
    }
    // Clear cache and flags
    this.imageCache = [];
    this.currentBatchQuery = null;
    this.currentBatchCountry = null;
    this.isFetchingBatch = false;
    // Cancel any ongoing fetches if implemented (e.g., using AbortController)
  }
}
