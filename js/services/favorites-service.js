import { StateManager } from '../core/state-manager.js';
import { EventBus } from '../core/event-bus.js';
import { FavoritesStorage } from './storage/FavoritesStorage.js';
import * as logger from '../utils/logger.js';
import {
    normalizeUrl,
    validateAddFavoriteInput,
    isDuplicateFavorite,
    createFavoriteObject
} from './utils/favorites-helpers.js';

export const MAX_FAVORITES = 20;

/**
 * Manages saving, retrieving, and applying favorite backgrounds (images and YouTube videos).
 */
export class FavoritesService {
    constructor(stateManager) {
        if (!stateManager) {
            throw new Error("FavoritesService requires a StateManager instance.");
        }
        this.stateManager = stateManager;
        this.storage = new FavoritesStorage();
        logger.log('[FavoritesService] Initialized');
    }

    /**
     * Removes a favorite by its unique ID.
     * @param {string} id - The ID of the favorite to remove.
     * @returns {{success: boolean, message: string}} Result object.
     */
    removeFavoriteById(id) {
        if (!id) {
            logger.error("[FavoritesService] removeFavoriteById requires an ID.");
            return { success: false, message: 'Favorite ID is required.' };
        }
        logger.log("[FavoritesService] removeFavoriteById called for ID:", id);

        const favorites = this.getFavorites();
        const initialLength = favorites.length;

        const updatedFavorites = favorites.filter(fav => fav.id !== id);

        if (updatedFavorites.length === initialLength) {
            logger.warn("[FavoritesService] Favorite not found for ID:", id);
            return { success: false, message: 'Favorite not found.' };
        }

        const success = this.storage.saveAll(updatedFavorites);
        if (success) {
            EventBus.publish('favorites:changed', { count: updatedFavorites.length });
            logger.log("[FavoritesService] Favorite removed for ID:", id);
            // Update state if this was the current item
            const currentItemUrl = this.stateManager.getState().currentImageMetadata?.url;
            const removedFavorite = favorites.find(fav => fav.id === id);
            if (removedFavorite && removedFavorite.url === currentItemUrl) {
                this._updateCurrentFavoriteState(removedFavorite.url, false);
            }
            return { success: true, message: 'Removed from favorites.' };
        } else {
            logger.error("[FavoritesService] Failed to remove favorite for ID:", id);
            return { success: false, message: 'Failed to remove favorite.' };
        }
    }

    /**
     * Removes a favorite by its unique ID.
     * @param {string} id - The ID of the favorite to remove.
     * @returns {{success: boolean, message: string}} Result object.
     */
    removeFavoriteById(id) {
        if (!id) {
            logger.error("[FavoritesService] removeFavoriteById requires an ID.");
            return { success: false, message: 'Favorite ID is required.' };
        }
        logger.log("[FavoritesService] removeFavoriteById called for ID:", id);

        const favorites = this.getFavorites();
        const initialLength = favorites.length;

        const updatedFavorites = favorites.filter(fav => fav.id !== id);

        if (updatedFavorites.length === initialLength) {
            logger.warn("[FavoritesService] Favorite not found for ID:", id);
            return { success: false, message: 'Favorite not found.' };
        }

        const success = this.storage.saveAll(updatedFavorites);
        if (success) {
            EventBus.publish('favorites:changed', { count: updatedFavorites.length });
            logger.log("[FavoritesService] Favorite removed for ID:", id);
            // Update state if this was the current item
            const currentItemUrl = this.stateManager.getState().currentImageMetadata?.url;
            const removedFavorite = favorites.find(fav => fav.id === id);
            if (removedFavorite && removedFavorite.url === currentItemUrl) {
                this._updateCurrentFavoriteState(removedFavorite.url, false);
            }
            return { success: true, message: 'Removed from favorites.' };
        } else {
            logger.error("[FavoritesService] Failed to remove favorite for ID:", id);
            return { success: false, message: 'Failed to remove favorite.' };
        }
    }

    /**
     * Gets all saved favorites from localStorage.
     * @returns {Array<object>} Array of favorite objects.
     */
    getFavorites() {
        return this.storage.getAll();
    }

    /**
     * Saves the favorites array using the storage handler and publishes an event.
     * @param {Array<object>} favorites - Array of favorite objects to save.
     * @private
     */
    _saveFavorites(favorites) {
        const success = this.storage.saveAll(favorites);
        if (success) {
            EventBus.publish('favorites:changed', { count: favorites.length });
            logger.log('[FavoritesService] Favorites saved via storage, published favorites:changed event.');
        } else {
            logger.error('[FavoritesService] Failed to save favorites via storage.');
        }
    }

