import { StateManager } from '../core/state-manager.js';
import { EventBus } from '../core/event-bus.js';
import * as logger from '../utils/logger.js';
import { RateLimitError } from '../core/errors.js';
import { determineImageQueryKey } from './utils/background-helpers.js';
import { ImageCacheManager } from './image-cache-manager.js'; // Import new class
import { ImageFetcher } from './image-fetcher.js'; // Import new class

const PROACTIVE_FETCH_THRESHOLD = 2; // Fetch next batch when cache size is <= this value

/**
 * Handles loading and displaying image backgrounds with cross-fade.
 * Coordinates image fetching and caching.
 */
export class ImageBackgroundHandler {
  /**
   * Creates an ImageBackgroundHandler instance.
   * @param {HTMLElement} containerA - The first DOM element for background layer.
   * @param {HTMLElement} containerB - The second DOM element for background layer.
   * @param {object} initialConfig - The initial background configuration from state.
   * @param {Map<string, object>} providers - Map of available image provider instances.
   * @param {ConfigManager} configManager - The application's configuration manager.
   * @param {FavoritesService} favoritesService - Service for managing favorite images.
   */
  constructor(containerA, containerB, initialConfig, providers, configManager, favoritesService) {
    this.containerA = containerA;
    this.containerB = containerB;
    this.activeContainer = containerA;
    this.inactiveContainer = containerB;
    this.config = initialConfig;
    // Removed providers map, passed to fetcher
    this.configManager = configManager; // Keep for feature flags? Or pass to fetcher only? Keep for now.
    this.favoritesService = favoritesService;
    this.type = 'image';
    this.currentImageUrl = null;
    this.isLoading = false; // Tracks loading state for loadImage/loadNext
    this.isProactivelyFetching = false; // Tracks background fetching state

    // Instantiate helper classes
    this.cacheManager = new ImageCacheManager(initialConfig);
    logger.debug('[ImageBackgroundHandler] Instantiating helpers. CacheManager done.'); // Reverted to logger.debug
    logger.debug('[ImageBackgroundHandler] Attempting to instantiate ImageFetcher...'); // Reverted to logger.debug
    try {
        this.fetcher = new ImageFetcher(providers, configManager); // Pass dependencies
        logger.debug('[ImageBackgroundHandler] ImageFetcher instantiated successfully:', this.fetcher); // Reverted to logger.debug
    } catch (error) {
         logger.error('[ImageBackgroundHandler] !!! FAILED to instantiate ImageFetcher !!!', error);
         this.fetcher = null; // Ensure fetcher is null if instantiation fails
    }


    logger.debug('[ImageBackgroundHandler] Refactored Created with config:', initialConfig); // Reverted to logger.debug
  }

  /**
   * Initializes the handler, loading the first image.
   * @returns {Promise<void>}
   */
  async init() {
    logger.debug('[ImageBackgroundHandler] Initializing...');
    this.containerA.style.opacity = '1';
    this.containerB.style.opacity = '0';
    this.containerA.style.backgroundColor = '#000'; // Fallback color
    this.containerB.style.backgroundColor = '#000';

    // Initial load uses loadImage
    await this.loadImage(true);
  }

  /**
   * Updates the handler based on new configuration.
   * @param {object} newConfig - The updated background configuration.
   * @returns {Promise<void>}
   */
  async update(newConfig) {
    const oldConfig = { ...this.config };
    const oldUseFavoritesOnly = oldConfig.useFavoritesOnly ?? false;
    this.config = { ...this.config, ...newConfig };
    const newUseFavoritesOnly = this.config.useFavoritesOnly ?? false;
    logger.debug('[ImageBackgroundHandler] Updating config. Old:', oldConfig, 'New:', this.config);

    // Update cache manager's storage key if config changed relevant parts
    const needsCacheUpdate = this.cacheManager.updateConfig(this.config); // updateConfig returns true if key changed

    let needsReload = false;

    // Reload if storage key changed OR if favorites-only was just enabled
    if (needsCacheUpdate || (!oldUseFavoritesOnly && newUseFavoritesOnly)) {
        needsReload = true;
    }

    // Determine the current query/country key based on the new config
    const newQueryKey = determineImageQueryKey(this.config);

    if (needsReload) {
      logger.debug('[ImageBackgroundHandler] Config change requires reload, loading new image.');
      // Don't load if category is 'Other' and custom is empty
       if (this.config.source !== 'peapix' && this.config.category === 'Other' && !newQueryKey) {
           logger.debug('[ImageBackgroundHandler] Skipping reload because custom category is empty.');
           await this._displayImage({ error: 'custom_category_empty', message: 'Enter Custom Category' }, false);
       } else {
           await this.loadImage(); // Load into inactive container and fade
       }
    } else {
      logger.debug('[ImageBackgroundHandler] Config change does not require reload, applying styles only.');
      this.applyStyles(this.activeContainer);
    }
  }

