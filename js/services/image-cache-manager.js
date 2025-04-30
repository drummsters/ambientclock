import * as logger from '../utils/logger.js';
import { determineImageQueryKey } from './utils/background-helpers.js';

const CACHE_STORAGE_KEY_PREFIX = 'ambientClock_imageCache_';

/**
 * Manages an in-memory image cache with localStorage persistence.
 */
export class ImageCacheManager {
    /**
     * Creates an ImageCacheManager instance.
     * @param {object} initialConfig - The initial background configuration to determine the storage key.
     */
    constructor(initialConfig) {
        this.imageCache = []; // Holds the current batch of image data objects
        this.storageKey = this._generateStorageKey(initialConfig);
        this._loadCacheFromStorage(); // Load initial cache
        logger.debug(`[ImageCacheManager] Initialized. Storage key: ${this.storageKey}, Initial cache size: ${this.imageCache.length}`); // Reverted to logger.debug
    }

    /**
     * Updates the storage key based on new configuration and loads the corresponding cache.
     * @param {object} newConfig - The new background configuration.
     */
    updateConfig(newConfig) {
        const newStorageKey = this._generateStorageKey(newConfig);
        if (newStorageKey !== this.storageKey) {
            logger.debug(`[ImageCacheManager] Storage key changing from "${this.storageKey}" to "${newStorageKey}".`);
            this.storageKey = newStorageKey;
            this._loadCacheFromStorage(); // Load cache for the new key
        } else {
             logger.debug(`[ImageCacheManager] Storage key unchanged: "${this.storageKey}".`);
        }
    }

    /**
     * Returns the current size of the in-memory cache.
     * @returns {number}
     */
    getCacheSize() {
        return this.imageCache.length;
    }

    /**
     * Clears the in-memory cache and its corresponding localStorage entry.
     */
    clearCache() {
        logger.debug(`[ImageCacheManager] Clearing cache for key: ${this.storageKey}`);
        this.imageCache = [];
        if (this.storageKey) {
            try {
                localStorage.removeItem(this.storageKey);
            } catch (error) {
                logger.error(`[ImageCacheManager] Error removing item from localStorage (key: ${this.storageKey}):`, error);
            }
        }
    }

    /**
     * Adds a batch of images to the cache, replacing existing content, and saves to storage.
     * @param {Array<object>} imageBatch - The array of image data objects to add.
     */
    addImageBatch(imageBatch) {
        if (!Array.isArray(imageBatch)) {
            logger.error('[ImageCacheManager] addImageBatch received invalid data:', imageBatch);
            return;
        }
        // Filter out invalid images (missing or empty url)
        const validBatch = imageBatch.filter(img => img && typeof img.url === 'string' && img.url.trim() !== '');
        if (validBatch.length < imageBatch.length) {
            logger.warn(`[ImageCacheManager] Filtered out ${imageBatch.length - validBatch.length} invalid images from batch.`);
        }
        this.imageCache = [...validBatch]; // Replace existing cache
        logger.debug(`[ImageCacheManager] Added batch of ${validBatch.length} valid images.`);
        this._saveCacheToStorage();
    }

