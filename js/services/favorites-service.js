import { StateManager } from '../core/state-manager.js';
import { EventBus } from '../core/event-bus.js';
import { FavoritesStorage } from './storage/FavoritesStorage.js';
import * as logger from '../utils/logger.js'; // Import the logger
import {
    normalizeUrl,
    generateUniqueId,
    generateThumbnailUrl,
    validateAddFavoriteInput,
    isDuplicateFavorite,
    createFavoriteObject
} from './utils/favorites-helpers.js'; // Import helper functions

// Constants
export const MAX_FAVORITES = 20; // Export the constant

/**
 * @class FavoritesService
 * @description Manages saving, retrieving, and applying favorite background images for V2.
 */
export class FavoritesService {
    /**
     * Creates an instance of FavoritesService.
     * @param {StateManager} stateManager - The application's StateManager instance.
     */
    constructor(stateManager) {
        if (!stateManager) {
            throw new Error("FavoritesService requires a StateManager instance.");
        }
        this.stateManager = stateManager;
        this.storage = new FavoritesStorage(); // Instantiate storage handler
        logger.log('[FavoritesService] Initialized'); // Keep as log
    }

    // --- Core CRUD Operations ---

    /**
     * Gets all saved favorites from localStorage.
     * @returns {Array<object>} Array of favorite objects.
     */
    getFavorites() {
        // Delegate to storage class
        return this.storage.getAll();
    }

    /**
     * Saves the favorites array using the storage handler and publishes an event.
     * @param {Array<object>} favorites - Array of favorite objects to save.
     * @private
     */
    _saveFavorites(favorites) {
        // Delegate to storage class
        const success = this.storage.saveAll(favorites);
        if (success) {
            EventBus.publish('favorites:changed', { count: favorites.length }); // Publish change event
            logger.log('[FavoritesService] Favorites saved via storage, published favorites:changed event.'); // Keep as log
        } else {
            // Handle storage saving error if needed (e.g., show user message)
            logger.error('[FavoritesService] Failed to save favorites via storage.'); // Use logger.error
        }
    }

    /**
     * Adds the current background image data to favorites.
     * @param {object} imageData - Object containing image data (url, provider, etc.). Must have at least a 'url'.
     * @returns {{success: boolean, message: string, favorite?: object}} Result object.
     */
    addFavorite(imageData) {
        logger.log("[FavoritesService] addFavorite called with data:", imageData); // Keep as log
        const favorites = this.getFavorites();

        // 1. Validate Input and Limits
        const validation = validateAddFavoriteInput(imageData, favorites); // Use helper
        if (!validation.valid) {
            logger.error(`[FavoritesService] Add favorite validation failed: ${validation.message}`); // Use logger.error
            return { success: false, message: validation.message };
        }

        // 2. Check for Duplicates
        const normalizedNewUrl = normalizeUrl(imageData.url); // Use helper
        if (isDuplicateFavorite(normalizedNewUrl, favorites)) { // Use helper
            logger.log("[FavoritesService] Image is already a favorite:", normalizedNewUrl); // Keep as log
            return { success: false, message: 'This image is already in your favorites.' };
        }

        // 3. Create Favorite Object
        const newFavorite = createFavoriteObject(imageData); // Use helper
        logger.debug("[FavoritesService] New favorite object:", newFavorite); // Changed to debug

        // 4. Save and Update State
        favorites.push(newFavorite);
        this._saveFavorites(favorites);
        this._updateCurrentFavoriteState(newFavorite.url, true);

        return { success: true, message: 'Added to favorites.', favorite: newFavorite };
    }