    /**
     * Adds a background (image or YouTube video) to favorites.
     * @param {object} itemData - Object containing item data (url, provider, type, etc.).
     * @returns {{success: boolean, message: string, favorite?: object}} Result object.
     */
    addFavorite(itemData) {
        logger.log("[FavoritesService] addFavorite called with data:", itemData);
        const favorites = this.getFavorites();

        // 1. Validate Input and Limits
        const validation = validateAddFavoriteInput(itemData, favorites);
        if (!validation.valid) {
            logger.error(`[FavoritesService] Add favorite failed: ${validation.message}`);
            return { success: false, message: validation.message };
        }

        // 2. Check for Duplicates
        const normalizedNewUrl = normalizeUrl(itemData.url);
        if (isDuplicateFavorite(normalizedNewUrl, favorites)) {
            logger.log("[FavoritesService] Item is already a favorite:", normalizedNewUrl);
            return { success: false, message: 'This item is already in your favorites.' };
        }

        // 3. Create Favorite Object
        const newFavorite = createFavoriteObject({...itemData});
        logger.debug("[FavoritesService] New favorite object:", newFavorite);

        // 4. Save and Update State
        const updatedFavorites = [...favorites, newFavorite];
        this._saveFavorites(updatedFavorites);
        this._updateCurrentFavoriteState(newFavorite.url, true);

        return { success: true, message: 'Added to favorites.', favorite: newFavorite };
    }

    /**
     * Removes a favorite based on its URL.
     * @param {string} itemUrl - The URL of the favorite item to remove.
     * @returns {{success: boolean, message: string}} Result object.
     */
    removeFavorite(itemUrl) {
        if (!itemUrl) {
            logger.error("[FavoritesService] removeFavorite requires an item URL.");
            return { success: false, message: 'Item URL is required.' };
        }
        logger.log("[FavoritesService] removeFavorite called for URL:", itemUrl);

        const favorites = this.getFavorites();
        const initialLength = favorites.length;
        const normalizedUrlToRemove = normalizeUrl(itemUrl);

        const updatedFavorites = favorites.filter(fav => {
            const normalizedFavUrl = normalizeUrl(fav.url);
            return normalizedFavUrl !== normalizedUrlToRemove;
        });

        if (updatedFavorites.length === initialLength) {
            logger.warn("[FavoritesService] Favorite not found for URL:", itemUrl);
            return { success: false, message: 'Favorite not found.' };
        }

        this._saveFavorites(updatedFavorites);
        logger.log("[FavoritesService] Favorite removed for URL:", itemUrl);

        // Update state if this was the current item
        this._updateCurrentFavoriteState(itemUrl, false);

        return { success: true, message: 'Removed from favorites.' };
    }

    /**
     * Clears all saved favorites.
     * @returns {{success: boolean, message: string}} Result object.
     */
    clearAllFavorites() {
        const currentItemUrl = this.stateManager.getState().currentImageMetadata?.url;
        const success = this.storage.clearAll();

        if (success) {
            logger.log('[FavoritesService] All favorites cleared via storage.');
            EventBus.publish('favorites:changed', { count: 0 });

            if (currentItemUrl) {
                this._updateCurrentFavoriteState(currentItemUrl, false);
            }
            return { success: true, message: 'All favorites cleared.' };
        } else {
            logger.error('[FavoritesService] Error clearing favorites via storage.');
            return { success: false, message: 'Error clearing favorites.' };
        }
    }

    /**
     * Checks if a given item (image or video) is a favorite.
     * @param {string} itemUrl - The URL of the item to check.
     * @returns {boolean} True if the item is in favorites, false otherwise.
     */
    isFavorite(itemUrl) {
        if (!itemUrl) return false;
        const normalizedItemUrl = normalizeUrl(itemUrl);
        const favorites = this.getFavorites();
        return favorites.some(fav => normalizeUrl(fav.url) === normalizedItemUrl);
    }

    /**
     * Gets the count of saved favorites.
     * @returns {number} The number of saved favorites.
     */
    getFavoritesCount() {
        return this.getFavorites().length;
    }

    /**
     * Gets a random favorite that is different from the current item.
     * @returns {object|null} A randomly selected favorite object, or null if no suitable favorites exist.
     */
    getRandomFavorite() {
        const favorites = this.getFavorites();
        if (favorites.length < 2) {
            logger.debug('[FavoritesService] getRandomFavorite: Not enough favorites exist (minimum 2 required).');
            return null;
        }

        const currentItemUrl = StateManager.getState().currentImageMetadata?.url;
        if (!currentItemUrl) {
            const randomIndex = Math.floor(Math.random() * favorites.length);
            return favorites[randomIndex];
        }

        const availableFavorites = favorites.filter(fav =>
            normalizeUrl(fav.url) !== normalizeUrl(currentItemUrl)
        );

        if (availableFavorites.length === 0) {
            logger.debug('[FavoritesService] getRandomFavorite: No different favorites available.');
            return null;
        }

        const randomIndex = Math.floor(Math.random() * availableFavorites.length);
        logger.debug(`[FavoritesService] getRandomFavorite: Selected index ${randomIndex} from ${availableFavorites.length} available favorites.`);
        return availableFavorites[randomIndex];
    }