  /**
   * Loads the next background image, coordinating fetch and display.
   * @param {boolean} [isInitialLoad=false] - If true, loads into the active container without fading.
   * @returns {Promise<void>}
   */
  async loadImage(isInitialLoad = false) {
    if (this.isLoading) {
      logger.warn('[ImageBackgroundHandler] loadImage called while already loading.');
      return;
    }
    this.isLoading = true;
    logger.debug(`[ImageBackgroundHandler] loadImage called (isInitialLoad: ${isInitialLoad})`); // Reverted to logger.debug

    try {
        const imageData = await this._getImageData(); // Get data (handles favorites, cache, fetch coordination)
        await this._displayImage(imageData, isInitialLoad); // Display image or placeholder
    } catch (error) {
        logger.error('[ImageBackgroundHandler] Unexpected error during loadImage process:', error);
         await this._displayImage({ error: 'unexpected_error', message: 'Unexpected Error' }, isInitialLoad);
    } finally {
        this.isLoading = false;
        logger.debug(`[ImageBackgroundHandler] loadImage finished (isInitialLoad: ${isInitialLoad})`); // Reverted to logger.debug
    }
  }

  /**
   * Gets the next image data object, handling favorites, cache, and triggering fetches.
   * @returns {Promise<object|null>} The image data object or an error object {error: string, message: string}.
   * @private
   */
  async _getImageData() {
    // 1. Check Favorites Logic (remains similar)
    const useFavoritesOnly = this.config.useFavoritesOnly ?? false;
    const favoritesCount = this.favoritesService.getFavoritesCount();
    if (useFavoritesOnly && favoritesCount < 2) {
        return { error: 'insufficient_favorites', message: 'At least 2 favorites required' };
    }
    if (useFavoritesOnly || (Math.random() < 0.1 && favoritesCount >= 2)) {
        const favorite = this.favoritesService.getRandomFavorite();
        if (favorite) return favorite;
        if (useFavoritesOnly) return { error: 'favorites_error', message: 'Error loading favorite' };
        logger.warn('[ImageBackgroundHandler] Random favorite selection failed, using provider/cache.');
    }

    // 2. Check Cache & Fetch if Empty
    if (this.cacheManager.getCacheSize() === 0) {
        logger.debug('[ImageBackgroundHandler] Cache empty, fetching initial batch.'); // Reverted to logger.debug
        try {
            const newBatch = await this.fetcher.fetchImageBatch(this.config);
            if (newBatch.length > 0) {
                this.cacheManager.addImageBatch(newBatch);
            } else {
                 logger.error('[ImageBackgroundHandler] Initial batch fetch returned no images.');
                 return { error: 'batch_fetch_empty', message: 'No images found' };
            }
        } catch (error) {
             logger.error('[ImageBackgroundHandler] Error awaiting initial batch fetch:', error);
             // Map specific errors if needed (e.g., RateLimitError)
             return { error: 'batch_fetch_error', message: `Error loading images` };
        }
    }

    // 3. Select Image from Cache (using CacheManager)
    const selectedImageData = this.cacheManager.selectRandomImage(this.currentImageUrl);
    if (!selectedImageData) {
         logger.error('[ImageBackgroundHandler] Failed to select image from cache.');
         // Maybe trigger immediate fetch here? For now, return error.
         return { error: 'cache_selection_failed', message: 'Failed to select image' };
    }

    // 4. Trigger Proactive Fetch if Needed
    if (this.cacheManager.getCacheSize() <= PROACTIVE_FETCH_THRESHOLD && !this.isProactivelyFetching) {
        this.isProactivelyFetching = true;
        logger.debug(`[ImageBackgroundHandler] Cache low (${this.cacheManager.getCacheSize()}), triggering proactive fetch.`); // Reverted to logger.debug
        this.fetcher.fetchImageBatch(this.config)
            .then(newBatch => {
                if (newBatch.length > 0) {
                    // Note: Adding to cache here might overwrite cache loaded from DB
                    // if user changed config between selection and proactive fetch completion.
                    // CacheManager handles its own storage key, so this should be fine.
                    this.cacheManager.addImageBatch(newBatch);
                    logger.debug(`[ImageBackgroundHandler] Proactive fetch succeeded, added ${newBatch.length} images.`); // Reverted to logger.debug
                } else {
                     logger.warn('[ImageBackgroundHandler] Proactive fetch returned no images.');
                }
            })
            .catch(error => {
                logger.warn('[ImageBackgroundHandler] Error during proactive background batch fetch:', error);
            })
            .finally(() => {
                this.isProactivelyFetching = false;
            });
    }

    return selectedImageData;
  }