    /**
     * Removes a favorite based on its image URL.
     * @param {string} imageUrl - The URL of the favorite image to remove.
     * @returns {{success: boolean, message: string}} Result object.
     */
    removeFavorite(imageUrl) {
        if (!imageUrl) {
            logger.error("[FavoritesService] removeFavorite requires an image URL."); // Use logger.error
            return { success: false, message: 'Image URL is required.' };
        }
        logger.log("[FavoritesService] removeFavorite called for URL:", imageUrl); // Keep as log

        const favorites = this.getFavorites();
        const initialLength = favorites.length;
        const normalizedUrlToRemove = normalizeUrl(imageUrl); // Use helper

        const updatedFavorites = favorites.filter(fav => {
            const normalizedFavUrl = normalizeUrl(fav.url); // Use helper
            return normalizedFavUrl !== normalizedUrlToRemove;
        });

        if (updatedFavorites.length === initialLength) {
            logger.warn("[FavoritesService] Favorite not found for URL:", imageUrl); // Use logger.warn
            return { success: false, message: 'Favorite not found.' };
        }

        this._saveFavorites(updatedFavorites);
        logger.log("[FavoritesService] Favorite removed for URL:", imageUrl); // Keep as log

        // Update state if this was the current image
        this._updateCurrentFavoriteState(imageUrl, false);

        return { success: true, message: 'Removed from favorites.' };
    }

    /**
     * Removes a favorite by its unique ID.
     * @param {string} id - The unique ID of the favorite to remove.
     * @returns {{success: boolean, message: string}} Result object.
     */
    removeFavoriteById(id) {
        if (!id) {
            logger.error("[FavoritesService] removeFavoriteById requires an ID."); // Use logger.error
            return { success: false, message: 'Favorite ID is required.' };
        }
        logger.log("[FavoritesService] removeFavoriteById called for ID:", id); // Keep as log

        const favorites = this.getFavorites();
        const initialLength = favorites.length;
        let removedUrl = null;

        const updatedFavorites = favorites.filter(fav => {
            if (fav.id === id) {
                removedUrl = fav.url; // Store the URL of the removed item
                return false; // Filter out
            }
            return true; // Keep
        });

        if (updatedFavorites.length === initialLength) {
            logger.warn("[FavoritesService] Favorite not found for ID:", id); // Use logger.warn
            return { success: false, message: 'Favorite not found.' };
        }

        this._saveFavorites(updatedFavorites);
        logger.log("[FavoritesService] Favorite removed for ID:", id); // Keep as log

        // Update state if the removed favorite was the current image
        if (removedUrl) {
            this._updateCurrentFavoriteState(removedUrl, false);
        }

        return { success: true, message: 'Removed from favorites.' };
    }


    /**
     * Clears all saved favorites.
     * @returns {{success: boolean, message: string}} Result object.
     */
    clearAllFavorites() {
        const currentImageUrl = this.stateManager.getState().currentImageMetadata?.url;
        // Delegate to storage class
        const success = this.storage.clearAll();

        if (success) {
            logger.log('[FavoritesService] All favorites cleared via storage.'); // Keep as log
            EventBus.publish('favorites:changed', { count: 0 }); // Publish change event

            // Update state if the current image was a favorite
            if (currentImageUrl) {
                this._updateCurrentFavoriteState(currentImageUrl, false); // Force state update
            }
            return { success: true, message: 'All favorites cleared.' };
        } else {
            logger.error('[FavoritesService] Error clearing favorites via storage.'); // Use logger.error
            return { success: false, message: 'Error clearing favorites.' };
        }
    }

    // --- Status & Toggling ---

    /**
     * Checks if the current background image (from state) is a favorite.
     * @returns {boolean} True if the current image is in favorites.
     */
    isCurrentImageFavorite() {
        const currentImageMetadata = this.stateManager.getState().currentImageMetadata;
        const currentImageUrl = currentImageMetadata?.url;

        if (!currentImageUrl) {
            // console.log("[FavoritesService] isCurrentImageFavorite: No current image URL in state.");
            return false;
        }

        const normalizedCurrentUrl = normalizeUrl(currentImageUrl); // Use helper
        // console.log("[FavoritesService] isCurrentImageFavorite: Checking normalized URL:", normalizedCurrentUrl);

        const favorites = this.getFavorites();
        const isFavorite = favorites.some(fav => normalizeUrl(fav.url) === normalizedCurrentUrl); // Use helper

        // console.log("[FavoritesService] isCurrentImageFavorite result:", isFavorite);
        return isFavorite;
    }

