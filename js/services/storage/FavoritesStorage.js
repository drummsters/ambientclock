import * as logger from '../../utils/logger.js'; // Import the logger

const FAVORITES_STORAGE_KEY = 'ambientClockV2_favorites'; // V2 specific key

/**
 * @class FavoritesStorage
 * @description Handles the low-level storage and retrieval of favorites data,
 *              currently using localStorage.
 */
export class FavoritesStorage {
    constructor() {
        logger.log('[FavoritesStorage] Initialized.'); // Keep as log
    }

    /**
     * Retrieves all favorites from storage.
     * @returns {Array<object>} Array of favorite objects.
     */
    getAll() {
        try {
            const favoritesJson = localStorage.getItem(FAVORITES_STORAGE_KEY);
            return favoritesJson ? JSON.parse(favoritesJson) : [];
        } catch (error) {
            logger.error('[FavoritesStorage] Error loading favorites:', error); // Use logger.error
            // Return empty array or re-throw, depending on desired error handling
            return [];
        }
    }

    /**
     * Saves the entire favorites array to storage.
     * @param {Array<object>} favorites - Array of favorite objects to save.
     * @returns {boolean} True if saving was successful, false otherwise.
     */
    saveAll(favorites) {
        try {
            localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favorites));
            logger.debug('[FavoritesStorage] Favorites saved.'); // Changed to debug
            return true;
        } catch (error) {
            logger.error('[FavoritesStorage] Error saving favorites:', error); // Use logger.error
            return false;
        }
    }

    /**
     * Clears all favorites from storage.
     * @returns {boolean} True if clearing was successful, false otherwise.
     */
    clearAll() {
        try {
            localStorage.removeItem(FAVORITES_STORAGE_KEY);
            logger.log('[FavoritesStorage] All favorites cleared from storage.'); // Keep as log
            return true;
        } catch (error) {
            logger.error('[FavoritesStorage] Error clearing favorites:', error); // Use logger.error
            return false;
        }
    }
}