    /**
     * Selects a random image from the cache, attempting to avoid immediate repeats.
     * Removes the selected image from the cache and saves the updated cache.
     * @param {string | null} currentImageUrl - The URL of the currently displayed image to avoid repeating.
     * @returns {object | null} The selected image data object, or null if the cache is empty or selection fails.
     */
    selectRandomImage(currentImageUrl) {
        if (this.imageCache.length === 0) {
            logger.warn('[ImageCacheManager] Cannot select image: Cache is empty.');
            return null;
        }

        let selectedImageData = null;
        let attempts = 0;
        const initialCacheSize = this.imageCache.length;
        const maxAttempts = Math.min(initialCacheSize, 5); // Limit attempts

        while (attempts < maxAttempts && this.imageCache.length > 0) {
            attempts++;
            const randomIndex = Math.floor(Math.random() * this.imageCache.length);
            const potentialSelection = this.imageCache[randomIndex];

            // Accept if cache has only 1 item OR it's not a repeat of the current image
            if (initialCacheSize === 1 || potentialSelection?.url !== currentImageUrl) {
                selectedImageData = potentialSelection;
                this.imageCache.splice(randomIndex, 1); // Remove selected image
                break; // Found a suitable image
            }
        }

        // If loop finished without finding a non-repeat (and cache started > 1)
        if (!selectedImageData && this.imageCache.length > 0) {
            logger.warn(`[ImageCacheManager] Could not find non-repeating image after ${attempts} attempts, selecting randomly from remaining.`);
            const fallbackIndex = Math.floor(Math.random() * this.imageCache.length);
            selectedImageData = this.imageCache[fallbackIndex];
            this.imageCache.splice(fallbackIndex, 1); // Remove the fallback selection
        }

        if (selectedImageData) {
            this._saveCacheToStorage(); // Save updated cache
            logger.debug(`[ImageCacheManager] Selected image (URL: ${selectedImageData?.url?.substring(0, 50)}...). Cache size: ${initialCacheSize} -> ${this.imageCache.length}.`);
        } else {
             logger.error('[ImageCacheManager] Failed to select image data from cache after attempts.');
        }

        return selectedImageData;
    }


    // --- Private localStorage Helpers ---

    /**
     * Generates the localStorage key for a given configuration.
     * @param {object} config - The background configuration object.
     * @returns {string} The localStorage key.
     * @private
     */
    _generateStorageKey(config) {
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
            logger.warn('[ImageCacheManager] Cannot save cache: storageKey is not set.');
            return;
        }
        try {
            const cacheString = JSON.stringify(this.imageCache);
            localStorage.setItem(this.storageKey, cacheString);
            // Reduce log verbosity for saving
            // logger.debug(`[ImageCacheManager] Saved cache (${this.imageCache.length} items) to localStorage key: ${this.storageKey}`);
        } catch (error) {
            logger.error(`[ImageCacheManager] Error saving cache to localStorage (key: ${this.storageKey}):`, error);
            if (error.name === 'QuotaExceededError') {
                logger.warn('[ImageCacheManager] localStorage quota exceeded. Consider clearing old caches or reducing batch size.');
                localStorage.removeItem(this.storageKey);
            }
        }
    }

    /**
     * Loads the image cache from localStorage based on the current storageKey.
     * Updates this.imageCache if a valid cache is found.
     * @private
     */
    _loadCacheFromStorage() {
        if (!this.storageKey) {
            logger.warn('[ImageCacheManager] Cannot load cache: storageKey is not set.');
            this.imageCache = [];
            return;
        }
        try {
            const storedCacheString = localStorage.getItem(this.storageKey);
            if (storedCacheString) {
                const storedCache = JSON.parse(storedCacheString);
                if (Array.isArray(storedCache)) {
                    this.imageCache = storedCache;
                    logger.log(`[ImageCacheManager] Loaded cache (${this.imageCache.length} items) from localStorage key: ${this.storageKey}`);
                } else {
                    logger.warn(`[ImageCacheManager] Invalid cache data found in localStorage for key ${this.storageKey}. Discarding.`);
                    localStorage.removeItem(this.storageKey);
                    this.imageCache = [];
                }
            } else {
                logger.debug(`[ImageCacheManager] No cache found in localStorage for key: ${this.storageKey}`);
                this.imageCache = [];
            }
        } catch (error) {
            logger.error(`[ImageCacheManager] Error loading or parsing cache from localStorage (key: ${this.storageKey}):`, error);
            this.imageCache = [];
            try {
                localStorage.removeItem(this.storageKey);
            } catch (removeError) {
                logger.error(`[ImageCacheManager] Failed to remove corrupted cache item (key: ${this.storageKey}):`, removeError);
            }
        }
    }
}