    /**
     * Sets the background to a favorite item by its ID.
     * Publishes an event for the BackgroundService to handle the actual change.
     * @param {string} id - The ID of the favorite to apply.
     * @returns {Promise<{success: boolean, message: string}>} Result object.
     */
    async setBackgroundFromFavorite(id) {
        const favorites = this.getFavorites();
        const favorite = favorites.find(fav => fav.id === id);

        if (!favorite) {
            return { success: false, message: 'Favorite not found.' };
        }

        try {
            EventBus.publish('background:setFromFavorite', { ...favorite, quality: favorite.quality });
            logger.log('[FavoritesService] Published background:setFromFavorite event for ID:', id);
            return { success: true, message: 'Background change requested from favorite.' };
        } catch (error) {
            logger.error('[FavoritesService] Error requesting background change from favorite:', error);
            return { success: false, message: 'Error requesting background change.' };
        }
    }

    /**
     * Toggles the favorite status of the current background item (image or video).
     * @param {object} [customData] - Optional custom data to use instead of currentImageMetadata.
     * @returns {Promise<{success: boolean, message: string, isFavorite: boolean}>} Result object including the new favorite status.
     */
    async toggleFavorite(customData = null) {
        const state = this.stateManager.getState();
        const backgroundState = state.settings?.background || {};
        const type = backgroundState.type || 'image';
        const currentImageMetadata = state.currentImageMetadata;
        
        // Use custom data if provided, otherwise use current metadata
        const itemData = customData || currentImageMetadata;
        
        // Handle YouTube videos
        if (type === 'youtube') {
            const videoId = backgroundState.youtubeVideoId;
            if (!videoId) {
                logger.warn("[FavoritesService] No YouTube video ID to toggle favorite status.");
                return { success: false, message: 'No YouTube video to favorite.', isFavorite: false };
            }
            
            const itemUrl = `https://www.youtube.com/watch?v=${videoId}`;
            
            // Check if this specific video ID is already a favorite
            const favorites = this.getFavorites();
            const existingFavorite = favorites.find(fav => 
                fav.type === 'youtube' && fav.url.includes(videoId)
            );
            
            let result;
            if (existingFavorite) {
                // If it's already a favorite, remove it by ID
                result = this.removeFavoriteById(existingFavorite.id);
                return { ...result, isFavorite: false };
            } else {
                // Create a new favorite with the YouTube video data
                const videoTitle = currentImageMetadata?.title || ''; 
                const quality = backgroundState.youtubeQuality || 'auto';
                
                const youtubeData = {
                    url: itemUrl,
                    thumbnailUrl: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
                    provider: 'youtube',
                    category: 'youtube',
                    photographer: 'Unknown',
                    photographerUrl: '#',
                    addedAt: Date.now(),
                    title: videoTitle,
                    type: 'youtube',
                    videoId: videoId,
                    youtubeQuality: quality,
                    quality: quality
                };
                
                logger.log(`[FavoritesService] Adding YouTube favorite with quality: ${quality}`);
                result = this.addFavorite(youtubeData);
                return { ...result, isFavorite: true };
            }
        } 
        // Handle images
        else if (type === 'image') {
            if (!currentImageMetadata || !currentImageMetadata.url) {
                logger.warn("[FavoritesService] No current image metadata to toggle favorite status.");
                return { success: false, message: 'No image to favorite.', isFavorite: false };
            }
            
            const isCurrentlyFavorite = this.isFavorite(currentImageMetadata.url);
            let result;
            if (isCurrentlyFavorite) {
                result = this.removeFavorite(currentImageMetadata.url);
            } else {
                result = this.addFavorite(currentImageMetadata);
            }
            
            return { ...result, isFavorite: !isCurrentlyFavorite };
        }
        // Handle other types
        else {
            logger.warn(`[FavoritesService] Unsupported background type for favorites: ${type}`);
            return { success: false, message: 'No background to favorite.', isFavorite: false };
        }
    }

    /**
     * Updates the `isFavorite` flag in the StateManager if the given URL matches the current item.
     * @param {string} itemUrl - The URL of the item that was added/removed.
     * @param {boolean} isFavorite - The new favorite status for this item.
     * @private
     */
    _updateCurrentFavoriteState(itemUrl, isFavorite) {
        const currentState = this.stateManager.getState();
        const currentMeta = currentState.currentImageMetadata;

        if (currentMeta && normalizeUrl(currentMeta.url) === normalizeUrl(itemUrl)) {
            if (currentMeta.isFavorite !== isFavorite) {
                logger.log(`[FavoritesService] Updating current item state: isFavorite=${isFavorite} for URL: ${itemUrl}`);
                StateManager.update({
                    currentImageMetadata: {
                        ...currentMeta,
                        isFavorite: isFavorite
                    }
                });
            }
        }
    }
}
