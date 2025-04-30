/**
 * @module favorites-helpers
 * @description Utility functions for the FavoritesService.
 */

import { MAX_FAVORITES } from '../favorites-service.js';
import * as logger from '../../utils/logger.js'; // Import the logger

/**
 * Normalizes a URL by removing query parameters that might change.
 * Special handling for YouTube URLs to preserve the video ID.
 * @param {string} url - The URL to normalize.
 * @returns {string} The normalized URL.
 */
export function normalizeUrl(url) {
    if (!url) return '';
    try {
        // Special handling for YouTube URLs to preserve the video ID
        if (url.includes('youtube.com/watch') || url.includes('youtu.be/')) {
            // Extract video ID from YouTube URL
            const videoIdMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/))([A-Za-z0-9_-]{11})/);
            if (videoIdMatch && videoIdMatch[1]) {
                // Return a normalized format that includes the video ID
                return `youtube:${videoIdMatch[1]}`;
            }
        }
        
        // For non-YouTube URLs, remove query string as before
        return url.split('?')[0] || url;
    } catch (error) {
        logger.error('[FavoritesHelpers] Error normalizing URL:', error);
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
 * Special handling for YouTube URLs to compare video IDs.
 * @param {string} normalizedUrl - The normalized URL to check.
 * @param {Array<object>} favorites - The current list of favorites.
 * @returns {boolean} True if the URL is already a favorite, false otherwise.
 */
export function isDuplicateFavorite(normalizedUrl, favorites) {
    // For YouTube URLs, extract the video ID and compare
    if (normalizedUrl.startsWith('youtube:')) {
        const videoId = normalizedUrl.split(':')[1];
        return favorites.some(fav => {
            // Check if this favorite has a videoId property
            if (fav.videoId) {
                return fav.videoId === videoId;
            }
            // Otherwise, normalize the URL and check if it matches
            const favNormalizedUrl = normalizeUrl(fav.url);
            return favNormalizedUrl === normalizedUrl;
        });
    }
    
    // For non-YouTube URLs, use the original logic
    return favorites.some(fav => normalizeUrl(fav.url) === normalizedUrl);
}

/**
 * Creates a structured favorite object from image data.
 * Special handling for YouTube favorites to ensure videoId is included.
 * @param {object} imageData - The source image data.
 * @returns {object} The structured favorite object.
 */
export function createFavoriteObject(imageData) {
    //alert(`createFavoriteObject called with imageData properties:\n${JSON.stringify(imageData, null, 2)}`);
    
    const favoriteObject = {
        id: generateUniqueId(),
        url: imageData.url,
        thumbnailUrl: imageData.thumbnailUrl || generateThumbnailUrl(imageData.url, imageData.provider),
        provider: imageData.provider || 'unknown',
        category: imageData.category || 'unknown', // Ensure category is saved
        photographer: imageData.photographer || 'Unknown',
        photographerUrl: imageData.photographerUrl || '#',
        youtubeQuality: imageData.youtubeQuality || null,
        addedAt: Date.now(),
        type: imageData.type || 'image' // Ensure type is saved
    };
    
    // For YouTube favorites, ensure videoId is included
    if (imageData.type === 'youtube') {
        // If videoId is provided directly, use it
        if (imageData.videoId) {
            favoriteObject.videoId = imageData.videoId;
        } else if (imageData.url) {
            // Otherwise, extract it from the URL
            const videoIdMatch = imageData.url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/))([A-Za-z0-9_-]{11})/);
            if (videoIdMatch && videoIdMatch[1]) {
                favoriteObject.videoId = videoIdMatch[1];
            }
        }
        
        // Ensure quality is saved
        favoriteObject.quality = imageData.quality || imageData.youtubeQuality || 'auto';
        
        // Log the created favorite object for debugging
        console.log(`[FavoritesHelpers] Created YouTube favorite object with videoId: ${favoriteObject.videoId}, quality: ${favoriteObject.quality}`);
    }
    
    return favoriteObject;
}