  /**
   * Handles displaying a fetched image: preloading, applying styles, cross-fading, and updating state.
   * (Logic remains largely the same, simplified slightly)
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
    let placeholderText = 'Error loading image';

    targetContainer.style.backgroundImage = 'none';
    targetContainer.style.backgroundColor = '#111';

    if (!imageData || imageData.error || !imageData.url) {
        displayPlaceholder = true;
        placeholderText = imageData?.message || placeholderText;
        logger.error(`[ImageBackgroundHandler] Cannot display image. Reason: ${placeholderText}`, imageData || 'imageData is null');
        metadataForState = null;
    } else {
        finalImageUrl = imageData.url;
        metadataForState = { ...imageData };
        if (isFavorite) metadataForState.isFavorite = true;
    }

    if (displayPlaceholder) {
        const placeholderSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080"><rect width="100%" height="100%" fill="#333"/><text x="50%" y="50%" font-family="Arial" font-size="24" fill="#FFF" text-anchor="middle" dy=".3em">${placeholderText}</text></svg>`;
        targetContainer.style.backgroundImage = `url('data:image/svg+xml,${encodeURIComponent(placeholderSvg)}')`;
        this.applyStyles(targetContainer);
        logger.debug(`[ImageBackgroundHandler] Displaying placeholder: ${placeholderText}`);
    } else if (finalImageUrl) {
        try {
            await this.preloadImage(finalImageUrl);
            logger.debug(`[ImageBackgroundHandler] Image preloaded: ${finalImageUrl.substring(0, 70)}...`);
            targetContainer.style.backgroundImage = `url('${finalImageUrl}')`;
            this.applyStyles(targetContainer);

            if (!isInitialLoad) {
                logger.debug(`[ImageBackgroundHandler] Cross-fading to ${targetContainer.id}`);
                this.inactiveContainer.style.opacity = '1';
                this.activeContainer.style.opacity = '0';
                // Swap active/inactive references
                [this.activeContainer, this.inactiveContainer] = [this.inactiveContainer, this.activeContainer];
                logger.debug(`[ImageBackgroundHandler] Active container is now ${this.activeContainer.id}`);
            } else {
                 logger.debug(`[ImageBackgroundHandler] Initial load, setting active container ${this.activeContainer.id}`);
            }
            this.currentImageUrl = finalImageUrl;

        } catch (preloadError) {
            logger.error(`[ImageBackgroundHandler] Error preloading image ${finalImageUrl}:`, preloadError);
            const errorSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080"><rect width="100%" height="100%" fill="#A00"/><text x="50%" y="50%" font-family="Arial" font-size="24" fill="#FFF" text-anchor="middle" dy=".3em">Error Preloading Image</text></svg>`;
            targetContainer.style.backgroundImage = `url('data:image/svg+xml,${encodeURIComponent(errorSvg)}')`;
            this.applyStyles(targetContainer);
            metadataForState = null;
        }
    }

    this._updateStateMetadata(metadataForState);
  }

  /**
   * Loads a specific image URL, typically from a favorite. Bypasses batching/caching.
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
    logger.debug('[ImageBackgroundHandler] loadImageFromUrl called:', imageData.url.substring(0,70)+'...');
    try {
        // Directly display, setting isFavorite flag
        await this._displayImage(imageData, false, true);
    } catch (error) {
        logger.error('[ImageBackgroundHandler] Unexpected error in loadImageFromUrl:', error);
        this._updateStateMetadata(null);
        // Optionally display error placeholder
        const errorSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080"><rect width="100%" height="100%" fill="#A00"/><text x="50%" y="50%" font-family="Arial" font-size="24" fill="#FFF" text-anchor="middle" dy=".3em">Error Loading Favorite</text></svg>`;
        this.inactiveContainer.style.backgroundImage = `url('data:image/svg+xml,${encodeURIComponent(errorSvg)}')`;
        this.applyStyles(this.inactiveContainer);
    } finally {
        this.isLoading = false;
    }
  }

  /** Preloads an image URL. */
  preloadImage(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = resolve;
      img.onerror = reject;
      img.src = url;
    });
  }

  /** Applies common background styles. */
  applyStyles(container) {
    if (!container) return;
    container.style.backgroundSize = 'cover';
    container.style.backgroundPosition = 'center center';
    container.style.backgroundRepeat = 'no-repeat';
    const zoomEnabled = this.config?.zoomEnabled ?? true;
    container.classList.toggle('zoom-effect', zoomEnabled);
  }

  /** Updates StateManager with image metadata. */
  _updateStateMetadata(metadata) {
      const currentMeta = StateManager.getState().currentImageMetadata;
      if (metadata?.url !== currentMeta?.url || (metadata && !currentMeta) || (!metadata && currentMeta)) {
          logger.debug('[ImageBackgroundHandler] Updating StateManager metadata.');
          StateManager.update({ currentImageMetadata: metadata });
      } else {
          logger.debug('[ImageBackgroundHandler] Metadata unchanged, skipping state update.');
      }
  }

  /** Fetches and applies the next image. */
  async loadNext() {
    logger.debug('[ImageBackgroundHandler] loadNext called.');
    await this.loadImage(false);
  }

  /** Cleans up resources. */
  destroy() {
    logger.debug('[ImageBackgroundHandler] Destroying...');
    if (this.containerA) {
        this.containerA.style.backgroundImage = 'none';
        this.containerA.style.opacity = '1';
        this.containerA.classList.remove('zoom-effect');
    }
     if (this.containerB) {
        this.containerB.style.backgroundImage = 'none';
        this.containerB.style.opacity = '0';
        this.containerB.classList.remove('zoom-effect');
    }
    // No cache to clear here, managed by ImageCacheManager instance if needed externally
    this.isLoading = false;
    this.isProactivelyFetching = false;
  }
}
