import { StateManager } from '../core/state-manager.js';
import { EventBus } from '../core/event-bus.js';
import * as logger from '../utils/logger.js'; // Import the logger
import { RateLimitError } from '../core/errors.js';
import { determineImageQueryKey } from './utils/background-helpers.js';

const PROACTIVE_FETCH_THRESHOLD = 2; // Fetch next batch when cache size is <= this value
const BATCH_SIZE = 10; // Default number of images to fetch in a batch
const CACHE_STORAGE_KEY_PREFIX = 'ambientClock_imageCache_'; // Prefix for localStorage keys

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
  constructor(containerA, containerB, initialConfig, providers, configManager, favoritesService) {
    this.containerA = containerA;
    this.containerB = containerB;
    this.activeContainer = containerA; // Start with A as active
    this.inactiveContainer = containerB;
    this.config = initialConfig;
    this.providers = providers; // Map of provider instances
    this.configManager = configManager;
    this.favoritesService = favoritesService;
    this.type = 'image';
    this.currentImageUrl = null; // URL of the image in the *active* container
    this.isLoading = false; // Tracks if currently processing loadImage/loadNext
    this.imageCache = []; // Holds the current batch of image data objects
    this.currentBatchQuery = null; // Query used for the current cache
    this.currentBatchCountry = null; // Country code used for the current cache (Peapix)
    this.isFetchingBatch = false;
    this.storageKey = this._getStorageKey(initialConfig); // Generate initial storage key

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

    // Attempt to load cache from localStorage
    this._loadCacheFromStorage();

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
    const oldUseFavoritesOnly = oldConfig.useFavoritesOnly ?? false; // Get previous value
    this.config = { ...this.config, ...newConfig };
    const newUseFavoritesOnly = this.config.useFavoritesOnly ?? false; // Get new value
    const newStorageKey = this._getStorageKey(this.config); // Get new storage key
    logger.debug('[ImageBackgroundHandler] Updating config. Old:', oldConfig, 'New:', this.config);

    let needsReload = false;
    let needsCacheClear = false; // Flag to clear cache

    // Check if storage key changed (means provider or query/country changed)
    if (newStorageKey !== this.storageKey) {
        logger.debug(`[ImageBackgroundHandler] Storage key changed from "${this.storageKey}" to "${newStorageKey}". Clearing cache and reloading.`);
        this.storageKey = newStorageKey; // Update the key
        needsCacheClear = true;
        // Determine if reload is needed based on new key validity
        const newQueryKey = determineImageQueryKey(this.config);
        if (this.config.source !== 'peapix' && this.config.category === 'Other' && !newQueryKey) {
            needsReload = false; // Don't reload if 'Other' category is empty
        } else {
            needsReload = true;
        }
        // Load cache for the *new* key if it exists
        this._loadCacheFromStorage();
    }

    // Check if 'Use Favorites Only' was just enabled
    if (!oldUseFavoritesOnly && newUseFavoritesOnly) {
        logger.debug('[ImageBackgroundHandler] "Use Favorites Only" was enabled.');
        needsReload = true;
        // No need to clear cache just for enabling favorites only mode
    }

    // Determine the current query/country key based on the new config (needed below)
    const newQueryKey = determineImageQueryKey(this.config);

    // Check if 'Use Favorites Only' was just enabled (this logic remains)
    if (!oldUseFavoritesOnly && newUseFavoritesOnly) {
        logger.debug('[ImageBackgroundHandler] "Use Favorites Only" was enabled.');
        // No need to clear cache, but might need reload if cache is empty for current key
        if (this.imageCache.length === 0) {
            needsReload = true;
        }
    }

    // Clear in-memory cache if flagged (e.g., storage key changed)
    // Note: We don't clear localStorage here, just the in-memory representation.
    // The next fetch for the new key will overwrite the corresponding localStorage entry.
    if (needsCacheClear) {
        logger.debug('[ImageBackgroundHandler] Clearing in-memory image cache due to config change.');
        this.imageCache = [];
        // Reset batch keys as well, they are tied to the in-memory cache
        this.currentBatchQuery = null;
        this.currentBatchCountry = null;
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
    // Check if we should use favorites
    const useFavoritesOnly = this.config.useFavoritesOnly ?? false;
    const favoritesCount = this.favoritesService.getFavoritesCount();

    // If using favorites only mode, check minimum favorites requirement
    if (useFavoritesOnly) {
        if (favoritesCount < 2) {
            logger.warn('[ImageBackgroundHandler] Favorites-only mode requires at least 2 favorites.');
            return { error: 'insufficient_favorites', message: 'At least 2 favorites are required to use favorites-only mode.' };
        }
    }

    // If using favorites only mode or random chance (10%) with available favorites
    if ((useFavoritesOnly || (Math.random() < 0.1 && favoritesCount >= 2))) {
        const favorite = this.favoritesService.getRandomFavorite();
        if (favorite) {
            logger.debug('[ImageBackgroundHandler] Using random favorite:', favorite);
            return favorite;
        }
        // If favorites-only mode and getRandomFavorite failed, show error
        if (useFavoritesOnly) {
            logger.error('[ImageBackgroundHandler] Failed to get random favorite in favorites-only mode.');
            return { error: 'favorites_error', message: 'Error loading favorite image.' };
        }
        // If random chance but failed to get favorite, fall through to normal provider logic
        logger.warn('[ImageBackgroundHandler] Random favorite selection failed, using provider instead.');
    }

    // Normal provider logic
    const providerName = this.config.source || 'unsplash';
    const currentQueryKey = determineImageQueryKey(this.config); // Use helper

    // Handle cases where query key is null (e.g., 'Other' category with no input)
    if (currentQueryKey === null) {
        logger.warn('[ImageBackgroundHandler] Cannot fetch: Query key is null (likely "Other" category with empty custom input).');
        return { error: 'custom_category_empty', message: 'Enter Custom Category' };
    }

    // --- Persistent Cache Logic ---
    logger.debug(`[ImageBackgroundHandler] _fetchImageData: Checking in-memory cache. Current size: ${this.imageCache.length}`);

    // 1. Check In-Memory Cache & Fetch Batch if Needed
    if (this.imageCache.length === 0) {
        logger.debug(`[ImageBackgroundHandler] In-memory cache empty. Fetching new batch for key: ${currentQueryKey}.`);
        try {
            // Await the initial fetch because we need an image *now*.
            await this._fetchImageBatch(); // This now saves to localStorage too
            if (this.imageCache.length === 0) {
                // If fetch succeeded but returned no images
                logger.error('[ImageBackgroundHandler] Batch fetch returned no images.');
                return { error: 'batch_fetch_empty', message: 'No images found' };
            }
        } catch (error) {
            logger.error('[ImageBackgroundHandler] Error awaiting initial batch fetch:', error);
            if (error instanceof RateLimitError || error.name === 'RateLimitError') {
                logger.warn(`[ImageBackgroundHandler] Rate limit hit during initial fetch for ${providerName}.`);
                return { error: 'rate_limit', message: `API limit reached for ${providerName}. Try again later.` };
            }
            return { error: 'batch_fetch_error', message: `Error loading from ${providerName}` };
        }
    } else {
         logger.debug(`[ImageBackgroundHandler] In-memory cache hit! Using existing cache.`);
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
    this.imageCache.splice(randomIndex, 1); // Remove selected image from in-memory cache
    this._saveCacheToStorage(); // Save updated cache to localStorage
    logger.debug(`[ImageBackgroundHandler] Selected image from cache (Index: ${randomIndex}, URL: ${selectedImageData?.url?.substring(0, 50)}...). Cache size: ${cacheSizeBefore} -> ${this.imageCache.length}. Saved to storage.`);

    // 3. Trigger Proactive Fetch if Needed (logic remains the same)
    if (this.imageCache.length <= PROACTIVE_FETCH_THRESHOLD && !this.isFetchingBatch) {
        logger.debug(`[ImageBackgroundHandler] Cache size (${this.imageCache.length}) <= threshold (${PROACTIVE_FETCH_THRESHOLD}). Triggering proactive background fetch for key: ${currentQueryKey}.`);
        this._fetchImageBatch().catch(error => { // Fetch also saves to storage on success
            logger.warn('[ImageBackgroundHandler] Error during proactive background batch fetch:', error);
        });
    } else if (this.isFetchingBatch) {
         logger.debug(`[ImageBackgroundHandler] Proactive fetch skipped: Already fetching batch.`);
    }

    return selectedImageData;
  }


  /**
   * Fetches a batch of images from the provider and populates the cache.
   * Handles the isFetchingBatch flag and errors including RateLimitError.
   * @private
   */
  async _fetchImageBatch() {
    // --- Vercel DB Logic ---
    const useDb = import.meta.env.USE_IMAGE_DB === 'true';
    const currentProviderNameForDb = this.config.source || 'unsplash'; // Provider name needed for DB query/fallback

    if (useDb && Math.random() < 0.9) {
        // 90% chance: Try fetching from DB API
        logger.debug(`[ImageBackgroundHandler] Attempting fetch from DB API for provider: ${currentProviderNameForDb}`);
        try {
            const apiUrl = `/api/images?provider=${encodeURIComponent(currentProviderNameForDb)}&count=${BATCH_SIZE}`;
            const response = await fetch(apiUrl);
            if (!response.ok) {
                throw new Error(`DB API request failed with status ${response.status}`);
            }
            const data = await response.json();
            if (data.urls && data.urls.length > 0) {
                this.imageCache = data.urls;
                this.currentBatchQuery = determineImageQueryKey(this.config); // Keep track of query for consistency
                this.currentBatchCountry = (currentProviderNameForDb === 'peapix') ? this.currentBatchQuery : null;
                this._saveCacheToStorage(); // Save DB results to local cache too
                logger.debug(`[ImageBackgroundHandler] Successfully fetched ${this.imageCache.length} images from DB API for ${currentProviderNameForDb}.`);
                // No need to set isFetchingBatch = false here, as we are returning early
                return; // Successfully fetched from DB, skip provider fetch
            } else {
                logger.warn(`[ImageBackgroundHandler] DB API returned no URLs for ${currentProviderNameForDb}. Falling back to provider API.`);
                // Fall through to provider fetch logic below
            }
        } catch (error) {
            logger.error('[ImageBackgroundHandler] Error fetching from DB API. Falling back to provider API.', error);
            // Fall through to provider fetch logic below
        }
    }
    // --- End Vercel DB Logic ---

    // --- Original Provider Fetch Logic (or fallback from DB) ---
    if (this.isFetchingBatch) {
        logger.debug('[ImageBackgroundHandler] _fetchImageBatch called while already fetching.');
        return; // Prevent concurrent fetches
    }
    this.isFetchingBatch = true;

    // Get initial provider name from config
    let currentProviderName = this.config.source || 'unsplash';
    
    // Create ordered list of providers to try (excluding Peapix as it uses different params)
    let providerFallbackOrder = [];
    
    // Start with the current provider
    if (currentProviderName !== 'peapix') {
        providerFallbackOrder.push(currentProviderName);
    }
    
    // Add remaining providers in order, excluding the current one and Peapix
    ['unsplash', 'pexels'].forEach(name => {
        if (name !== currentProviderName && name !== 'peapix') {
            providerFallbackOrder.push(name);
        }
    });

    let lastError = null;
    // let query = ''; // No longer needed here
    // let countryCode = null; // No longer needed here
    let newCacheKey = null;

    // Special handling for Peapix - no fallback since it uses country codes
    if (currentProviderName === 'peapix') {
        const provider = this.providers.get('peapix');
        if (!provider || typeof provider.getImageBatch !== 'function') {
            this.isFetchingBatch = false;
            throw new Error('Invalid provider or missing getImageBatch for peapix');
        }

        try {
            newCacheKey = determineImageQueryKey(this.config); // Use helper
            if (newCacheKey === null) { // Should not happen if provider is peapix, but safeguard
                 this.isFetchingBatch = false;
                 throw new Error('Cannot fetch for Peapix without a country code.');
            }
            logger.debug(`[ImageBackgroundHandler] Fetching batch for Peapix, country: ${newCacheKey}`);
            const fetchedBatch = await provider.getImageBatch(null, BATCH_SIZE, newCacheKey);
            this.imageCache = fetchedBatch; // Update in-memory cache
            this.currentBatchCountry = newCacheKey;
            this.currentBatchQuery = null;
            this._saveCacheToStorage(); // Save to localStorage
            logger.debug(`[ImageBackgroundHandler] Peapix batch fetch successful. Added ${this.imageCache.length} images to cache and storage.`);
            this.isFetchingBatch = false;
            return;
        } catch (error) {
            logger.error('[ImageBackgroundHandler] Error during Peapix batch fetch:', error);
            this.imageCache = []; // Clear in-memory cache on error
            this._saveCacheToStorage(); // Persist the empty cache
            this.isFetchingBatch = false;
            throw error; // Re-throw to be handled by caller
        }
    }

    // For non-Peapix providers, try each one in order until success
    for (const providerName of providerFallbackOrder) {
        const provider = this.providers.get(providerName);
        if (!provider || typeof provider.getImageBatch !== 'function') {
            logger.warn(`[ImageBackgroundHandler] Provider "${providerName}" not found or invalid, trying next...`);
            continue;
        }

        try {
            newCacheKey = determineImageQueryKey(this.config); // Use helper

            // Skip fetch if query key is null (e.g., 'Other' category with no input)
            if (newCacheKey === null) {
                logger.debug('[ImageBackgroundHandler] Skipping fetch: Query key is null.');
                this.imageCache = []; // Clear cache
                this.isFetchingBatch = false;
                return; // Don't throw, just return as no fetch is possible
            }

            logger.debug(`[ImageBackgroundHandler] Trying batch fetch from ${providerName}, query: "${newCacheKey}"`);
            const fetchedBatch = await provider.getImageBatch(newCacheKey, BATCH_SIZE);
            this.imageCache = fetchedBatch; // Update in-memory cache

            // If successful, update cache keys and save
            this.currentBatchQuery = newCacheKey;
            this.currentBatchCountry = null;
            this._saveCacheToStorage(); // Save to localStorage

            // If this wasn't the original provider, update the config (logic remains)
            if (providerName !== currentProviderName) {
                logger.log(`[ImageBackgroundHandler] Switched to provider ${providerName} due to rate limit on ${currentProviderName}`);
                // Update both source and provider in config
                this.config.source = providerName;
                this.config.provider = providerName;
                // Notify state of provider change while preserving query and other settings
                const currentState = StateManager.getNestedValue(StateManager.getState(), 'settings.background') || {};
                // Ensure both source and provider are updated together
                const updatedState = {
                    ...currentState,
                    source: providerName,
                    provider: providerName,
                    // Ensure query is set correctly in the updated state
                    query: (providerName === 'peapix') ? currentState.query : newCacheKey,
                    peapixCountry: (providerName === 'peapix') ? newCacheKey : currentState.peapixCountry
                };
                // Update state with synchronized fields, ensuring only relevant key (query or country) is active
                StateManager.update({
                    settings: {
                        background: updatedState
                    }
                });
            }

            logger.debug(`[ImageBackgroundHandler] Batch fetch successful from ${providerName}. Added ${this.imageCache.length} images to cache and storage.`);

            // --- Vercel DB Logic: Add fetched URLs to DB (async, non-blocking) ---
            if (useDb) {
                const urlsToAddToDb = this.imageCache.map(img => ({
                    provider: providerName, // Use the provider we actually fetched from
                    url: img.url,
                    metadata: { // Include relevant metadata
                        author: img.author,
                        authorUrl: img.authorUrl,
                        description: img.description,
                        sourceUrl: img.sourceUrl, // Link back to original image page if available
                        // Add other relevant fields from imageData if needed
                    }
                }));
                if (urlsToAddToDb.length > 0) {
                    logger.debug(`[ImageBackgroundHandler] Asynchronously adding ${urlsToAddToDb.length} fetched URLs to DB via POST /api/images`);
                    fetch('/api/images', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ urls: urlsToAddToDb }),
                    })
                    .then(response => response.json())
                    .then(result => {
                        if (result.success) {
                            logger.debug(`[ImageBackgroundHandler] DB Add Result: Added ${result.added}, Skipped ${result.skipped}`);
                        } else {
                            logger.warn('[ImageBackgroundHandler] Failed to add URLs to DB via API:', result.error || 'Unknown error');
                        }
                    })
                    .catch(apiError => {
                        logger.error('[ImageBackgroundHandler] Error calling POST /api/images:', apiError);
                    });
                }
            }
            // --- End Vercel DB Logic ---

            this.isFetchingBatch = false;
            return; // Success, exit loop

        } catch (error) {
            lastError = error;
            // Check if error is RateLimitError or has RateLimitError in its name (for cross-module instanceof issues)
            if (error instanceof RateLimitError || error.name === 'RateLimitError') {
                logger.warn(`[ImageBackgroundHandler] Rate limit hit for ${providerName}, trying next provider...`);
                continue;
            } else {
                logger.error(`[ImageBackgroundHandler] Non-rate-limit error from ${providerName}:`, error);
                break; // Exit on non-rate-limit errors
            }
        }
    }

    // If loop finishes, all providers failed or we hit a non-rate-limit error
    this.imageCache = []; // Clear in-memory cache
    this._saveCacheToStorage(); // Persist the empty cache
    this.isFetchingBatch = false;
    throw lastError || new Error('All providers failed or were invalid'); // Re-throw the last error
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
        // Use data URL for placeholder to avoid external service dependencies
        const placeholderDataUrl = `data:image/svg+xml,${encodeURIComponent(`
            <svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080">
                <rect width="100%" height="100%" fill="#333333"/>
                <text x="50%" y="50%" font-family="Arial" font-size="24" fill="#FFFFFF" text-anchor="middle" dy=".3em">
                    ${placeholderText}
                </text>
            </svg>
        `)}`;
        targetContainer.style.backgroundImage = `url('${placeholderDataUrl}')`;
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
            // Use data URL for preload error placeholder
            const errorDataUrl = `data:image/svg+xml,${encodeURIComponent(`
                <svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080">
                    <rect width="100%" height="100%" fill="#FF0000"/>
                    <text x="50%" y="50%" font-family="Arial" font-size="24" fill="#FFFFFF" text-anchor="middle" dy=".3em">
                        Error: Failed to preload image
                    </text>
                </svg>
            `)}`;
            targetContainer.style.backgroundImage = `url('${errorDataUrl}')`;
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
            // Use data URL for favorite error placeholder
            const errorDataUrl = `data:image/svg+xml,${encodeURIComponent(`
                <svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080">
                    <rect width="100%" height="100%" fill="#FF0000"/>
                    <text x="50%" y="50%" font-family="Arial" font-size="24" fill="#FFFFFF" text-anchor="middle" dy=".3em">
                        Error Loading Favorite
                    </text>
                </svg>
            `)}`;
            targetContainer.style.backgroundImage = `url('${errorDataUrl}')`;
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

  // --- localStorage Cache Helpers ---

  /**
   * Generates the localStorage key for the current configuration.
   * @param {object} config - The background configuration object.
   * @returns {string} The localStorage key.
   * @private
   */
  _getStorageKey(config) {
      const provider = config?.source || 'default';
      const queryKey = determineImageQueryKey(config) || 'nokey';
      // Sanitize key parts to be safe for localStorage keys
      const safeProvider = provider.replace(/[^a-zA-Z0-9_-]/g, '');
      const safeQueryKey = queryKey.replace(/[^a-zA-Z0-9_-]/g, '');
      return `${CACHE_STORAGE_KEY_PREFIX}${safeProvider}_${safeQueryKey}`;
  }

  /**
   * Saves the current in-memory imageCache to localStorage.
   * @private
   */
  _saveCacheToStorage() {
      if (!this.storageKey) {
          logger.warn('[ImageBackgroundHandler] Cannot save cache: storageKey is not set.');
          return;
      }
      try {
          const cacheString = JSON.stringify(this.imageCache);
          localStorage.setItem(this.storageKey, cacheString);
          logger.debug(`[ImageBackgroundHandler] Saved cache (${this.imageCache.length} items) to localStorage key: ${this.storageKey}`);
      } catch (error) {
          logger.error(`[ImageBackgroundHandler] Error saving cache to localStorage (key: ${this.storageKey}):`, error);
          // Handle potential quota errors or other issues
          if (error.name === 'QuotaExceededError') {
              logger.warn('[ImageBackgroundHandler] localStorage quota exceeded. Consider clearing old caches or reducing batch size.');
              // Optionally, try to clear *this* cache entry to prevent blocking other storage
              localStorage.removeItem(this.storageKey);
          }
      }
  }

  /**
   * Loads the image cache from localStorage if it matches the current config.
   * Updates this.imageCache if a valid cache is found.
   * @private
   */
  _loadCacheFromStorage() {
      if (!this.storageKey) {
          logger.warn('[ImageBackgroundHandler] Cannot load cache: storageKey is not set.');
          return;
      }
      try {
          const storedCacheString = localStorage.getItem(this.storageKey);
          if (storedCacheString) {
              const storedCache = JSON.parse(storedCacheString);
              // Basic validation: check if it's an array
              if (Array.isArray(storedCache)) {
                  this.imageCache = storedCache;
                  // Update current batch keys based on the loaded cache's key
                  const keyParts = this.storageKey.replace(CACHE_STORAGE_KEY_PREFIX, '').split('_');
                  const provider = keyParts[0];
                  const queryOrCountry = keyParts.slice(1).join('_'); // Rejoin if key had underscores
                  if (provider === 'peapix') {
                      this.currentBatchCountry = queryOrCountry;
                      this.currentBatchQuery = null;
                  } else {
                      this.currentBatchQuery = queryOrCountry;
                      this.currentBatchCountry = null;
                  }
                  logger.log(`[ImageBackgroundHandler] Loaded cache (${this.imageCache.length} items) from localStorage key: ${this.storageKey}`);
              } else {
                  logger.warn(`[ImageBackgroundHandler] Invalid cache data found in localStorage for key ${this.storageKey}. Discarding.`);
                  localStorage.removeItem(this.storageKey); // Remove invalid data
                  this.imageCache = []; // Reset in-memory cache
              }
          } else {
              logger.debug(`[ImageBackgroundHandler] No cache found in localStorage for key: ${this.storageKey}`);
              this.imageCache = []; // Ensure in-memory cache is empty
          }
      } catch (error) {
          logger.error(`[ImageBackgroundHandler] Error loading or parsing cache from localStorage (key: ${this.storageKey}):`, error);
          this.imageCache = []; // Reset in-memory cache on error
          // Attempt to remove potentially corrupted data
          try {
              localStorage.removeItem(this.storageKey);
          } catch (removeError) {
              logger.error(`[ImageBackgroundHandler] Failed to remove corrupted cache item (key: ${this.storageKey}):`, removeError);
          }
      }
  }

  // --- End localStorage Cache Helpers ---
} // <-- Added missing closing brace for the ImageBackgroundHandler class