    /**
     * Toggles the favorite status of the current background image.
     * Adds if not favorite, removes if it is.
     * @returns {Promise<{success: boolean, message: string, isFavorite: boolean}>} Result object including the new favorite status.
     */
    async toggleCurrentImageFavorite() {
        logger.log("[FavoritesService] toggleCurrentImageFavorite called"); // Keep as log
        const currentImageMetadata = this.stateManager.getState().currentImageMetadata;

        if (!currentImageMetadata || !currentImageMetadata.url) {
            logger.error("[FavoritesService] No current image metadata to toggle favorite status."); // Use logger.error
            return { success: false, message: 'No current image to favorite.', isFavorite: false };
        }

        const isFavorite = this.isCurrentImageFavorite();
        logger.debug("[FavoritesService] Current favorite status:", isFavorite); // Changed to debug

        let result;
        if (isFavorite) {
            result = this.removeFavorite(currentImageMetadata.url);
        } else {
            result = this.addFavorite(currentImageMetadata);
        }

        logger.debug("[FavoritesService] Toggle result:", result); // Changed to debug
        return { ...result, isFavorite: !isFavorite }; // Return the new status
    }

    // --- Utility Methods ---

    /**
     * Gets the count of saved favorites.
     * @returns {number} The number of saved favorites.
     */
    getFavoritesCount() {
        return this.getFavorites().length;
    }

    /**
     * Gets a random favorite that is different from the current image.
     * @returns {object|null} A randomly selected favorite object, or null if no suitable favorites exist.
     */
    getRandomFavorite() {
        const favorites = this.getFavorites();
        if (favorites.length < 2) {
            logger.debug('[FavoritesService] getRandomFavorite: Not enough favorites exist (minimum 2 required).');
            return null;
        }

        // Get current image URL
        const currentImageUrl = StateManager.getState().currentImageMetadata?.url;
        if (!currentImageUrl) {
            // If no current image, just return a random favorite
            const randomIndex = Math.floor(Math.random() * favorites.length);
            return favorites[randomIndex];
        }

        // Filter out the current image
        const availableFavorites = favorites.filter(fav => 
            normalizeUrl(fav.url) !== normalizeUrl(currentImageUrl)
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
     * Sets the background to a favorite image by its ID.
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
            // Publish event with favorite data for BackgroundService to handle
            EventBus.publish('background:setFromFavorite', favorite);
            logger.log('[FavoritesService] Published background:setFromFavorite event for ID:', id); // Keep as log

            // We don't directly update state here; BackgroundService should do that
            // after successfully loading and setting the image.
            // However, we can optimistically update the isFavorite flag if needed,
            // but it's better handled by BackgroundService setting the full metadata.

            return { success: true, message: 'Background change requested from favorite.' };
        } catch (error) {
            logger.error('[FavoritesService] Error requesting background change from favorite:', error); // Use logger.error
            return { success: false, message: 'Error requesting background change.' };
        }
    }


    // --- Private Helper Methods ---

    /**
     * Updates the `isFavorite` flag in the StateManager if the given URL matches the current image.
     * @param {string} imageUrl - The URL of the image that was added/removed.
     * @param {boolean} isFavorite - The new favorite status for this image.
     * @private
     */
    _updateCurrentFavoriteState(imageUrl, isFavorite) {
        const currentState = this.stateManager.getState();
        const currentMeta = currentState.currentImageMetadata;

        if (currentMeta && normalizeUrl(currentMeta.url) === normalizeUrl(imageUrl)) { // Use helper
            // Only update if the status is actually different
            if (currentMeta.isFavorite !== isFavorite) {
                logger.log(`[FavoritesService] Updating current image state: isFavorite=${isFavorite} for URL: ${imageUrl}`); // Keep as log
                // Use static StateManager.update for partial state update
                StateManager.update({
                    currentImageMetadata: {
                        ...currentMeta,
                        isFavorite: isFavorite
                    }
                });
            } else {
                // console.log(`[FavoritesService] State already matches for isFavorite=${isFavorite}, no update needed.`);
            }
        } else {
             // console.log(`[FavoritesService] Image URL ${imageUrl} does not match current image ${currentMeta?.url}, state not updated.`);
        }
    }

}
