/**
 * @module favorites-helpers
 * @description Utility functions for the FavoritesService.
 */

import { MAX_FAVORITES } from '../favorites-service.js';
import * as logger from '../../utils/logger.js'; // Import the logger

/**
 * Normalizes a URL by removing query parameters that might change.
 * @param {string} url - The URL to normalize.
 * @returns {string} The normalized URL.
 */
export function normalizeUrl(url) {
    if (!url) return '';
    try {
        // Basic normalization: remove query string
        return url.split('?')[0] || url;
    } catch (error) {
        logger.error('[FavoritesHelpers] Error normalizing URL:', error); // Use logger.error
        return url; // Return original on error
    }
}

/**
 * Generates a unique ID (simple implementation).
 * @returns {string} A unique ID.
 */
export function generateUniqueId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
}

/**
 * Generates a thumbnail URL (basic implementation, may need provider specifics).
 * @param {string} url - The full image URL.
 * @param {string} [provider] - The image provider (e.g., 'unsplash', 'pexels').
 * @returns {string} The thumbnail URL or original URL.
 */
export function generateThumbnailUrl(url, provider) {
    // Basic placeholder - V1 had specific logic for Unsplash/Pexels query params
    // This might need enhancement if high-res images cause performance issues
    // For now, just return the original URL
    // TODO: Re-implement provider-specific thumbnail generation if needed
    return url;
}

/**
 * Validates the input data and checks if the maximum favorite limit has been reached.
 * @param {object} imageData - The image data to validate.
 * @param {Array<object>} favorites - The current list of favorites.
 * @returns {{valid: boolean, message?: string}} Validation result.
 */
export function validateAddFavoriteInput(imageData, favorites) {
    if (!imageData || !imageData.url) {
        return { valid: false, message: 'Invalid image data - missing URL.' };
    }
    if (favorites.length >= MAX_FAVORITES) {
        return { valid: false, message: `Maximum of ${MAX_FAVORITES} favorites reached.` };
    }
    return { valid: true };
}

/**
 * Checks if a normalized URL already exists in the favorites list.
 * @param {string} normalizedUrl - The normalized URL to check.
 * @param {Array<object>} favorites - The current list of favorites.
 * @returns {boolean} True if the URL is already a favorite, false otherwise.
 */
export function isDuplicateFavorite(normalizedUrl, favorites) {
    return favorites.some(fav => normalizeUrl(fav.url) === normalizedUrl);
}

/**
 * Creates a structured favorite object from image data.
 * @param {object} imageData - The source image data.
 * @returns {object} The structured favorite object.
 */
export function createFavoriteObject(imageData) {
    return {
        id: generateUniqueId(),
        url: imageData.url,
        thumbnailUrl: generateThumbnailUrl(imageData.url, imageData.provider),
        provider: imageData.provider || 'unknown',
        category: imageData.category || 'unknown', // Ensure category is saved
        photographer: imageData.photographer || 'Unknown',
        photographerUrl: imageData.photographerUrl || '#',
        addedAt: Date.now()
    };
}
